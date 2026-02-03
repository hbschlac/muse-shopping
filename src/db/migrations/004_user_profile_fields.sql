-- User Profile Fields Extension
-- Created: 2026-02-01
-- Purpose: Add age and location fields to user_profiles for better personalization

-- =====================================================
-- ADD AGE AND LOCATION FIELDS TO USER_PROFILES
-- Extends user_profiles with demographic information
-- =====================================================

-- Add age field with constraint for reasonable ages (13-120)
ALTER TABLE user_profiles
ADD COLUMN age INTEGER,
ADD CONSTRAINT check_age_range CHECK (age >= 13 AND age <= 120);

-- Add location fields for granular location tracking
ALTER TABLE user_profiles
ADD COLUMN location_city VARCHAR(100),
ADD COLUMN location_state VARCHAR(50),
ADD COLUMN location_country VARCHAR(50);

-- =====================================================
-- INDEXES FOR LOCATION-BASED QUERIES
-- Support efficient filtering by location
-- =====================================================

-- Index for city-based queries
CREATE INDEX idx_user_profiles_location_city ON user_profiles(location_city)
WHERE location_city IS NOT NULL;

-- Index for state-based queries
CREATE INDEX idx_user_profiles_location_state ON user_profiles(location_state)
WHERE location_state IS NOT NULL;

-- Index for country-based queries
CREATE INDEX idx_user_profiles_location_country ON user_profiles(location_country)
WHERE location_country IS NOT NULL;

-- Composite index for full location queries
CREATE INDEX idx_user_profiles_full_location ON user_profiles(location_country, location_state, location_city)
WHERE location_country IS NOT NULL;

-- Index for age-based queries (useful for demographics and recommendations)
CREATE INDEX idx_user_profiles_age ON user_profiles(age)
WHERE age IS NOT NULL;

-- =====================================================
-- COMMENTS
-- Documentation for the new fields
-- =====================================================

COMMENT ON COLUMN user_profiles.age IS 'User age - constrained between 13-120 years for data quality';
COMMENT ON COLUMN user_profiles.location_city IS 'User city for location-based features and recommendations';
COMMENT ON COLUMN user_profiles.location_state IS 'User state/province for regional preferences';
COMMENT ON COLUMN user_profiles.location_country IS 'User country for international localization';
