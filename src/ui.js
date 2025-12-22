import { listJobs, exportJson, upsertMany, saveCv } from "./db.js";
import { supabase } from "./supabaseClient.js";

document.body.insertAdjacentHTML("afterbegin", "<div style='padding:6px;border:1px solid #ddd'>ui.js v12</div>");

export function renderApp(root) {
  root.innerHTML = `
    <div class="topbar">
      <div class="brand">Työnhaku</div>
      <button class="navbtn" data-route="home">Etusivu</button>
      <button class="navbtn" data-route="load">Lataa työpaikkoja</button>
      <button class="navbtn" data-route="jobs">Lista työpaikoista</button>
    </div>
    <div class="container"><div id="view"></div></div>
    <div id="modalHost"></div>
  `;

  const view = root.querySelector("#view");
  const modalHost = root.querySelector("#modalHost");

  const setRoute = async (route) => {
  if (route === "home") return renderHome(view);
  if (route === "load") return renderLoad(view, setRoute);
  if (route === "jobs") return renderJobs(view, modalHost);
};

root.querySelectorAll(".navbtn[data-route]").forEach(b => {
  b.onclick = () => setRoute(b.dataset.route).catch(console.error);
});

  setRoute("home").catch(console.error);
}

async function renderHome(view) {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  let jobs = [];
  try {
    const res = await listJobs();         // res voi olla {jobs:[...]} tai pelkkä [...]
    jobs = Array.isArray(res) ? res : (res?.jobs || []);
  } catch (e) {
    console.error("listJobs failed:", e);
    jobs = [];
  }

  const saved = jobs.filter(j => j && !j.duplicateOf).length;
  const dup   = jobs.filter(j => j &&  j.duplicateOf).length;

  view.innerHTML = `
    <h2 style="margin:0 0 10px 0">Tilastot</h2>
    <div class="kpiRow">
      <div class="kpi"><div class="num">${jobs.length}</div><div class="small">Kaikki</div></div>
      <div class="kpi"><div class="num">${saved}</div><div class="small">Tallennetut</div></div>
      <div class="kpi"><div class="num">${dup}</div><div class="small">Duplikaatit</div></div>
    </div>
    <div class="small">
    ${user ? `Kirjautunut: ${escapeHtml(user.email || user.id)}` : `Et ole kirjautunut sisään → et näe pilvidataa.`}
  </div>

    <div class="hint">Vinkki: “Lista työpaikoista” → klikkaa työpaikkaa → aukeaa popup.</div>

    <button id="jt-gen-key" type="button">Luo bookmarklet-avain</button>
    <pre id="jt-key-out"></pre>
    <div>
    <textarea id="cv-field"></textarea>
    <button id="send-cv">Lähetä CV</button>
    </div>
  `;

  // ⚠️ TÄRKEÄ: kiinnitä click handler vasta innerHTML:n jälkeen
  const btn = view.querySelector("#jt-gen-key");
  if (btn) btn.onclick = () => generateBookmarkletKey(view); // tämä funktio pitää olla olemassa
  document.querySelector("#send-cv").addEventListener("click", async () => {
  const cvText = document.querySelector("#cv-field").value;
  try {
    await saveCv(cvText);
    alert("✅ CV tallennettu");
  } catch (e) {
    alert("❌ Tallennus epäonnistui: " + e.message);
  }
});
}

