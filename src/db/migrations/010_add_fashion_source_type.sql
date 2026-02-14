-- Add source_type and sitemap support for fashion sources

ALTER TABLE fashion_sources
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'rss',
  ADD COLUMN IF NOT EXISTS sitemap_url TEXT,
  ADD COLUMN IF NOT EXISTS include_patterns JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS exclude_patterns JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS fetch_titles BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_fashion_sources_type ON fashion_sources(source_type);
