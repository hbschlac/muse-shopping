/**
 * Product Matching Service
 * Identifies same products across different retailers for price comparison
 */

const pool = require('../db/pool');
const logger = require('../utils/logger');

class ProductMatchingService {
  /**
   * Calculate string similarity using Levenshtein distance
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  static calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;

    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1.0;

    const len1 = s1.length;
    const len2 = s2.length;

    if (len1 === 0 || len2 === 0) return 0;

    // Levenshtein distance
    const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(0));

    for (let i = 0; i <= len1; i++) matrix[0][i] = i;
    for (let j = 0; j <= len2; j++) matrix[j][0] = j;

    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + cost // substitution
        );
      }
    }

    const maxLen = Math.max(len1, len2);
    return 1 - (matrix[len2][len1] / maxLen);
  }

  /**
   * Normalize product name for matching
   * @param {string} name - Product name
   * @returns {string} Normalized name
   */
  static normalizeName(name) {
    if (!name) return '';

    return name
      .toLowerCase()
      .replace(/[™®©]/g, '') // Remove trademark symbols
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
      .trim();
  }

  /**
   * Extract key features from product name for matching
   * @param {string} name - Product name
   * @returns {Object} Extracted features
   */
  static extractFeatures(name) {
    const normalized = this.normalizeName(name);
    const words = normalized.split(' ');

    // Common size words to ignore
    const sizeWords = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'small', 'medium', 'large', 'petite'];

    // Common color words to identify
    const colorWords = ['black', 'white', 'red', 'blue', 'green', 'pink', 'yellow', 'grey', 'gray', 'navy', 'beige', 'brown'];

    const colors = words.filter(w => colorWords.includes(w));
    const sizes = words.filter(w => sizeWords.includes(w));
    const keyWords = words.filter(w => !sizeWords.includes(w) && !colorWords.includes(w) && w.length > 2);

