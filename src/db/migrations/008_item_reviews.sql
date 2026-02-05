-- Item reviews table for PDP

CREATE TABLE IF NOT EXISTS item_reviews (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewer_name TEXT,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT NOT NULL,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published',
  source_retailer TEXT NOT NULL DEFAULT 'muse',
  source_review_id TEXT,
  source_url TEXT,
  source_product_id TEXT,
  source_created_at TIMESTAMP,
  verified_purchase BOOLEAN DEFAULT FALSE,
  raw_payload JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_item_reviews_item_id ON item_reviews(item_id);
CREATE INDEX IF NOT EXISTS idx_item_reviews_item_rating ON item_reviews(item_id, rating);
CREATE INDEX IF NOT EXISTS idx_item_reviews_source ON item_reviews(source_retailer);
CREATE UNIQUE INDEX IF NOT EXISTS idx_item_reviews_source_id ON item_reviews(source_retailer, source_review_id);
