import express from "express";
import { createServer as createViteServer } from "vite";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("postgres_comparison.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS company_cache (
    name TEXT,
    time_range TEXT,
    data TEXT,
    updated_at INTEGER,
    PRIMARY KEY (name, time_range)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS market_forecast_cache (
    id TEXT PRIMARY KEY,
    forecast TEXT,
    updated_at INTEGER
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS strategy_duel_cache (
    id TEXT PRIMARY KEY,
    company_a TEXT,
    company_b TEXT,
    analysis TEXT,
    updated_at INTEGER
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS global_events_cache (
    id TEXT PRIMARY KEY,
    data TEXT,
    updated_at INTEGER
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS linkedin_cache (
    id TEXT PRIMARY KEY,
    data TEXT,
    updated_at INTEGER
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get("/api/companies", (req, res) => {
    const range = req.query.range || 'year';
    const rows = db.prepare("SELECT * FROM company_cache WHERE time_range = ?").all(range);
    res.json(rows.map((row: any) => ({
      name: row.name,
      data: JSON.parse(row.data),
      updatedAt: row.updated_at
    })));
  });

  app.post("/api/companies", (req, res) => {
    const { name, range, data } = req.body;
    const updatedAt = Date.now();
    
    const upsert = db.prepare(`
      INSERT INTO company_cache (name, time_range, data, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(name, time_range) DO UPDATE SET
        data = excluded.data,
        updated_at = excluded.updated_at
    `);
    
    upsert.run(name, range, JSON.stringify(data), updatedAt);
    res.json({ success: true, updatedAt });
  });

  app.get("/api/forecast", (req, res) => {
    const row = db.prepare("SELECT * FROM market_forecast_cache WHERE id = 'global'").get();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({
      forecast: row.forecast,
      updatedAt: row.updated_at
    });
  });

  app.post("/api/forecast", (req, res) => {
    const { forecast } = req.body;
    const updatedAt = Date.now();
    const upsert = db.prepare(`
      INSERT INTO market_forecast_cache (id, forecast, updated_at)
      VALUES ('global', ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        forecast = excluded.forecast,
        updated_at = excluded.updated_at
    `);
    upsert.run(forecast, updatedAt);
    res.json({ success: true, updatedAt });
  });

  app.get("/api/duel", (req, res) => {
    const { a, b } = req.query;
    if (!a || !b) return res.status(400).json({ error: "Missing companies" });
    
    // Sort to ensure consistent key regardless of order
    const [c1, c2] = [a as string, b as string].sort();
    const id = `${c1}:${c2}`;
    
    const row = db.prepare("SELECT * FROM strategy_duel_cache WHERE id = ?").get(id);
    if (!row) return res.status(404).json({ error: "Not found" });
    
    res.json({
      analysis: row.analysis,
      updatedAt: row.updated_at
    });
  });

  app.post("/api/duel", (req, res) => {
    const { a, b, analysis } = req.body;
    if (!a || !b || !analysis) return res.status(400).json({ error: "Missing data" });
    
    const [c1, c2] = [a as string, b as string].sort();
    const id = `${c1}:${c2}`;
    const updatedAt = Date.now();
    
    const upsert = db.prepare(`
      INSERT INTO strategy_duel_cache (id, company_a, company_b, analysis, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        analysis = excluded.analysis,
        updated_at = excluded.updated_at
    `);
    
    upsert.run(id, c1, c2, analysis, updatedAt);
    res.json({ success: true, updatedAt });
  });

  app.get("/api/events", (req, res) => {
    const row = db.prepare("SELECT * FROM global_events_cache WHERE id = 'all_events'").get() as any;
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({
      events: JSON.parse(row.data),
      updatedAt: row.updated_at
    });
  });

  app.post("/api/events", (req, res) => {
    const { events } = req.body;
    const updatedAt = Date.now();
    const upsert = db.prepare(`
      INSERT INTO global_events_cache (id, data, updated_at)
      VALUES ('all_events', ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        data = excluded.data,
        updated_at = excluded.updated_at
    `);
    upsert.run(JSON.stringify(events), updatedAt);
    res.json({ success: true, updatedAt });
  });

  app.get("/api/linkedin", (req, res) => {
    const row = db.prepare("SELECT * FROM linkedin_cache WHERE id = 'top_posts'").get() as any;
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({
      posts: JSON.parse(row.data),
      updatedAt: row.updated_at
    });
  });

  app.post("/api/linkedin", (req, res) => {
    const { posts } = req.body;
    const updatedAt = Date.now();
    const upsert = db.prepare(`
      INSERT INTO linkedin_cache (id, data, updated_at)
      VALUES ('top_posts', ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        data = excluded.data,
        updated_at = excluded.updated_at
    `);
    upsert.run(JSON.stringify(posts), updatedAt);
    res.json({ success: true, updatedAt });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
      root: __dirname,
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
