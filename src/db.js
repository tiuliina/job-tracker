export const KEY = "tyonhaku_jobs_v1";

// Kun käytät yhtä porttia (backend palvelee myös frontin):
const API_BASE = ""; // sama origin
// Jos käytät eri porttia / codespacea, laita esim. "https://xxxx-3000.app.github.dev"
// const API_BASE = "https://....";

export function loadDb() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
  catch { return {}; }
}
export function saveDb(obj) {
  localStorage.setItem(KEY, JSON.stringify(obj));
}

// --- helper: muunna sun vanha job-objekti upsert payloadiksi ---
function toUpsertPayload(j) {
  // Poimi duunitorin id lopusta jos löytyy
  const idFromUrl = typeof j?.url === "string"
    ? (j.url.match(/-(\d+)\s*$/) || j.url.match(/-(\d+)\b/))?.[1]
    : null;

  return {
    source: "duunitori",
    source_job_key: idFromUrl || j?.id || j?.url, // fallback
    url: j?.url,
    title: j?.title,
    company_name: j?.company,
    location: j?.location,
    bodyText: j?.bodyText,
    descHash: j?.descHash,
    savedAt: j?.savedAt,
  };
}

// --- API: hae jobit backendistä ---
export async function listJobs() {
  const res = await fetch(`${API_BASE}/jobs`);
  if (!res.ok) throw new Error(`GET /jobs failed: ${res.status}`);
  const rows = await res.json();

  // Muunna backend-rivit vanhaan UI-muotoon
  const jobs = (rows || []).map(r => ({
    // UI usein käyttää id:tä keynä -> pidä se URL:na kuten ennen
    id: r.url,
    url: r.url,
    title: r.title,

    // jos backend ei vielä palauta näitä, jätetään tyhjäksi
    company: r.company_name ?? r.company ?? "",
    location: r.location ?? "",
    savedAt: r.savedAt ?? r.first_seen_at ?? r.created_at ?? "",

    duplicateOf: r.duplicateOf ?? null,

    // hyödyllisiä UI:lle
    status: r.status,
    is_read: !!r.is_read,

    // jos joskus tarvitset DB:n numerollista id:tä:
    dbId: r.id,
  }));

  const byId = Object.fromEntries(jobs.map(j => [j.id, j]));
  jobs.sort((a, b) => (b.savedAt || "").localeCompare(a.savedAt || ""));

  return { byId, jobs };
}

// --- API: upserttaa monta (ottaa joko arrayn tai sun vanhan {id:job} objektin) ---
export async function upsertMany(objOrArray) {
  const arr = Array.isArray(objOrArray)
    ? objOrArray
    : Object.values(objOrArray || {});

  for (const j of arr) {
    // skip jos ei url/title
    if (!j?.url || !j?.title) continue;

    const payload = toUpsertPayload(j);

    const res = await fetch(`${API_BASE}/jobs/upsert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`POST /jobs/upsert failed: ${res.status} ${text}`);
    }
  }
}

// Vanhat export/import-avut voi jäädä toistaiseksi:
export function exportJson() {
  return localStorage.getItem(KEY) || "{}";
}
