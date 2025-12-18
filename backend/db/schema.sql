-- backend/db/schema.sql
-- SQLite schema for Job Tracker

PRAGMA foreign_keys = ON;

-- ========== Companies ==========
CREATE TABLE IF NOT EXISTS companies (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL COLLATE NOCASE,
  website       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(name)
);

CREATE TRIGGER IF NOT EXISTS trg_companies_updated_at
AFTER UPDATE ON companies
FOR EACH ROW
BEGIN
  UPDATE companies SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- ========== Jobs ==========
CREATE TABLE IF NOT EXISTS jobs (
  id              INTEGER PRIMARY KEY,

  -- Where it came from, e.g. "duunitori", "linkedin"
  source          TEXT NOT NULL,
  -- A stable key to dedupe (e.g. hash of canonical URL)
  source_job_key  TEXT NOT NULL,

  url             TEXT NOT NULL,
  title           TEXT NOT NULL,
  company_id      INTEGER,

  location        TEXT,
  employment_type TEXT, -- optional (full-time/part-time/contract)
  remote_type     TEXT, -- optional (remote/hybrid/onsite)

  published_at    TEXT, -- if you can parse from source
  first_seen_at   TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at    TEXT NOT NULL DEFAULT (datetime('now')),

  is_read         INTEGER NOT NULL DEFAULT 0, -- 0/1
  is_hidden       INTEGER NOT NULL DEFAULT 0, -- 0/1 (optional: hide clutter)

  status          TEXT NOT NULL DEFAULT 'new'
                  CHECK (status IN (
                    'new',
                    'interested',
                    'applied',
                    'match',
                    'interview',
                    'offer',
                    'rejected',
                    'archived'
                  )),

  notes           TEXT,

  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,

  -- The key constraint for deduplication:
  UNIQUE(source, source_job_key)
);

CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_is_read ON jobs(is_read);
CREATE INDEX IF NOT EXISTS idx_jobs_first_seen ON jobs(first_seen_at);
CREATE INDEX IF NOT EXISTS idx_jobs_last_seen ON jobs(last_seen_at);

CREATE TRIGGER IF NOT EXISTS trg_jobs_updated_at
AFTER UPDATE ON jobs
FOR EACH ROW
BEGIN
  UPDATE jobs SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- ========== Job events (history / audit log) ==========
-- Use this to store status changes, notes, "marked read", etc.
CREATE TABLE IF NOT EXISTS job_events (
  id          INTEGER PRIMARY KEY,
  job_id      INTEGER NOT NULL,
  event_type  TEXT NOT NULL,          -- e.g. "status_change", "note", "seen"
  payload     TEXT,                   -- JSON text (optional)
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_job_events_job_id ON job_events(job_id);
CREATE INDEX IF NOT EXISTS idx_job_events_created_at ON job_events(created_at);

-- ========== Tags (optional but handy) ==========
CREATE TABLE IF NOT EXISTS tags (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL COLLATE NOCASE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(name)
);

CREATE TABLE IF NOT EXISTS job_tags (
  job_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (job_id, tag_id),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_job_tags_tag_id ON job_tags(tag_id);
