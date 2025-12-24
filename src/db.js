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
    bodyText: j?.bodyText,
    descHash: j?.descHash,
    savedAt: j?.savedAt,
  };
}

import { supabase } from "./supabaseClient.js";

export async function saveCv(cvText) {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user) throw new Error("Not logged in");

  const { error } = await supabase
    .from("user_profiles")
    .upsert(
      {
        user_id: user.id,
        cv_text: cvText,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) throw error;
}

export async function listJobs() {
  // Hae uusimmat ensin. Voit lisätä pagination myöhemmin.
  const { data: userRes } = await supabase.auth.getUser();
const user = userRes?.user;
if (!user) return { jobs: [], byId: {} };
  const { data, error } = await supabase
    .from("jobs")
    .select("user_id,url,title,company,body_text,desc_hash,updated_at,created_at, status, published_at, deadline, level")
    .order("updated_at", { ascending: false })
    .limit(500)
    .eq("user_id", user.id);

  if (error) throw error;

  const jobs = (data || []).map(r => ({
    id: r.url,                 // appisi käyttää id:tä -> käytetään url:ia id:nä
    url: r.url,
    title: r.title,
    company: r.company,
    bodyText: r.body_text,     // muunnos appin käyttämään nimeen
    descHash: r.desc_hash,
    duplicateOf: null,
    updatedAt: r.updated_at,
    createdAt: r.created_at,
    userId: r.user_id,
    published_at: r.published_at,
    deadline: r.deadline,
    status: r.status,
    level: r.level
  }));

  const byId = Object.fromEntries(jobs.map(j => [j.id, j]));
  return { jobs, byId };
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
