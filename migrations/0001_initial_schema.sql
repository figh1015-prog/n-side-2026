-- N-Side Pro Database Schema
-- Migration: 0001_initial_schema

-- Articles table
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  keyword TEXT NOT NULL,
  platform TEXT DEFAULT '네이버 블로그',
  content TEXT,
  html_content TEXT,
  schema_json TEXT,
  word_count INTEGER DEFAULT 0,
  aeo_score INTEGER DEFAULT 0,
  readability_score REAL DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','published','scheduled','error')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  published_at DATETIME,
  updated_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_articles_keyword ON articles(keyword);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at);

-- Keywords table
CREATE TABLE IF NOT EXISTS keywords (
  id TEXT PRIMARY KEY,
  keyword TEXT NOT NULL UNIQUE,
  list_name TEXT,
  monthly_volume INTEGER,
  competition INTEGER,
  saturation_score REAL,
  difficulty TEXT,
  last_analyzed DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_keywords_list ON keywords(list_name);

-- Schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  article_id TEXT REFERENCES articles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  scheduled_at DATETIME NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','published','failed')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_schedules_scheduled_at ON schedules(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON schedules(status);

-- Rank tracking table
CREATE TABLE IF NOT EXISTS rank_tracking (
  id TEXT PRIMARY KEY,
  keyword TEXT NOT NULL,
  naver_rank INTEGER,
  google_rank INTEGER,
  checked_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rank_keyword ON rank_tracking(keyword);
CREATE INDEX IF NOT EXISTS idx_rank_checked_at ON rank_tracking(checked_at);

-- Indexing log table
CREATE TABLE IF NOT EXISTS indexing_log (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  service TEXT DEFAULT 'indexnow',
  status TEXT NOT NULL,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_indexing_submitted_at ON indexing_log(submitted_at);
