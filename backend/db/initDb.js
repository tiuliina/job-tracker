import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const DB_PATH = path.resolve("db/jobtracker.db");
const SCHEMA_PATH = path.resolve("db/schema.sql");

export function initDb() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("foreign_keys = ON");

  const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
  db.exec(schema);

  return db;
}
