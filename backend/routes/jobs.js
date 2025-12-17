export function registerJobRoutes(app, db) {
  app.get("/jobs", (req, res) => {
    const rows = db
      .prepare("SELECT id, title, status, is_read, url FROM jobs ORDER BY first_seen_at DESC")
      .all();
    res.json(rows);
  });

  app.post("/jobs/upsert", (req, res) => {
    const { source, source_job_key, url, title, company_name } = req.body ?? {};

    if (!source || !source_job_key || !url || !title) {
      return res.status(400).json({
        error: "Missing required fields: source, source_job_key, url, title",
      });
    }

    // company optional: luo/hae company_id jos annettu
    let company_id = null;
    if (company_name && String(company_name).trim().length > 0) {
      const upsertCompany = db.prepare(`
        INSERT INTO companies (name) VALUES (?)
        ON CONFLICT(name) DO UPDATE SET name = excluded.name
        RETURNING id
      `);
      company_id = upsertCompany.get(company_name.trim()).id;
    }

    const stmt = db.prepare(`
      INSERT INTO jobs (source, source_job_key, url, title, company_id, last_seen_at)
      VALUES (@source, @source_job_key, @url, @title, @company_id, datetime('now'))
      ON CONFLICT(source, source_job_key) DO UPDATE SET
        url = excluded.url,
        title = excluded.title,
        company_id = COALESCE(excluded.company_id, jobs.company_id),
        last_seen_at = datetime('now')
      RETURNING id, title, status, is_read, url
    `);

    const row = stmt.get({
      source,
      source_job_key,
      url,
      title,
      company_id,
    });

    res.json(row);
  });
}