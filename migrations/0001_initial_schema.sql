-- Migration: Initial schema for God Engine simulation history
-- Created: 2026-02-03

-- Simulation runs (one per seed + session)
CREATE TABLE IF NOT EXISTS simulation_runs (
  id TEXT PRIMARY KEY,
  seed INTEGER NOT NULL,
  start_tick INTEGER NOT NULL DEFAULT 0,
  end_tick INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_runs_seed ON simulation_runs(seed);

-- Detailed history events
CREATE TABLE IF NOT EXISTS history_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL REFERENCES simulation_runs(id) ON DELETE CASCADE,
  tick INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  x INTEGER,
  y INTEGER,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_events_run_id ON history_events(run_id);
CREATE INDEX IF NOT EXISTS idx_events_tick ON history_events(run_id, tick);

-- Summary statistics per run
CREATE TABLE IF NOT EXISTS run_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL UNIQUE REFERENCES simulation_runs(id) ON DELETE CASCADE,
  peak_population INTEGER DEFAULT 0,
  total_births INTEGER DEFAULT 0,
  total_deaths INTEGER DEFAULT 0,
  extinction_tick INTEGER,
  final_tick INTEGER,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stats_run_id ON run_stats(run_id);
