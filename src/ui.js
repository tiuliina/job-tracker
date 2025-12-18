import { listJobs, exportJson, upsertMany } from "./db.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const supabase = createClient("https://zbnpdljtffddfymhxumx.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpibnBkbGp0ZmZkZGZ5bWh4dW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMzIxNDAsImV4cCI6MjA4MTYwODE0MH0.4LThsV6kp_CI9m7zlxORFHPW5IANiPLtR1O_TkrXmdE")

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

root.querySelectorAll(".navbtn").forEach(b => {
  b.onclick = () => setRoute(b.dataset.route).catch(console.error);
});

  setRoute("home").catch(console.error);
}

async function renderHome(view) {
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

    <div class="hint">Vinkki: “Lista työpaikoista” → klikkaa työpaikkaa → aukeaa popup.</div>

    <button id="jt-gen-key" type="button">Luo bookmarklet-avain</button>
    <pre id="jt-key-out"></pre>
  `;

  // ⚠️ TÄRKEÄ: kiinnitä click handler vasta innerHTML:n jälkeen
  const btn = document.getElementById("jt-gen-key");
  if (btn) btn.onclick = generateBookmarkletKey; // tämä funktio pitää olla olemassa
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
        <button class="navbtn" id="importBtn">Import</button>
        <button class="navbtn" id="exportBtn">Export (kopioi)</button>
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
  const { byId, jobs } = await listJobs();

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
            <div class="meta">${escapeHtml(j.company||"")}${j.location?` – ${escapeHtml(j.location)}`:""}</div>
          </div>
          ${badge}
        </div>
      </div>
    `;
  }).join("") || `<div class="hint">Ei työpaikkoja. Mene “Lataa työpaikkoja”.</div>`;

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
