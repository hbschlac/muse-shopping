-- Add media fields to items for video/reels support

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS media_type VARCHAR(20) DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS video_poster_url TEXT,
  ADD COLUMN IF NOT EXISTS video_duration_seconds INTEGER;

-- Update module items function to include media fields
CREATE OR REPLACE FUNCTION get_module_items(p_module_id INTEGER)
RETURNS TABLE(
  item_id INTEGER,
  canonical_name VARCHAR,
  description TEXT,
  category VARCHAR,
  primary_image_url TEXT,
  media_type VARCHAR,
  video_url TEXT,
  video_poster_url TEXT,
  video_duration_seconds INTEGER,
  min_price DECIMAL,
  sale_price DECIMAL,
  is_featured BOOLEAN,
  display_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id as item_id,
    i.canonical_name,
    i.description,
    i.category,
    i.primary_image_url,
    i.media_type,
    i.video_url,
    i.video_poster_url,
    i.video_duration_seconds,
    MIN(il.price) as min_price,
    MIN(il.sale_price) as sale_price,
    fmi.is_featured,
    fmi.display_order
  FROM feed_module_items fmi
  JOIN items i ON fmi.item_id = i.id
  LEFT JOIN item_listings il ON i.id = il.item_id AND il.in_stock = TRUE
  WHERE fmi.module_id = p_module_id
    AND i.is_active = TRUE
  GROUP BY i.id, fmi.is_featured, fmi.display_order
  ORDER BY fmi.display_order ASC;
END;
$$ LANGUAGE plpgsql;
