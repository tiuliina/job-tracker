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

export async function updateJob(id, patch) {
  // supabaseClient tms. pitäisi olla jo sulla
  const { data, error } = await supabase
    .from("jobs")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listJobs() {
  // Hae uusimmat ensin. Voit lisätä pagination myöhemmin.
  const { data: userRes } = await supabase.auth.getUser();
const user = userRes?.user;
if (!user) return { jobs: [], byId: {} };
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(500)
    .eq("user_id", user.id);

  if (error) throw error;
  const data = jobs;

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
