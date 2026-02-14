-- Fashion feed sources and items (RSS ingestion)

CREATE TABLE IF NOT EXISTS fashion_sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  region VARCHAR(100),
  country VARCHAR(100),
  language VARCHAR(50),
  category VARCHAR(100),
  rss_url TEXT NOT NULL,
  site_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_fetched_at TIMESTAMP WITH TIME ZONE,
  etag TEXT,
  last_modified TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fashion_sources_rss_url ON fashion_sources(rss_url);
CREATE INDEX IF NOT EXISTS idx_fashion_sources_active ON fashion_sources(is_active);

CREATE TABLE IF NOT EXISTS fashion_feed_items (
  id SERIAL PRIMARY KEY,
  source_id INTEGER NOT NULL REFERENCES fashion_sources(id) ON DELETE CASCADE,
  guid TEXT NOT NULL,
  title TEXT NOT NULL,
  link TEXT,
  summary TEXT,
  author TEXT,
  image_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  categories JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_id, guid)
);

CREATE INDEX IF NOT EXISTS idx_fashion_feed_items_source ON fashion_feed_items(source_id);
CREATE INDEX IF NOT EXISTS idx_fashion_feed_items_published ON fashion_feed_items(published_at DESC);
