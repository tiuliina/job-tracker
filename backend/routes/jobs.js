export function registerJobRoutes(app, db) {

  app.get("/jobs", (req, res) => {
    const rows = db
      .prepare("SELECT id, title, status, is_read FROM jobs ORDER BY first_seen_at DESC")
      .all();

    res.json(rows);
  });

}
