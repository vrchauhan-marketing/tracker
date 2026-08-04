-- Enable WAL mode for safe concurrent reads + writes
PRAGMA journal_mode=WAL;

-- Topics table: managed from the Settings page
-- Adding/renaming topics never requires a code change
CREATE TABLE IF NOT EXISTS topics (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL UNIQUE,
  color     TEXT NOT NULL DEFAULT '#8b5cf6',  -- hex color for the pill
  is_active INTEGER NOT NULL DEFAULT 1,        -- 0 = disabled, hidden from dropdown
  created_at DATETIME DEFAULT (datetime('now'))
);

-- Activities table: one row per logged community activity
CREATE TABLE IF NOT EXISTS activities (
  id                TEXT PRIMARY KEY,
  created_at        DATETIME DEFAULT (datetime('now')),
  date_posted       DATE NOT NULL,
  platform          TEXT NOT NULL,       -- 'Reddit' | 'Quora' | 'Dev.to' | 'Medium' | 'LinkedIn' | 'Other'
  activity_type     TEXT NOT NULL,       -- 'Article' | 'Post / Thread' | 'Comment / Answer'
  url               TEXT NOT NULL UNIQUE,
  title             TEXT,
  topic_tags        TEXT NOT NULL,       -- JSON array: '["MVP Development & Rescue"]'
  notes             TEXT,
  screenshot        TEXT,                -- base64 encoded image string
  logged_by         TEXT,
  -- Auto-scraped engagement fields (populated by scraper, not the user)
  scraped_upvotes   INTEGER DEFAULT 0,
  scraped_comments  INTEGER DEFAULT 0,
  scraped_views     INTEGER DEFAULT 0,
  last_scraped_at   DATETIME
);

-- Settings table: key-value store for app-wide settings
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Seed: default settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('weekly_target', '10');

-- Seed: initial topic tags
INSERT OR IGNORE INTO topics (id, name, color) VALUES
  ('1', 'MVP Development & Rescue',  '#8b5cf6'),
  ('2', 'SaaS Development',          '#3b82f6'),
  ('3', 'AI / LLM Integration',      '#06b6d4'),
  ('4', 'React Native / Mobile',     '#10b981'),
  ('5', 'Custom Software Dev',       '#f59e0b'),
  ('6', 'Team Augmentation',         '#ec4899'),
  ('7', 'Technical Due Diligence',   '#ef4444'),
  ('8', 'Startup Advisory',          '#84cc16'),
  ('9', 'Other',                     '#6b7280');
