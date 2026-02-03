-- Email Connections and Brand Matching System
-- Created: 2026-02-02
-- Purpose: Enable Gmail integration for scanning order emails and auto-following brands

-- =====================================================
-- EMAIL_CONNECTIONS TABLE
-- Stores user's email connection status and OAuth tokens
-- =====================================================
CREATE TABLE email_connections (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'gmail', 'outlook', etc.
  email_address VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL, -- Encrypted OAuth access token
  refresh_token TEXT NOT NULL, -- Encrypted OAuth refresh token
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_scanned_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Ensure one active connection per user per provider
  CONSTRAINT unique_user_provider UNIQUE (user_id, provider)
);

CREATE INDEX idx_email_connections_user_id ON email_connections(user_id);
CREATE INDEX idx_email_connections_provider ON email_connections(provider);
CREATE INDEX idx_email_connections_active ON email_connections(is_active);
CREATE INDEX idx_email_connections_token_expiry ON email_connections(token_expires_at);

-- =====================================================
-- BRAND_ALIASES TABLE
-- Maps email domains, store names, and variations to brands
-- =====================================================
CREATE TABLE brand_aliases (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  alias_type VARCHAR(50) NOT NULL, -- 'email_domain', 'store_name', 'variation'
  alias_value VARCHAR(255) NOT NULL, -- e.g., 'orders@zara.com', 'ZARA', 'Zara.com'
  confidence_score INTEGER DEFAULT 100, -- 0-100, for fuzzy matching prioritization
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Ensure unique alias values per type
  CONSTRAINT unique_alias_value_type UNIQUE (alias_value, alias_type)
);

CREATE INDEX idx_brand_aliases_brand_id ON brand_aliases(brand_id);
CREATE INDEX idx_brand_aliases_type ON brand_aliases(alias_type);
CREATE INDEX idx_brand_aliases_value ON brand_aliases(alias_value);
CREATE INDEX idx_brand_aliases_active ON brand_aliases(is_active);

-- GIN index for efficient text searching
CREATE INDEX idx_brand_aliases_value_gin ON brand_aliases USING gin(to_tsvector('english', alias_value));

-- =====================================================
-- EMAIL_SCAN_RESULTS TABLE
-- Logs what was found during email scans
-- =====================================================
CREATE TABLE email_scan_results (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_connection_id INTEGER NOT NULL REFERENCES email_connections(id) ON DELETE CASCADE,
  scan_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  emails_scanned INTEGER NOT NULL DEFAULT 0,
  brands_found JSONB DEFAULT '[]', -- Array of brand names/domains found
  brands_matched JSONB DEFAULT '[]', -- Array of {brand_id, brand_name, confidence_score}
  brands_auto_followed JSONB DEFAULT '[]', -- Array of brand_ids that were auto-followed
  errors JSONB DEFAULT '[]', -- Array of any errors encountered
  scan_duration_ms INTEGER, -- Time taken for scan
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_scan_results_user_id ON email_scan_results(user_id);
CREATE INDEX idx_email_scan_results_connection_id ON email_scan_results(email_connection_id);
CREATE INDEX idx_email_scan_results_scan_date ON email_scan_results(scan_date DESC);

-- GIN indexes for JSONB querying
CREATE INDEX idx_email_scan_results_brands_found ON email_scan_results USING gin(brands_found);
CREATE INDEX idx_email_scan_results_brands_matched ON email_scan_results USING gin(brands_matched);

-- =====================================================
-- EXTRACTED_BRANDS_QUEUE TABLE
-- Temporary storage for brands found in emails before matching
-- =====================================================
CREATE TABLE extracted_brands_queue (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scan_result_id INTEGER REFERENCES email_scan_results(id) ON DELETE CASCADE,
  brand_identifier VARCHAR(255) NOT NULL, -- Domain or name extracted from email
  extraction_source VARCHAR(50) NOT NULL, -- 'sender_domain', 'subject', 'body'
  email_subject TEXT,
  email_sender VARCHAR(255),
  email_date TIMESTAMP WITH TIME ZONE,
  matched_brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL,
  confidence_score INTEGER, -- Matching confidence 0-100
  is_processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_extracted_brands_user_id ON extracted_brands_queue(user_id);
CREATE INDEX idx_extracted_brands_processed ON extracted_brands_queue(is_processed);
CREATE INDEX idx_extracted_brands_scan_result ON extracted_brands_queue(scan_result_id);
CREATE INDEX idx_extracted_brands_identifier ON extracted_brands_queue(brand_identifier);

-- =====================================================
-- TRIGGER: Update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_connections_updated_at
  BEFORE UPDATE ON email_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_aliases_updated_at
  BEFORE UPDATE ON brand_aliases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE email_connections IS 'Stores OAuth connections to email providers for scanning order emails';
COMMENT ON TABLE brand_aliases IS 'Maps various email domains and brand name variations to canonical brands';
COMMENT ON TABLE email_scan_results IS 'Audit log of email scans with results and auto-follow actions';
COMMENT ON TABLE extracted_brands_queue IS 'Temporary queue for processing brand identifiers found in emails';

COMMENT ON COLUMN email_connections.access_token IS 'Encrypted OAuth access token - MUST be encrypted before storage';
COMMENT ON COLUMN email_connections.refresh_token IS 'Encrypted OAuth refresh token - MUST be encrypted before storage';
COMMENT ON COLUMN brand_aliases.confidence_score IS 'Matching confidence 0-100, used for prioritizing matches';
COMMENT ON COLUMN email_scan_results.brands_matched IS 'Array of matched brands with confidence scores';
