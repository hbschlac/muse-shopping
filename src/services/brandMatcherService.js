/**
 * Brand Matcher Service
 * Handles matching extracted brand identifiers to brands in database
 */

const pool = require('../db/pool');
const Brand = require('../models/Brand');
const logger = require('../utils/logger');

// Confidence thresholds
const CONFIDENCE_THRESHOLD_AUTO_FOLLOW = 80;
const CONFIDENCE_THRESHOLD_EXACT_MATCH = 100;
const CONFIDENCE_THRESHOLD_FUZZY_MATCH = 70;

class BrandMatcherService {
  /**
   * Match brand identifier to database brand using aliases
   * @param {string} identifier - Brand identifier (domain, name, etc.)
   * @param {string} aliasType - Type of alias (email_domain, store_name, etc.)
   * @returns {Promise<Object|null>} Matched brand with confidence score or null
   */
  static async matchByAlias(identifier, aliasType) {
    if (!identifier) return null;

    const normalizedIdentifier = identifier.toLowerCase().trim();

    try {
      const result = await pool.query(
        `SELECT
          ba.brand_id,
          ba.confidence_score,
          ba.alias_value,
          b.name as brand_name,
          b.slug,
          b.logo_url
        FROM brand_aliases ba
        JOIN brands b ON ba.brand_id = b.id
        WHERE LOWER(ba.alias_value) = $1
          AND ba.alias_type = $2
          AND ba.is_active = TRUE
          AND b.is_active = TRUE
        ORDER BY ba.confidence_score DESC
        LIMIT 1`,
        [normalizedIdentifier, aliasType]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return {
        brandId: result.rows[0].brand_id,
        brandName: result.rows[0].brand_name,
        brandSlug: result.rows[0].brand_slug,
        logoUrl: result.rows[0].logo_url,
        matchedValue: result.rows[0].alias_value,
        confidenceScore: result.rows[0].confidence_score,
        matchType: 'alias_exact',
      };
    } catch (error) {
      logger.error('Error matching brand by alias:', error);
      return null;
    }
  }

  /**
   * Match brand by domain (prioritize email domains)
   * @param {string} domain - Domain to match
   * @returns {Promise<Object|null>} Matched brand or null
   */
  static async matchByDomain(domain) {
    if (!domain) return null;

    // Try exact domain match
    let match = await this.matchByAlias(domain, 'email_domain');
    if (match) return match;

    // Try with full email format
    const emailFormats = [
      `orders@${domain}`,
      `noreply@${domain}`,
      `email@${domain}`,
    ];

    for (const email of emailFormats) {
      match = await this.matchByAlias(email, 'email_domain');
      if (match) return match;
    }

    return null;
  }

  /**
   * Match brand by name using fuzzy matching
   * @param {string} brandName - Brand name to match
   * @returns {Promise<Object|null>} Matched brand or null
   */
  static async matchByName(brandName) {
    if (!brandName) return null;

    const normalizedName = brandName.toLowerCase().trim();

    // Try exact match in aliases
    let match = await this.matchByAlias(normalizedName, 'store_name');
    if (match) return match;

    match = await this.matchByAlias(normalizedName, 'variation');
    if (match) return match;

    // Try fuzzy match in brand names
    try {
      const result = await pool.query(
        `SELECT
          id,
          name,
          slug,
          logo_url,
          similarity(LOWER(name), $1) as similarity_score
        FROM brands
        WHERE is_active = TRUE
          AND similarity(LOWER(name), $1) > 0.3
        ORDER BY similarity_score DESC
        LIMIT 1`,
        [normalizedName]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const similarityScore = Math.round(result.rows[0].similarity_score * 100);

      // Only return if confidence is above threshold
      if (similarityScore < CONFIDENCE_THRESHOLD_FUZZY_MATCH) {
        return null;
      }

      return {
        brandId: result.rows[0].id,
        brandName: result.rows[0].name,
        brandSlug: result.rows[0].slug,
        logoUrl: result.rows[0].logo_url,
        matchedValue: normalizedName,
        confidenceScore: similarityScore,
        matchType: 'fuzzy_name',
      };
    } catch (error) {
      // Fallback if pg_trgm extension is not available
      logger.warn('Fuzzy matching not available, trying exact match only');
      return this.matchByExactName(normalizedName);
    }
  }

  /**
   * Match brand by exact name (fallback when fuzzy match not available)
   * @param {string} brandName - Brand name to match
   * @returns {Promise<Object|null>} Matched brand or null
   */
  static async matchByExactName(brandName) {
    if (!brandName) return null;

    try {
      const result = await pool.query(
        `SELECT id, name, slug, logo_url
        FROM brands
        WHERE is_active = TRUE
          AND LOWER(name) = $1
        LIMIT 1`,
        [brandName.toLowerCase()]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return {
        brandId: result.rows[0].id,
        brandName: result.rows[0].name,
        brandSlug: result.rows[0].slug,
        logoUrl: result.rows[0].logo_url,
        matchedValue: brandName,
        confidenceScore: CONFIDENCE_THRESHOLD_EXACT_MATCH,
        matchType: 'exact_name',
      };
    } catch (error) {
      logger.error('Error matching brand by exact name:', error);
      return null;
    }
  }

  /**
   * Extract and match brand from email data
   * @param {Object} emailData - Parsed email data with identifiers
   * @returns {Promise<Object|null>} Best matched brand or null
   */
  static async extractBrandFromEmail(emailData) {
    const matches = [];

    // Try domain match first (highest priority)
    if (emailData.domain) {
      const domainMatch = await this.matchByDomain(emailData.domain);
      if (domainMatch) {
        matches.push({ ...domainMatch, source: 'domain' });
      }
    }

    // Try subject brands
    if (emailData.subjectBrands && emailData.subjectBrands.length > 0) {
      for (const brand of emailData.subjectBrands) {
        const subjectMatch = await this.matchByName(brand);
        if (subjectMatch) {
          matches.push({ ...subjectMatch, source: 'subject' });
        }
      }
    }

    // Try body brands
    if (emailData.bodyBrands && emailData.bodyBrands.length > 0) {
      for (const brand of emailData.bodyBrands) {
        const bodyMatch = await this.matchByName(brand);
        if (bodyMatch) {
          matches.push({ ...bodyMatch, source: 'body' });
        }
      }
    }

    // Return best match (highest confidence)
    if (matches.length === 0) {
      return null;
    }

    matches.sort((a, b) => b.confidenceScore - a.confidenceScore);
    return matches[0];
  }

  /**
   * Auto-follow matched brands for a user
   * @param {number} userId - User ID
   * @param {Array<Object>} matchedBrands - Array of matched brand objects
   * @returns {Promise<Array>} Array of followed brand IDs
   */
  static async autoFollowMatchedBrands(userId, matchedBrands) {
    if (!matchedBrands || matchedBrands.length === 0) {
      return [];
    }

    const followedBrandIds = [];

    for (const match of matchedBrands) {
      // Only auto-follow high confidence matches
      if (match.confidenceScore < CONFIDENCE_THRESHOLD_AUTO_FOLLOW) {
        logger.info(
          `Skipping auto-follow for brand ${match.brandName} (confidence: ${match.confidenceScore})`
        );
        continue;
      }

      try {
        // Check if already following
        const isFollowing = await Brand.isFollowing(userId, match.brandId);

        if (!isFollowing) {
          // Follow the brand (is_default = false, notification_enabled = false)
          await pool.query(
            `INSERT INTO user_brand_follows (user_id, brand_id, notification_enabled, is_default)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, brand_id) DO NOTHING`,
            [userId, match.brandId, false, false]
          );

          followedBrandIds.push(match.brandId);
          logger.info(
            `Auto-followed brand ${match.brandName} (ID: ${match.brandId}) for user ${userId}`
          );
        } else {
          logger.info(
            `User ${userId} already follows brand ${match.brandName} (ID: ${match.brandId})`
          );
        }
      } catch (error) {
        logger.error(
          `Error auto-following brand ${match.brandId} for user ${userId}:`,
          error
        );
      }
    }

    return followedBrandIds;
  }

  /**
   * Match multiple brand identifiers to database brands
   * @param {Array<string>} identifiers - Array of brand identifiers
   * @param {string} identifierType - Type of identifier (domain, name, etc.)
   * @returns {Promise<Array>} Array of matched brands
   */
  static async matchMultipleBrands(identifiers, identifierType = 'name') {
    if (!identifiers || identifiers.length === 0) {
      return [];
    }

    const matches = [];

    for (const identifier of identifiers) {
      let match;

      if (identifierType === 'domain') {
        match = await this.matchByDomain(identifier);
      } else {
        match = await this.matchByName(identifier);
      }

      if (match) {
        matches.push({
          ...match,
          originalIdentifier: identifier,
        });
      }
    }

    return matches;
  }

  /**
   * Get confidence threshold for auto-following
   * @returns {number} Confidence threshold
   */
  static getAutoFollowThreshold() {
    return CONFIDENCE_THRESHOLD_AUTO_FOLLOW;
  }
}

module.exports = BrandMatcherService;
