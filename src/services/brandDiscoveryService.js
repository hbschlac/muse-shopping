/**
 * Brand Discovery Service
 * Automatically discovers and creates new brand/store entries
 */

const pool = require('../db/pool');
const logger = require('../utils/logger');
const { ValidationError } = require('../utils/errors');

// Fashion retailers (in scope)
const FASHION_KEYWORDS = [
  'clothing', 'apparel', 'fashion', 'boutique', 'style', 'wear',
  'shoes', 'footwear', 'sneakers', 'boots',
  'jewelry', 'accessories',
  'denim', 'jeans',
  'activewear', 'athletic', 'sportswear',
  'luxury', 'designer',
];

// Out of scope (reject these)
const OUT_OF_SCOPE_KEYWORDS = [
  'furniture', 'home', 'decor', 'bedding', 'kitchen',
  'beauty', 'skincare', 'makeup', 'cosmetics', 'fragrance',
  'electronics', 'phone', 'computer', 'laptop',
  'grocery', 'food', 'restaurant',
  'pharmacy', 'drugstore', 'cvs', 'walgreens',
  'adult', 'xxx', 'porn', 'casino', 'gambling',
];

class BrandDiscoveryService {
  /**
   * Check if domain/brand is safe for work and in scope
   * @param {string} name - Brand name or domain
   * @returns {boolean} True if safe and in scope
   */
  static isSafeAndInScope(name) {
    const lowerName = name.toLowerCase();

    // Check if out of scope
    const isOutOfScope = OUT_OF_SCOPE_KEYWORDS.some(keyword =>
      lowerName.includes(keyword)
    );

    if (isOutOfScope) {
      return false;
    }

    // For explicit fashion brands, accept immediately
    const isFashion = FASHION_KEYWORDS.some(keyword =>
      lowerName.includes(keyword)
    );

    if (isFashion) {
      return true;
    }

    // For generic names, we'll accept and let admin review
    // This allows fashion brands that don't have fashion keywords in name
    return true;
  }