    return {
      colors,
      sizes,
      keyWords,
      normalized
    };
  }

  /**
   * Find potential matches for a product
   * @param {number} productId - Product catalog ID
   * @param {number} minSimilarity - Minimum similarity threshold (0-1)
   * @returns {Promise<Array>} Potential matches
   */
  static async findPotentialMatches(productId, minSimilarity = 0.75) {
    try {
      // Get the source product
      const sourceResult = await pool.query(
        `SELECT
          id,
          external_product_id,
          store_id,
          brand_id,
          product_name,
          category,
          product_type,
          price_cents
        FROM product_catalog
        WHERE id = $1`,
        [productId]
      );

      if (sourceResult.rows.length === 0) {
        throw new Error(`Product ${productId} not found`);
      }

      const sourceProduct = sourceResult.rows[0];
      const sourceFeatures = this.extractFeatures(sourceProduct.product_name);

      // Find candidates from other stores with same brand and category
      const candidatesResult = await pool.query(
        `SELECT
          id,
          external_product_id,
          store_id,
          brand_id,
          product_name,
          category,
          product_type,
          price_cents
        FROM product_catalog
        WHERE store_id != $1
        AND brand_id = $2
        AND category = $3
        AND id != $4
        AND sync_status = 'active'
        LIMIT 100`,
        [sourceProduct.store_id, sourceProduct.brand_id, sourceProduct.category, productId]
      );

      // Calculate similarity for each candidate
      const matches = [];
      for (const candidate of candidatesResult.rows) {
        const candidateFeatures = this.extractFeatures(candidate.product_name);

        // Calculate name similarity
        const nameSimilarity = this.calculateSimilarity(
          sourceFeatures.normalized,
          candidateFeatures.normalized
        );

        // Calculate keyword overlap
        const commonKeywords = sourceFeatures.keyWords.filter(w =>
          candidateFeatures.keyWords.includes(w)
        );
        const keywordScore = commonKeywords.length / Math.max(sourceFeatures.keyWords.length, 1);

        // Combined score
        const score = (nameSimilarity * 0.7) + (keywordScore * 0.3);

        if (score >= minSimilarity) {
          matches.push({
            productId: candidate.id,
            storeName: candidate.store_id,
            productName: candidate.product_name,
            priceCents: candidate.price_cents,
            similarity: score,
            nameSimilarity,
            keywordScore,
            commonKeywords
          });
        }
      }

      // Sort by similarity
      matches.sort((a, b) => b.similarity - a.similarity);

      logger.info(`Found ${matches.length} potential matches for product ${productId}`);
      return matches;
    } catch (error) {
      logger.error('Failed to find potential matches:', error);
      throw error;
    }
  }

  /**
   * Create a match group for products
   * @param {Array<number>} productIds - Array of product catalog IDs to group
   * @param {Object} options - Match group options
   * @returns {Promise<Object>} Created match group
   */
  static async createMatchGroup(productIds, options = {}) {
    const {
      canonicalName = null,
      canonicalBrandId = null,
      category = null,
      productType = null,
      matchMethod = 'manual',
      confidenceScore = 1.0
    } = options;

    try {
      // Get products to determine canonical values if not provided
      const productsResult = await pool.query(
        `SELECT
          product_name,
          brand_id,
          category,
          product_type,
          price_cents
        FROM product_catalog
        WHERE id = ANY($1)`,
        [productIds]
      );

      const products = productsResult.rows;

      // Calculate stats
      const prices = products.map(p => p.price_cents).filter(p => p !== null);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length);

      // Use first product's values as defaults if not provided
      const firstProduct = products[0];

      // Create match group
      const result = await pool.query(
        `INSERT INTO product_match_groups (
          canonical_name,
          canonical_brand_id,
          category,
          product_type,
          match_method,
          confidence_score,
          product_count,
          min_price_cents,
          max_price_cents,
          avg_price_cents
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          canonicalName || firstProduct.product_name,
          canonicalBrandId || firstProduct.brand_id,
          category || firstProduct.category,
          productType || firstProduct.product_type,
          matchMethod,
          confidenceScore,
          productIds.length,
          minPrice,
          maxPrice,
          avgPrice
        ]
      );

      const matchGroup = result.rows[0];

      // Update products with match group ID
      await pool.query(
        `UPDATE product_catalog
        SET match_group_id = $1, match_confidence = $2
        WHERE id = ANY($3)`,
        [matchGroup.id, confidenceScore, productIds]
      );

      logger.info(`Created match group ${matchGroup.id} with ${productIds.length} products`);
      return matchGroup;
    } catch (error) {
      logger.error('Failed to create match group:', error);
      throw error;
    }
  }

  /**
   * Auto-match products using similarity algorithm
   * @param {Object} options - Matching options
   * @param {number} options.brandId - Brand ID to match
   * @param {string} options.category - Category to match
   * @param {number} options.minSimilarity - Minimum similarity threshold
   * @param {number} options.limit - Max products to process
   * @returns {Promise<Object>} Matching results
   */
  static async autoMatchProducts(options = {}) {
    const {
      brandId = null,
      category = null,
      minSimilarity = 0.80,
      limit = 100
    } = options;

    try {
      let query = `
        SELECT id
        FROM product_catalog
        WHERE match_group_id IS NULL
        AND sync_status = 'active'
      `;
      const params = [];
      let paramIndex = 1;

      if (brandId) {
        query += ` AND brand_id = $${paramIndex}`;
        params.push(brandId);
        paramIndex++;
      }

      if (category) {
        query += ` AND category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
      params.push(limit);

      const productsResult = await pool.query(query, params);
      const products = productsResult.rows;

      let groupsCreated = 0;
      let productsMatched = 0;

      for (const product of products) {
        // Skip if already matched (may have been matched in previous iteration)
        const checkResult = await pool.query(
          'SELECT match_group_id FROM product_catalog WHERE id = $1',
          [product.id]
        );

        if (checkResult.rows[0].match_group_id) continue;

        // Find matches
        const matches = await this.findPotentialMatches(product.id, minSimilarity);

        if (matches.length > 0) {
          // Filter to only unmatched products
          const unmatchedIds = [];
          for (const match of matches) {
            const checkMatch = await pool.query(
              'SELECT match_group_id FROM product_catalog WHERE id = $1',
              [match.productId]
            );
            if (!checkMatch.rows[0].match_group_id) {
              unmatchedIds.push(match.productId);
            }
          }

          if (unmatchedIds.length > 0) {
            // Create match group
            const avgConfidence = matches.reduce((sum, m) => sum + m.similarity, 0) / matches.length;
            await this.createMatchGroup(
              [product.id, ...unmatchedIds],
              {
                matchMethod: 'fuzzy',
                confidenceScore: avgConfidence
              }
            );

            groupsCreated++;
            productsMatched += (1 + unmatchedIds.length);
          }
        }
      }

      logger.info(`Auto-matching complete: ${groupsCreated} groups created, ${productsMatched} products matched`);

      return {
        groupsCreated,
        productsMatched,
        productsProcessed: products.length
      };
    } catch (error) {
      logger.error('Failed to auto-match products:', error);
      throw error;
    }
  }

  /**
   * Get products in a match group with price comparison
   * @param {number} matchGroupId - Match group ID
   * @returns {Promise<Object>} Match group with products
   */
  static async getMatchGroup(matchGroupId) {
    try {
      const groupResult = await pool.query(
        'SELECT * FROM product_match_groups WHERE id = $1',
        [matchGroupId]
      );

      if (groupResult.rows.length === 0) {
        throw new Error(`Match group ${matchGroupId} not found`);
      }

      const group = groupResult.rows[0];

      const productsResult = await pool.query(
        `SELECT
          pc.*,
          s.name as store_name,
          s.slug as store_slug,
          s.logo_url as store_logo_url,
          b.name as brand_name
        FROM product_catalog pc
        JOIN stores s ON pc.store_id = s.id
        LEFT JOIN brands b ON pc.brand_id = b.id
        WHERE pc.match_group_id = $1
        ORDER BY pc.price_cents ASC`,
        [matchGroupId]
      );

      return {
        ...group,
        products: productsResult.rows
      };
    } catch (error) {
      logger.error('Failed to get match group:', error);
      throw error;
    }
  }

  /**
   * Get match statistics
   * @returns {Promise<Object>} Matching statistics
   */
  static async getMatchStats() {
    try {
      const result = await pool.query(`
        SELECT
          COUNT(DISTINCT match_group_id) FILTER (WHERE match_group_id IS NOT NULL) as total_match_groups,
          COUNT(*) FILTER (WHERE match_group_id IS NOT NULL) as matched_products,
          COUNT(*) FILTER (WHERE match_group_id IS NULL AND sync_status = 'active') as unmatched_products,
          AVG(match_confidence) FILTER (WHERE match_group_id IS NOT NULL) as avg_confidence
        FROM product_catalog
      `);

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get match stats:', error);
      throw error;
    }
  }

  /**
   * Update match group statistics
   * @param {number} matchGroupId - Match group ID
   * @returns {Promise<Object>} Updated match group
   */
  static async updateMatchGroupStats(matchGroupId) {
    try {
      const result = await pool.query(
        `UPDATE product_match_groups
        SET
          product_count = (
            SELECT COUNT(*) FROM product_catalog WHERE match_group_id = $1
          ),
          min_price_cents = (
            SELECT MIN(price_cents) FROM product_catalog WHERE match_group_id = $1 AND price_cents IS NOT NULL
          ),
          max_price_cents = (
            SELECT MAX(price_cents) FROM product_catalog WHERE match_group_id = $1 AND price_cents IS NOT NULL
          ),
          avg_price_cents = (
            SELECT AVG(price_cents)::INTEGER FROM product_catalog WHERE match_group_id = $1 AND price_cents IS NOT NULL
          ),
          updated_at = NOW()
        WHERE id = $1
        RETURNING *`,
        [matchGroupId]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update match group stats:', error);
      throw error;
    }
  }
}

module.exports = ProductMatchingService;
