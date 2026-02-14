-- Migration 063: Create Waitlist System
-- Stores waitlist signups before user accounts are created
-- Tracks interest and allows for early access management

CREATE TABLE IF NOT EXISTS waitlist_signups (
  id SERIAL PRIMARY KEY,

  -- Contact information
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(50),

  -- Interest data (for personalization when they sign up)
  interest_categories JSONB DEFAULT '[]'::jsonb, -- ["dresses", "activewear", "shoes"]
  favorite_brands JSONB DEFAULT '[]'::jsonb, -- ["Nike", "Zara", "Reformation"]
  price_range_preference VARCHAR(50), -- "budget", "mid-range", "luxury", "mixed"
  referral_source VARCHAR(100), -- "word_of_mouth", "instagram", "email", etc.

  -- UTM and referral tracking
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  referral_code VARCHAR(50),

  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending', -- pending, invited, converted, unsubscribed
  priority_score INTEGER DEFAULT 0, -- Higher score = earlier access

  -- Communication tracking
  invite_sent_at TIMESTAMP WITH TIME ZONE,
  invite_accepted_at TIMESTAMP WITH TIME ZONE,
  last_email_sent_at TIMESTAMP WITH TIME ZONE,
  email_open_count INTEGER DEFAULT 0,
  email_click_count INTEGER DEFAULT 0,

  -- Conversion tracking
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Set when they sign up
  converted_at TIMESTAMP WITH TIME ZONE,

  -- Notes and tags
  notes TEXT,
  tags JSONB DEFAULT '[]'::jsonb, -- ["influencer", "early_supporter", "vip"]

  -- IP and device info for fraud prevention
  signup_ip_address INET,
  user_agent TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Unique email constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_signups_email ON waitlist_signups(email);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_waitlist_signups_status ON waitlist_signups(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_signups_priority_score ON waitlist_signups(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_waitlist_signups_created_at ON waitlist_signups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waitlist_signups_user_id ON waitlist_signups(user_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_signups_referral_code ON waitlist_signups(referral_code);

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_waitlist_signups_interest_categories ON waitlist_signups USING GIN(interest_categories);
CREATE INDEX IF NOT EXISTS idx_waitlist_signups_favorite_brands ON waitlist_signups USING GIN(favorite_brands);
CREATE INDEX IF NOT EXISTS idx_waitlist_signups_tags ON waitlist_signups USING GIN(tags);

-- Auto-update updated_at timestamp
DROP TRIGGER IF EXISTS update_waitlist_signups_updated_at ON waitlist_signups;
CREATE TRIGGER update_waitlist_signups_updated_at
  BEFORE UPDATE ON waitlist_signups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- View for easy analytics
CREATE OR REPLACE VIEW waitlist_analytics AS
SELECT
  DATE(created_at) as signup_date,
  COUNT(*) as total_signups,
  COUNT(CASE WHEN status = 'invited' THEN 1 END) as invited_count,
  COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_count,
  ROUND(
    COUNT(CASE WHEN status = 'converted' THEN 1 END)::NUMERIC /
    NULLIF(COUNT(CASE WHEN status = 'invited' THEN 1 END), 0) * 100,
    2
  ) as conversion_rate_percent,
  COUNT(CASE WHEN utm_source IS NOT NULL THEN 1 END) as tracked_source_count
FROM waitlist_signups
GROUP BY DATE(created_at)
ORDER BY signup_date DESC;

-- Function to calculate priority score
CREATE OR REPLACE FUNCTION calculate_waitlist_priority(
  p_email VARCHAR,
  p_referral_code VARCHAR,
  p_interest_categories JSONB,
  p_favorite_brands JSONB
) RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
BEGIN
  -- Base score for everyone
  score := 10;

  -- Bonus for providing referral code
  IF p_referral_code IS NOT NULL AND p_referral_code != '' THEN
    score := score + 20;
  END IF;

  -- Bonus for providing interests (shows engagement)
  IF jsonb_array_length(p_interest_categories) > 0 THEN
    score := score + (jsonb_array_length(p_interest_categories) * 5);
  END IF;

  -- Bonus for providing favorite brands
  IF jsonb_array_length(p_favorite_brands) > 0 THEN
    score := score + (jsonb_array_length(p_favorite_brands) * 3);
  END IF;

  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE waitlist_signups TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE waitlist_signups_id_seq TO muse_admin;
GRANT SELECT ON waitlist_analytics TO muse_admin;

-- Comments for documentation
COMMENT ON TABLE waitlist_signups IS 'Stores waitlist signups before users create full accounts, includes preference data for personalization';
COMMENT ON COLUMN waitlist_signups.interest_categories IS 'Categories the user is interested in, used to seed style profile';
COMMENT ON COLUMN waitlist_signups.favorite_brands IS 'Brand names the user loves, used to seed shopper profile';
COMMENT ON COLUMN waitlist_signups.priority_score IS 'Calculated score determining invite order, higher = earlier access';
COMMENT ON COLUMN waitlist_signups.status IS 'Lifecycle status: pending (waiting), invited (sent invite), converted (signed up), unsubscribed';
