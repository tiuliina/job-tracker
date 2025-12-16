
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
