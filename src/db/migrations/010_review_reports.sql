-- Review report events

CREATE TABLE IF NOT EXISTS review_reports (
  id SERIAL PRIMARY KEY,
  review_id INTEGER NOT NULL REFERENCES item_reviews(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ip_hash TEXT,
  reason TEXT NOT NULL DEFAULT 'inappropriate',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_review_reports_review_id ON review_reports(review_id);
