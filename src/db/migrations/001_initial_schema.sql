-- Muse Shopping Initial Database Schema
-- Created: 2026-01-31

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE
-- Authentication and basic user information
-- =====================================================
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(100) UNIQUE,
  full_name VARCHAR(255),
  profile_image_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_active ON users(is_active);

-- =====================================================
-- USER_PROFILES TABLE
-- Extended profile information and preferences
-- =====================================================
CREATE TABLE user_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  location VARCHAR(255),
  style_preferences JSONB DEFAULT '{}',
  size_preferences JSONB DEFAULT '{}',
  budget_range JSONB DEFAULT '{}',
  privacy_settings JSONB DEFAULT '{}',
  notification_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_style_preferences ON user_profiles USING GIN(style_preferences);

-- =====================================================
-- BRANDS TABLE
-- Stores and brands that users can follow
-- =====================================================
CREATE TABLE brands (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  category VARCHAR(100),
  price_tier VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_brands_slug ON brands(slug);
CREATE INDEX idx_brands_category ON brands(category);
CREATE INDEX idx_brands_active ON brands(is_active);
CREATE INDEX idx_brands_name ON brands(name);

-- =====================================================
-- USER_BRAND_FOLLOWS TABLE
-- Many-to-many relationship for brand following
-- =====================================================
CREATE TABLE user_brand_follows (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  followed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  notification_enabled BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, brand_id)
);

CREATE INDEX idx_user_brand_follows_user ON user_brand_follows(user_id);
CREATE INDEX idx_user_brand_follows_brand ON user_brand_follows(brand_id);
CREATE INDEX idx_user_brand_follows_timestamp ON user_brand_follows(followed_at);

-- =====================================================
-- USER_FASHION_PREFERENCES TABLE
-- Detailed fashion attributes for personalization
-- =====================================================
CREATE TABLE user_fashion_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preferred_colors JSONB DEFAULT '[]',
  preferred_styles JSONB DEFAULT '[]',
  preferred_categories JSONB DEFAULT '[]',
  avoided_materials JSONB DEFAULT '[]',
  fit_preferences JSONB DEFAULT '{}',
  occasions JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fashion_prefs_user ON user_fashion_preferences(user_id);
CREATE INDEX idx_fashion_prefs_styles ON user_fashion_preferences USING GIN(preferred_styles);
CREATE INDEX idx_fashion_prefs_categories ON user_fashion_preferences USING GIN(preferred_categories);

-- =====================================================
-- REFRESH_TOKENS TABLE
-- JWT refresh token management for security
-- =====================================================
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_revoked ON refresh_tokens(is_revoked);

-- =====================================================
-- AUTOMATIC TIMESTAMP UPDATES
-- Trigger function to update updated_at column
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fashion_prefs_updated_at
  BEFORE UPDATE ON user_fashion_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- Documentation for future reference
-- =====================================================
COMMENT ON TABLE users IS 'Core user authentication and account information';
COMMENT ON TABLE user_profiles IS 'Extended user profile data including preferences';
COMMENT ON TABLE brands IS 'Stores and brands available in the platform';
COMMENT ON TABLE user_brand_follows IS 'User following relationships with brands';
COMMENT ON TABLE user_fashion_preferences IS 'Detailed fashion preferences for personalization';
COMMENT ON TABLE refresh_tokens IS 'JWT refresh tokens for secure authentication';

COMMENT ON COLUMN users.is_verified IS 'Email verification status';
COMMENT ON COLUMN users.is_active IS 'Account active status (for soft delete)';
COMMENT ON COLUMN user_profiles.style_preferences IS 'JSONB storing general style preferences';
COMMENT ON COLUMN user_profiles.size_preferences IS 'JSONB storing clothing sizes per category';
COMMENT ON COLUMN user_profiles.budget_range IS 'JSONB with min/max price preferences';
COMMENT ON COLUMN brands.category IS 'Brand category: luxury, streetwear, sustainable, etc.';
COMMENT ON COLUMN brands.price_tier IS 'Price tier: budget, mid, premium, luxury';
COMMENT ON COLUMN user_fashion_preferences.preferred_colors IS 'Array of preferred color names';
COMMENT ON COLUMN user_fashion_preferences.preferred_styles IS 'Array of style tags: minimalist, contemporary, etc.';
COMMENT ON COLUMN user_fashion_preferences.preferred_categories IS 'Array of product categories';
