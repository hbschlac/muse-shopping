-- Add age_range field to user_profiles
-- Created: 2026-02-01
-- Purpose: Support age range privacy-friendly selection instead of exact age

-- Add age_range field
ALTER TABLE user_profiles
ADD COLUMN age_range VARCHAR(20);

-- Add constraint for valid age ranges
ALTER TABLE user_profiles
ADD CONSTRAINT check_age_range_values
CHECK (age_range IN ('18-24', '25-34', '35-44', '45-54', '55-64', '65+') OR age_range IS NULL);

-- Create index for age_range queries
CREATE INDEX idx_user_profiles_age_range ON user_profiles(age_range)
WHERE age_range IS NOT NULL;

-- Comment on the field
COMMENT ON COLUMN user_profiles.age_range IS 'User age range for privacy-friendly demographic tracking';
