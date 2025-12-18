import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import { db } from "./db.js";
import { registerJobRoutes } from "./routes/jobs.js";

const app = express();

// ESM-polut
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 👉 FRONTIN HAKEMISTO (projektin juuri)
const frontendDir = path.join(__dirname, "..");

app.use(express.json());

// CORS ei ole enää pakollinen, mutta saa olla
app.use(cors({ origin: true }));

// 👉 palvele frontti
app.use(express.static(frontendDir));

// 👉 API
registerJobRoutes(app, db);

// (optional) selkeä root-vastaus
app.get("/api", (req, res) => {
  res.send("API OK");
});

app.listen(3000, () => {
  console.log("App running at http://localhost:3000");
});