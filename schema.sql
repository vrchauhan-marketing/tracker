-- Topics Table
CREATE TABLE IF NOT EXISTS topics (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  color      TEXT NOT NULL DEFAULT '#8b5cf6',
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT (datetime('now'))
);

-- Activities Table
CREATE TABLE IF NOT EXISTS activities (
  id               TEXT PRIMARY KEY,
  created_at       DATETIME DEFAULT (datetime('now')),
  date_posted      DATE NOT NULL,
  platform         TEXT NOT NULL,
  activity_type    TEXT NOT NULL,
  subreddit        TEXT,                -- e.g. r/startups (for Reddit)
  is_promotional   INTEGER NOT NULL DEFAULT 0, -- 1 = Enacton Mentioned, 0 = No Mention
  url              TEXT NOT NULL UNIQUE,
  title            TEXT,
  topic_tags       TEXT NOT NULL,       -- JSON array string
  notes            TEXT,
  screenshot       TEXT,                -- Base64 encoded string
  logged_by        TEXT,
  scraped_upvotes  INTEGER DEFAULT 0,
  scraped_comments INTEGER DEFAULT 0,
  scraped_views    INTEGER DEFAULT 0,
  last_scraped_at  DATETIME
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Initial Settings Seed
INSERT OR IGNORE INTO settings (key, value) VALUES ('weekly_target', '10');

-- Initial Topics Seed
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