async function sha256Hex(str) {
  const data = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function randomToken() {
  // 32 bytes -> 64 hex chars
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  return [...a].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function generateBookmarkletKey(view) {
  const out = view.querySelector("#jt-key-out");

  try {
    out.textContent = "Luodaan avainta…";

    // 1️⃣ Varmista, että käyttäjä on oikeasti kirjautunut
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw userErr;

    const user = userRes?.user;
    if (!user) throw new Error("Et ole kirjautunut sisään.");

    // 2️⃣ Generoi selkokielinen token
    const token = randomToken();

    // 3️⃣ Hashää token tietokantaa varten
    const token_hash = await sha256Hex(token);

    // 4️⃣ INSERT Supabaseen (TÄMÄ oli se puuttuva kohta)
    const { error } = await supabase
      .from("api_keys")
      .insert([{
        user_id: user.id,   // 🔴 tämä on pakollinen RLS:lle
        token_hash
      }]);

    if (error) throw error;

    // 5️⃣ Näytä token käyttäjälle (vain kerran)
    out.textContent =
      "Tässä bookmarklet-avain (näkyy vain nyt). Kopioi talteen:\n\n" + token;

  } catch (e) {
    console.error(e);
    out.textContent = "Virhe: " + (e.message || e);
  }
}

async function renderLoad(view, setRoute) {
  view.innerHTML = `
    <h2 style="margin:0 0 10px 0">Lataa työpaikkoja</h2>
    <div class="card">
      <div class="small">Liitä tähän exportattu JSON (tai koko localStorage-objekti) ja paina Import.</div>
      <textarea id="importArea" placeholder='{"id": {...}} tai [{"id":"..."}]'></textarea>
      <div style="display:flex; gap:10px; margin-top:10px; flex-wrap:wrap;">
        <button id="importBtn">Import</button>
        <button id="exportBtn">Export (kopioi)</button>
      </div>
      <div class="small" id="msg" style="margin-top:8px;"></div>
    </div>
  `;

  const area = view.querySelector("#importArea");
  const msg = view.querySelector("#msg");

  view.querySelector("#exportBtn").onclick = async () => {
    const txt = exportJson();
    area.value = txt;
    msg.textContent = `Export valmis (${txt.length} merkkiä).`;
    try { await navigator.clipboard.writeText(txt); msg.textContent += " Kopioitu leikepöydälle."; } catch {}
  };

  view.querySelector("#importBtn").onclick = async () => {
  try {
    const parsed = JSON.parse(area.value || "");
    await upsertMany(parsed);
    msg.textContent = "Import OK.";
    await setRoute("home");
  } catch (e) {
    msg.textContent = "Import epäonnistui: " + (e?.message || e);
  }
};
}

async function renderJobs(view, modalHost) {
  let byId = {}, jobs = [];
  try {
    const res = await listJobs();
    byId = res?.byId || {};
    jobs = res?.jobs || [];
  } catch (e) {
    view.innerHTML = `<pre style="white-space:pre-wrap">
listJobs() kaatui:
${e?.message || e}
${e?.stack || ""}
</pre>`;
    return;
  }

  view.innerHTML = `
    <h2 style="margin:0 0 10px 0">Lista työpaikoista</h2>
    <div class="grid" id="list"></div>
  `;

  const list = view.querySelector("#list");
  list.innerHTML = jobs.map(j => {
    const badge = j.duplicateOf ? `<span class="badge dup">DUP</span>`
                : `<span class="badge saved">TALLENNETTU</span>`;
    return `
      <div class="card" data-id="${escapeAttr(j.id)}">
        <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start;">
          <div>
            <div style="font-weight:800">${escapeHtml(j.title||"(ei otsikkoa)")}</div>
            <div class="meta">${escapeHtml(j.company||"")}, 
            hakuaika: ${escapeHtml(j.published||"")}-${escapeHtml(j.deadline||"")},
            status: ${escapeHtml(j.status||"")}
            </div>
          </div>
          ${badge}
        </div>
      </div>
    `;
  }).join("") || `<div class="hint">Ei työpaikkoja.</div>`;

  list.querySelectorAll("[data-id]").forEach(el => {
    el.onclick = () => openModal(modalHost, byId[el.dataset.id], byId);
  });
}

function openModal(host, job, byIdObj) {
  if (!job) return;
  const orig = job.duplicateOf ? byIdObj[job.duplicateOf] : null;

  host.innerHTML = `
    <div class="modalOverlay" id="overlay">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modalHeader">
          <div class="modalTitle">${escapeHtml(job.title || "")}</div>
          <button class="closeBtn" id="close">✕</button>
        </div>
        <div class="modalBody">
          <div class="meta">${escapeHtml(job.company||"")}${job.location?` – ${escapeHtml(job.location)}`:""}</div>
          <div class="linkrow">
            ${job.url ? `<a href="${escapeAttr(job.url)}" target="_blank">Avaa Duunitori</a>` : ``}
            ${job.applyUrlRaw ? `<a href="${escapeAttr(job.applyUrlRaw)}" target="_blank">Avaa hakulinkki</a>` : ``}
            ${orig ? `<a href="#" id="openOrig">Avaa alkuperäinen</a>` : ``}
          </div>
          ${orig ? `<div class="badge dup">Duplikaatti → ${escapeHtml(orig.title||"")}</div>` : ``}
          <h3>Leipäteksti</h3>
          <pre id="body"></pre>
        </div>
      </div>
    </div>
  `;

  const overlay = host.querySelector("#overlay");
  host.querySelector("#close").onclick = () => (host.innerHTML = "");
  overlay.onclick = (e) => { if (e.target === overlay) host.innerHTML = ""; };

  const pre = host.querySelector("#body");
  pre.textContent = job.bodyText || "";

  const openOrig = host.querySelector("#openOrig");
  if (openOrig) openOrig.onclick = (e) => { e.preventDefault(); openModal(host, orig, byIdObj); };
}

// helpers
function escapeHtml(s){return (""+(s??"")).replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));}
function escapeAttr(s){return escapeHtml(s).replace(/`/g,"");}
