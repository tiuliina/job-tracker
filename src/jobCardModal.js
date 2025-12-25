import { JOB_FIELDS } from "./job_fields.js";
import { updateJob } from "./db.js";

// apuri: muunna ISO -> input value
function toDateInputValue(v) {
  if (!v) return "";
  // jos v on ISO tai "YYYY-MM-DD"
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
  return d.toISOString().slice(0, 10);
}
function toDatetimeLocalValue(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  // "YYYY-MM-DDTHH:MM"
  return d.toISOString().slice(0, 16);
}

function renderFieldRow(job, field) {
  const key = field.key;
  const label = field.label;
  const val = job?.[key];

  const disabledAttr = field.readonly ? "disabled" : "";
  const dataAttr = `data-field="${key}"`;

  let inputHtml = "";

  if (field.type === "select") {
    inputHtml = `
      <select ${dataAttr} ${disabledAttr}>
        ${(field.options || []).map(opt => {
          const selected = String(opt) === String(val ?? "") ? "selected" : "";
          const shown = opt === "" ? "(empty)" : opt;
          return `<option value="${escapeAttr(opt)}" ${selected}>${escapeHtml(shown)}</option>`;
        }).join("")}
      </select>
    `;
  } else if (field.type === "textarea") {
    const cls = field.large ? "propInput propTextarea large" : "propInput propTextarea";
    inputHtml = `<textarea class="${cls}" ${dataAttr} ${disabledAttr}>${escapeHtml(val ?? "")}</textarea>`;
  } else if (field.type === "date") {
    inputHtml = `<input class="propInput" type="date" ${dataAttr} ${disabledAttr} value="${escapeAttr(toDateInputValue(val))}">`;
  } else if (field.type === "datetime") {
    inputHtml = `<input class="propInput" type="datetime-local" ${dataAttr} ${disabledAttr} value="${escapeAttr(toDatetimeLocalValue(val))}">`;
  } else if (field.type === "number") {
    inputHtml = `<input class="propInput" type="number" step="any" ${dataAttr} ${disabledAttr} value="${escapeAttr(val ?? "")}">`;
  } else if (field.type === "url") {
    inputHtml = `<input class="propInput" type="url" ${dataAttr} ${disabledAttr} value="${escapeAttr(val ?? "")}">`;
  } else {
    inputHtml = `<input class="propInput" type="text" ${dataAttr} ${disabledAttr} value="${escapeAttr(val ?? "")}">`;
  }

  return `
    <div class="propRow">
      <div class="propKey">${escapeHtml(label)}</div>
      <div class="propVal">${inputHtml}</div>
    </div>
  `;
}

function readFormPatch(modalEl) {
  const patch = {};
  modalEl.querySelectorAll("[data-field]").forEach(el => {
    const key = el.dataset.field;
    let v = el.value;

    // tulkitse tyhjät nulliksi jos haluat (usein hyvä DB:lle)
    if (v === "") v = null;

    // number
    if (el.type === "number") {
      patch[key] = v === null ? null : Number(v);
      return;
    }

    // date: jätä YYYY-MM-DD (tai muuta ISOksi jos haluat)
    if (el.type === "date") {
      patch[key] = v; // esim. "2025-12-25"
      return;
    }

    // datetime-local: muunna ISOksi
    if (el.type === "datetime-local") {
      patch[key] = v ? new Date(v).toISOString() : null;
      return;
    }

    patch[key] = v;
  });

  return patch;
}

export function openModal(host, job, byIdObj) {
  if (!job) return;

  const orig = job.duplicate_of ? (byIdObj ? byIdObj[job.duplicate_of] : null) : null;
  alert("3");

  host.innerHTML = `
    <div class="modalOverlay" id="overlay">
      <div class="modal notionModal" role="dialog" aria-modal="true">
        <div class="modalHeader">
          <div class="modalTitle">${escapeHtml(job.title || "")}</div>
          <div class="modalHeaderRight">
            <button class="btn" id="saveBtn">Tallenna</button>
            <button class="closeBtn" id="close">✕</button>
          </div>
        </div>

        <div class="modalBody">
          <div class="linkrow">
            ${job.url ? `<a href="${escapeAttr(job.url)}" target="_blank" rel="noopener">Avaa Duunitori</a>` : ``}
            ${orig ? `<a href="#" id="openOrig">Avaa alkuperäinen</a>` : ``}
          </div>

          ${orig ? `<div class="badge dup">Duplikaatti → ${escapeHtml(orig.title||"")}</div>` : ``}

          <div class="props">
            ${JOB_FIELDS.map(f => renderFieldRow(job, f)).join("")}
          </div>

          <div class="saveStatus" id="saveStatus"></div>
        </div>
      </div>
    </div>
  `;
  alert("4");

  const overlay = host.querySelector("#overlay");
  alert("5");
  const close = () => (host.innerHTML = "");
  alert("6");

  host.querySelector("#close").onclick = close;
  alert("7");
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
  alert("8");

  const openOrig = host.querySelector("#openOrig");
  alert("9");
  if (openOrig) openOrig.onclick = (e) => { e.preventDefault(); openModal(host, orig, byIdObj); };
  alert("10");

  const saveStatus = host.querySelector("#saveStatus");
  alert("11");
  host.querySelector("#saveBtn").onclick = async () => {
    try {
      saveStatus.textContent = "Tallennetaan…";
      const patch = readFormPatch(host);

      // kannattaa *ei* päivittää id:tä jne (suodata jos haluat)
      // patch.id = undefined; delete patch.id;

      const updated = await updateJob(job.id, patch);

      // päivitä paikallinen job + byIdObj, jotta seuraavat avaukset näyttää uudet arvot
      Object.assign(job, updated);
      if (byIdObj) byIdObj[job.id] = job;

      saveStatus.textContent = "Tallennettu ✓";
    } catch (err) {
      console.error(err);
      saveStatus.textContent = "Tallennus epäonnistui";
    }
  };
  alert("12");
}

function escapeHtml(s){
  return (""+(s??"")).replace(/[&<>"']/g,m=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}
function escapeAttr(s){ return escapeHtml(s).replace(/`/g,""); }
