-- Migration 065: Create Referral Tracking System
-- Tracks individual referral link shares and their conversions

CREATE TABLE IF NOT EXISTS referral_shares (
  id SERIAL PRIMARY KEY,

  -- Who shared the link
  referrer_email VARCHAR(255) NOT NULL,
  referrer_signup_id INTEGER REFERENCES waitlist_signups(id) ON DELETE CASCADE,
  referrer_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  referrer_code VARCHAR(50) NOT NULL, -- The code they shared

  -- How they shared it
  share_method VARCHAR(50), -- 'native_share', 'clipboard', 'manual'
  share_platform VARCHAR(50), -- 'imessage', 'whatsapp', 'email', 'unknown'

  -- Tracking when it was shared
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- IP and device info
  share_ip_address INET,
  share_user_agent TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table to track when someone clicks on a referral link
CREATE TABLE IF NOT EXISTS referral_clicks (
  id SERIAL PRIMARY KEY,

  -- Which referral code was clicked
  referral_code VARCHAR(50) NOT NULL,

  -- Who clicked it (unknown until they sign up)
  clicked_by_email VARCHAR(255), -- Set when they sign up
  clicked_by_signup_id INTEGER REFERENCES waitlist_signups(id) ON DELETE SET NULL,

  -- Tracking
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  converted BOOLEAN DEFAULT FALSE, -- Did they actually sign up?
  converted_at TIMESTAMP WITH TIME ZONE,

  -- IP and device info
  click_ip_address INET,
  click_user_agent TEXT,

  -- UTM and referrer tracking
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  http_referrer TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_referral_shares_referrer_email ON referral_shares(referrer_email);
CREATE INDEX IF NOT EXISTS idx_referral_shares_referrer_signup_id ON referral_shares(referrer_signup_id);
CREATE INDEX IF NOT EXISTS idx_referral_shares_referrer_user_id ON referral_shares(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_shares_referrer_code ON referral_shares(referrer_code);
CREATE INDEX IF NOT EXISTS idx_referral_shares_shared_at ON referral_shares(shared_at DESC);

CREATE INDEX IF NOT EXISTS idx_referral_clicks_referral_code ON referral_clicks(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_clicked_by_email ON referral_clicks(clicked_by_email);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_clicked_by_signup_id ON referral_clicks(clicked_by_signup_id);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_converted ON referral_clicks(converted);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_clicked_at ON referral_clicks(clicked_at DESC);

-- Auto-update updated_at timestamp
DROP TRIGGER IF EXISTS update_referral_clicks_updated_at ON referral_clicks;
CREATE TRIGGER update_referral_clicks_updated_at
  BEFORE UPDATE ON referral_clicks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- View for referral analytics per user
CREATE OR REPLACE VIEW referral_analytics AS
SELECT
  ws.id as signup_id,
  ws.email,
  ws.my_referral_code as referral_code,
  ws.user_id,

  -- Share metrics
  COUNT(DISTINCT rs.id) as total_shares,
  COUNT(DISTINCT CASE WHEN rs.shared_at >= CURRENT_TIMESTAMP - INTERVAL '7 days' THEN rs.id END) as shares_last_7d,
  COUNT(DISTINCT CASE WHEN rs.shared_at >= CURRENT_TIMESTAMP - INTERVAL '30 days' THEN rs.id END) as shares_last_30d,

  -- Click metrics
  COUNT(DISTINCT rc.id) as total_clicks,
  COUNT(DISTINCT CASE WHEN rc.clicked_at >= CURRENT_TIMESTAMP - INTERVAL '7 days' THEN rc.id END) as clicks_last_7d,
  COUNT(DISTINCT CASE WHEN rc.clicked_at >= CURRENT_TIMESTAMP - INTERVAL '30 days' THEN rc.id END) as clicks_last_30d,

  -- Conversion metrics
  COUNT(DISTINCT CASE WHEN rc.converted = TRUE THEN rc.id END) as total_conversions,
  COUNT(DISTINCT CASE WHEN rc.converted = TRUE AND rc.converted_at >= CURRENT_TIMESTAMP - INTERVAL '7 days' THEN rc.id END) as conversions_last_7d,
  COUNT(DISTINCT CASE WHEN rc.converted = TRUE AND rc.converted_at >= CURRENT_TIMESTAMP - INTERVAL '30 days' THEN rc.id END) as conversions_last_30d,

  -- Conversion rate
  CASE
    WHEN COUNT(DISTINCT rc.id) > 0 THEN
      ROUND((COUNT(DISTINCT CASE WHEN rc.converted = TRUE THEN rc.id END)::NUMERIC / COUNT(DISTINCT rc.id) * 100), 2)
    ELSE 0
  END as conversion_rate_percent,

  -- Timestamps
  MAX(rs.shared_at) as last_shared_at,
  MAX(rc.clicked_at) as last_clicked_at,
  MAX(rc.converted_at) as last_conversion_at

FROM waitlist_signups ws
LEFT JOIN referral_shares rs ON ws.my_referral_code = rs.referrer_code
LEFT JOIN referral_clicks rc ON ws.my_referral_code = rc.referral_code
GROUP BY ws.id, ws.email, ws.my_referral_code, ws.user_id;

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE referral_shares TO muse_admin;
GRANT ALL PRIVILEGES ON TABLE referral_clicks TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE referral_shares_id_seq TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE referral_clicks_id_seq TO muse_admin;
GRANT SELECT ON referral_analytics TO muse_admin;

-- Comments for documentation
COMMENT ON TABLE referral_shares IS 'Tracks when users share their referral link';
COMMENT ON TABLE referral_clicks IS 'Tracks when someone clicks a referral link and whether they convert';
COMMENT ON VIEW referral_analytics IS 'Aggregated referral metrics per user showing shares, clicks, and conversion rates';
