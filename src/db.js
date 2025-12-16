export const KEY = "tyonhaku_jobs_v1";

export function loadDb() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
  catch { return {}; }
}
export function saveDb(obj) {
  localStorage.setItem(KEY, JSON.stringify(obj));
}
export function listJobs() {
  const byId = loadDb();
  const jobs = Object.values(byId);
  jobs.sort((a,b)=> (b.savedAt||"").localeCompare(a.savedAt||""));
  return { byId, jobs };
}
export function upsertMany(objOrArray) {
  const db = loadDb();
  if (Array.isArray(objOrArray)) {
    for (const j of objOrArray) if (j?.id) db[j.id] = j;
  } else {
    for (const [k,v] of Object.entries(objOrArray||{})) db[k]=v;
  }
  saveDb(db);
}
export function exportJson() {
  return localStorage.getItem(KEY) || "{}";
}
