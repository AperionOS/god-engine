-- Migration: Add saved_maps table for persistent world states
-- Created: 2026-02-03

-- Saved maps (full simulation states stored in R2)
CREATE TABLE IF NOT EXISTS saved_maps (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  
  -- Location info (null for procedural seeds)
  location_name TEXT,
  lat REAL,
  lng REAL,
  seed INTEGER NOT NULL,
  
  -- Simulation state snapshot
  tick INTEGER NOT NULL DEFAULT 0,
  population INTEGER NOT NULL DEFAULT 0,
  peak_population INTEGER NOT NULL DEFAULT 0,
  total_births INTEGER NOT NULL DEFAULT 0,
  total_deaths INTEGER NOT NULL DEFAULT 0,
  
  -- Storage info
  r2_key TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  thumbnail_key TEXT,
  
  -- Timestamps
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_maps_user_id ON saved_maps(user_id);
CREATE INDEX IF NOT EXISTS idx_maps_created_at ON saved_maps(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maps_name ON saved_maps(user_id, name);