  /**
   * Auto-discover and create brand from domain
   * @param {string} domain - Domain name (e.g., "nordstrom.com")
   * @param {string} source - Source of discovery ('email_scan', 'user_search', 'manual')
   * @returns {Promise<Object|null>} Created brand or null if rejected
   */
  static async discoverBrandFromDomain(domain, source = 'email_scan') {
    if (!domain) {
      throw new ValidationError('Domain is required');
    }

    // Clean domain
    const cleanedDomain = domain.toLowerCase().trim()
      .replace(/^(www\.|shop\.|store\.)/, '') // Remove common prefixes
      .replace(/\.com$|\.net$|\.org$/, ''); // Remove TLD for name

    // Safety check
    if (!this.isSafeAndInScope(cleanedDomain)) {
      logger.info(`Rejected out-of-scope domain: ${domain}`);
      return null;
    }

    // Check if brand already exists
    const existing = await pool.query(
      `SELECT id, name FROM brands WHERE slug = $1`,
      [cleanedDomain]
    );

    if (existing.rows.length > 0) {
      logger.debug(`Brand already exists: ${cleanedDomain}`);
      return existing.rows[0];
    }

    // Create brand name from domain
    const brandName = this.formatBrandName(cleanedDomain);

    // Check if unsafe or common noise domain
    if (this.isNoiseDomain(cleanedDomain)) {
      logger.debug(`Skipping noise domain: ${domain}`);
      return null;
    }

    try {
      // Create brand
      const result = await pool.query(
        `INSERT INTO brands (name, slug, website_url, category, is_active, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, slug, website_url`,
        [
          brandName,
          cleanedDomain,
          `https://${domain}`,
          'fashion', // Default category
          true,
          JSON.stringify({
            auto_discovered: true,
            discovery_source: source,
            discovered_at: new Date().toISOString(),
            needs_review: true, // Flag for admin review
          }),
        ]
      );

      const brand = result.rows[0];

      // Create alias for the domain
      await pool.query(
        `INSERT INTO brand_aliases (brand_id, alias_type, alias_value, confidence_score)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (alias_value, alias_type) DO NOTHING`,
        [brand.id, 'email_domain', domain, 90]
      );

      logger.info(`Auto-discovered new brand: ${brandName} (${domain})`);

      return brand;
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        logger.debug(`Brand ${brandName} already exists (race condition)`);
        // Fetch and return existing
        const existing = await pool.query(
          `SELECT id, name FROM brands WHERE slug = $1`,
          [cleanedDomain]
        );
        return existing.rows[0];
      }

      logger.error(`Error auto-discovering brand:`, error);
      throw error;
    }
  }

  /**
   * Search for brand, create if not found
   * @param {string} searchTerm - User's search query
   * @returns {Promise<Array>} Array of brand matches
   */
  static async searchOrCreateBrand(searchTerm) {
    if (!searchTerm || searchTerm.length < 2) {
      throw new ValidationError('Search term must be at least 2 characters');
    }

    const cleanedTerm = searchTerm.trim().toLowerCase();

    // Safety check
    if (!this.isSafeAndInScope(cleanedTerm)) {
      logger.info(`Rejected unsafe search term: ${searchTerm}`);
      return [];
    }

    // Search existing brands
    const result = await pool.query(
      `SELECT id, name, slug, logo_url, category, website_url
       FROM brands
       WHERE name ILIKE $1 OR slug ILIKE $1
       ORDER BY
         CASE
           WHEN LOWER(name) = $2 THEN 1
           WHEN LOWER(slug) = $2 THEN 2
           WHEN name ILIKE $3 THEN 3
           ELSE 4
         END,
         name
       LIMIT 10`,
      [`%${cleanedTerm}%`, cleanedTerm, `${cleanedTerm}%`]
    );

    // If exact match found, return it
    if (result.rows.length > 0 && result.rows[0].name.toLowerCase() === cleanedTerm) {
      return result.rows;
    }

    // If partial matches found, return them
    if (result.rows.length > 0) {
      return result.rows;
    }

    // No matches found - auto-create if it looks like a brand name
    logger.info(`No brands found for "${searchTerm}", auto-creating...`);

    const newBrand = await this.createBrandFromSearchTerm(searchTerm);

    if (newBrand) {
      return [newBrand];
    }

    return [];
  }

  /**
   * Create brand from user search term
   * @param {string} searchTerm - User's search term
   * @returns {Promise<Object|null>} Created brand or null
   */
  static async createBrandFromSearchTerm(searchTerm) {
    const brandName = this.formatBrandName(searchTerm);
    const slug = this.createSlug(searchTerm);

    try {
      const result = await pool.query(
        `INSERT INTO brands (name, slug, category, is_active, metadata)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, slug, logo_url, category, website_url`,
        [
          brandName,
          slug,
          'fashion',
          true,
          JSON.stringify({
            auto_discovered: true,
            discovery_source: 'user_search',
            discovered_at: new Date().toISOString(),
            needs_review: true,
          }),
        ]
      );

      logger.info(`Auto-created brand from search: ${brandName}`);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        logger.debug(`Brand already exists: ${brandName}`);
        return null;
      }

      logger.error(`Error creating brand from search:`, error);
      return null;
    }
  }

  /**
   * Format brand name from domain or search term
   * @param {string} input - Domain or search term
   * @returns {string} Formatted brand name
   */
  static formatBrandName(input) {
    return input
      .split(/[-_\s]+/) // Split on hyphens, underscores, spaces
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize
      .join(' ')
      .trim();
  }

  /**
   * Create URL slug from input
   * @param {string} input - Input string
   * @returns {string} URL-safe slug
   */
  static createSlug(input) {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Remove duplicate hyphens
      .substring(0, 100); // Limit length
  }

  /**
   * Check if domain is noise (email providers, etc.)
   * @param {string} domain - Domain to check
   * @returns {boolean} True if noise domain
   */
  static isNoiseDomain(domain) {
    const noiseDomains = [
      'gmail', 'yahoo', 'outlook', 'hotmail', 'aol',
      'icloud', 'protonmail', 'mail',
      'google', 'facebook', 'twitter', 'instagram',
      'localhost', 'example', 'test',
    ];

    return noiseDomains.some(noise => domain.includes(noise));
  }

  /**
   * Get brands pending admin review
   * @returns {Promise<Array>} Brands needing review
   */
  static async getPendingReview() {
    const result = await pool.query(
      `SELECT id, name, slug, website_url, category, created_at, metadata
       FROM brands
       WHERE metadata->>'needs_review' = 'true'
       ORDER BY created_at DESC
       LIMIT 50`
    );

    return result.rows;
  }

  /**
   * Approve auto-discovered brand
   * @param {number} brandId - Brand ID
   * @returns {Promise<Object>} Updated brand
   */
  static async approveBrand(brandId) {
    const result = await pool.query(
      `UPDATE brands
       SET metadata = jsonb_set(metadata, '{needs_review}', 'false'::jsonb)
       WHERE id = $1
       RETURNING id, name, slug`,
      [brandId]
    );

    if (result.rows.length === 0) {
      throw new ValidationError('Brand not found');
    }

    logger.info(`Approved brand ${result.rows[0].name}`);
    return result.rows[0];
  }
}

module.exports = BrandDiscoveryService;
