import express from "express";
import { db } from "./db.js";
import { registerJobRoutes } from "./routes/jobs.js";

const app = express();
app.use(express.json());

registerJobRoutes(app, db);

app.listen(3000, () => {
  console.log("Backend running at http://localhost:3000");
});
