-- Track review helpful votes per user or IP

CREATE TABLE IF NOT EXISTS review_helpful_events (
  id SERIAL PRIMARY KEY,
  review_id INTEGER NOT NULL REFERENCES item_reviews(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ip_hash TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_review_helpful_user_unique
  ON review_helpful_events(review_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_review_helpful_ip_unique
  ON review_helpful_events(review_id, ip_hash)
  WHERE ip_hash IS NOT NULL;
