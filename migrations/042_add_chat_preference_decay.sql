-- Preference decay metadata

ALTER TABLE chat_preference_events ADD COLUMN IF NOT EXISTS weight DECIMAL(6,4) DEFAULT 1.0;
CREATE INDEX IF NOT EXISTS idx_chat_preference_events_weight ON chat_preference_events(weight);
