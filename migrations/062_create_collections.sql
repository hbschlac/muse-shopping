-- Migration: Create Collections System
-- Description: Create tables for user collections (saved product lists)

-- User Collections Table
CREATE TABLE IF NOT EXISTS user_collections (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Collection Items Table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS collection_items (
  id SERIAL PRIMARY KEY,
  collection_id INTEGER NOT NULL REFERENCES user_collections(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  UNIQUE(collection_id, item_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_collections_user_id ON user_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_collections_created_at ON user_collections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collection_items_collection_id ON collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_item_id ON collection_items(item_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_collection_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_collections_updated_at ON user_collections;

CREATE TRIGGER update_user_collections_updated_at
  BEFORE UPDATE ON user_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_collection_updated_at();

-- Comments
COMMENT ON TABLE user_collections IS 'User-created collections of items (wishlists, shopping lists, etc.)';
COMMENT ON TABLE collection_items IS 'Items in user collections';
COMMENT ON COLUMN user_collections.is_private IS 'Whether the collection is private to the user or can be shared';
COMMENT ON COLUMN collection_items.notes IS 'Optional notes about why this item is in the collection';
