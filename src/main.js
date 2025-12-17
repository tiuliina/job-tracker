
import { renderApp } from "./ui.js";

function ensureAppEl() {
  let el = document.getElementById("app");
  if (!el) {
    el = document.createElement("div");
    el.id = "app";
    document.body.prepend(el);
  }
  return el;
}

try {
  const root = ensureAppEl();
  root.insertAdjacentHTML("afterbegin", "<div style='padding:10px;border:1px solid #ddd'>main.js loaded ✅</div>");
  renderApp(root);
} catch (e) {
  alert("CRASH: " + (e?.stack || e));
  throw e;
}

async function loadJobs() {
  const res = await fetch("http://localhost:3000/jobs");
  const jobs = await res.json();

  const el = document.getElementById("jobs");
  el.innerHTML = jobs.map(j => `
    <div style="padding:8px;border:1px solid #ddd;margin:8px 0;">
      <div><strong>${j.title}</strong> ${j.is_read ? "" : "🆕"}</div>
      <div><a href="${j.url}" target="_blank" rel="noreferrer">${j.url}</a></div>
      <div>Status: ${j.status}</div>
    </div>
  `).join("");
}

loadJobs();

async function testBackendConnection() {
  try {
    const res = await fetch("/jobs");
    const data = await res.json();
    console.log("Backend response:", data);
  } catch (err) {
    console.error("Backend connection failed:", err);
  }
}

testBackendConnection();
