/**
 * Shopper Profile Service
 * Analyzes shopping patterns and builds user profiles
 */

const pool = require('../db/pool');
const emailParser = require('../utils/emailParser');
const logger = require('../utils/logger');

class ShopperProfileService {
  /**
   * Store extracted products in database
   * @param {number} userId - User ID
   * @param {number} scanResultId - Email scan result ID
   * @param {Array} products - Array of product objects
   * @returns {Promise<number>} Number of products stored
   */
  static async storeProducts(userId, scanResultId, products) {
    if (!products || products.length === 0) {
      return 0;
    }

    let stored = 0;

    for (const product of products) {
      try {
        await pool.query(
          `INSERT INTO order_products
            (user_id, email_scan_result_id, product_name, category, size, quantity,
             price_cents, brand_id, brand_name, order_number, order_date,
             order_total_cents, email_subject, email_sender, gmail_message_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            userId,
            scanResultId,
            product.productName,
            product.category,
            product.size,
            product.quantity || 1,
            product.priceCents,
            product.brandId,
            product.brandName,
            product.orderNumber,
            product.orderDate,
            product.orderTotalCents,
            product.emailSubject,
            product.emailSender,
            product.gmailMessageId,
          ]
        );
        stored++;
      } catch (error) {
        logger.error(`Error storing product:`, error);
        // Continue with next product
      }
    }

    logger.info(`Stored ${stored} products for user ${userId}`);
    return stored;
  }

  /**
   * Build or update shopper profile based on all products
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Updated profile
   */
  static async updateShopperProfile(userId) {
    // Get all products for user
    const result = await pool.query(
      `SELECT product_name, category, size, quantity, price_cents, order_date, order_total_cents
       FROM order_products
       WHERE user_id = $1
       ORDER BY order_date DESC`,
      [userId]
    );

    const products = result.rows.map(row => ({
      name: row.product_name,
      category: row.category,
      size: row.size,
      quantity: row.quantity,
      price: row.price_cents,
    }));

    if (products.length === 0) {
      logger.info(`No products found for user ${userId}, skipping profile update`);
      return null;
    }

    // Build profile using email parser utility
    const profile = emailParser.buildShopperProfile(products);

    // Count unique orders
    const ordersResult = await pool.query(
      `SELECT COUNT(DISTINCT order_number) as total_orders,
              SUM(order_total_cents) as total_spent
       FROM order_products
       WHERE user_id = $1 AND order_number IS NOT NULL`,
      [userId]
    );

    const totalOrders = parseInt(ordersResult.rows[0].total_orders) || 0;
    const totalSpent = parseInt(ordersResult.rows[0].total_spent) || 0;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0;

    // Store/update profile
    const profileResult = await pool.query(
      `INSERT INTO shopper_profiles
        (user_id, favorite_categories, common_sizes, price_range, total_orders_analyzed,
         total_items_purchased, total_spent_cents, average_order_value_cents,
         interests, last_analyzed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         favorite_categories = EXCLUDED.favorite_categories,
         common_sizes = EXCLUDED.common_sizes,
         price_range = EXCLUDED.price_range,
         total_orders_analyzed = EXCLUDED.total_orders_analyzed,
         total_items_purchased = EXCLUDED.total_items_purchased,
         total_spent_cents = EXCLUDED.total_spent_cents,
         average_order_value_cents = EXCLUDED.average_order_value_cents,
         interests = EXCLUDED.interests,
         last_analyzed_at = NOW(),
         updated_at = NOW()
       RETURNING *`,
      [
        userId,
        JSON.stringify(profile.categories),
        JSON.stringify(profile.commonSizes),
        JSON.stringify({
          min: profile.priceRange.min !== Infinity ? profile.priceRange.min : 0,
          max: profile.priceRange.max,
          avg: profile.priceRange.avg,
        }),
        totalOrders,
        profile.totalItems,
        Math.round(profile.totalSpent * 100), // Convert to cents
        avgOrderValue,
        JSON.stringify(profile.interests),
      ]
    );

    logger.info(
      `Updated shopper profile for user ${userId}: ${totalOrders} orders, ${profile.totalItems} items, $${profile.totalSpent.toFixed(2)} spent`
    );

    return {
      userId,
      profile: profileResult.rows[0],
      summary: {
        totalOrders,
        totalItems: profile.totalItems,
        totalSpent: profile.totalSpent,
        avgOrderValue: avgOrderValue / 100,
        topCategories: profile.interests,
        commonSizes: profile.commonSizes,
        priceRange: profile.priceRange,
      },
    };
  }

  /**
   * Get shopper profile for user
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Profile or null
   */
  static async getShopperProfile(userId) {
    const result = await pool.query(
      `SELECT * FROM shopper_profiles WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const profile = result.rows[0];

    return {
      userId: profile.user_id,
      favoriteCategories: profile.favorite_categories,
      commonSizes: profile.common_sizes,
      priceRange: profile.price_range,
      totalOrders: profile.total_orders_analyzed,
      totalItems: profile.total_items_purchased,
      totalSpent: profile.total_spent_cents / 100,
      avgOrderValue: profile.average_order_value_cents / 100,
      interests: profile.interests,
      lastAnalyzed: profile.last_analyzed_at,
    };
  }

  /**
   * Get product recommendations based on profile
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Recommendations
   */
  static async getRecommendations(userId) {
    const profile = await this.getShopperProfile(userId);

    if (!profile) {
      return {
        categories: [],
        sizes: [],
        priceRange: null,
      };
    }

    return {
      categories: profile.interests.slice(0, 3).map(i => i.category),
      sizes: profile.commonSizes,
      priceRange: profile.priceRange,
    };
  }
}

module.exports = ShopperProfileService;
