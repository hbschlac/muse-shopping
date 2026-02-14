/**
 * Instagram Scan Service
 * Scans Instagram followers to find curators/influencers already on Muse
 */

const pool = require('../db/pool');
const logger = require('../utils/logger');

class InstagramScanService {
  /**
   * Scan Instagram followers and find matching curators on Muse
   * @param {number} userId - User ID
   * @param {string} instagramAccessToken - Instagram access token
   * @returns {Promise<Object>} Scan results with curators found
   */
  static async scanFollowersForCurators(userId, instagramAccessToken) {
    try {
      // In a real implementation, you would:
      // 1. Use Instagram Graph API to get user's following list
      // 2. Match Instagram usernames with curators in your database
      // 3. Auto-follow matched curators

      // For now, we'll return mock data based on existing influencers in DB
      const curators = await this.getMockCuratorsFromDatabase();

      // Simulate scanning progress
      return {
        totalScanned: 1071,
        curatorsFound: curators.length,
        curators: curators.slice(0, 50), // Return first 50
        timeElapsed: 45,
      };
    } catch (error) {
      logger.error('Error scanning Instagram followers:', error);
      throw error;
    }
  }

  /**
   * Get mock curators from database (influencers who have Muse accounts)
   * @returns {Promise<Array>} List of curators
   */
  static async getMockCuratorsFromDatabase() {
    try {
      // Query influencers table or users with influencer flag
      const result = await pool.query(
        `SELECT
          id,
          name,
          username,
          profile_image_url as profile_image,
          follower_count,
          category
         FROM influencers
         WHERE is_active = true
         ORDER BY follower_count DESC
         LIMIT 100`
      );

      return result.rows;
    } catch (error) {
      // If influencers table doesn't exist or query fails, return mock data
      logger.warn('Could not fetch curators from database, using mock data');
      return this.getMockCurators();
    }
  }

  /**
   * Get mock curators (fallback)
   * @returns {Array} Mock curator list
   */
  static getMockCurators() {
    return [
      {
        id: 1,
        name: 'Emma Chen',
        username: 'emmastyle',
        profile_image: 'https://i.pravatar.cc/300?img=1',
        follower_count: 45000,
        category: 'Fashion',
      },
      {
        id: 2,
        name: 'Sophie Miller',
        username: 'sophiefashion',
        profile_image: 'https://i.pravatar.cc/300?img=5',
        follower_count: 82000,
        category: 'Lifestyle',
      },
      {
        id: 3,
        name: 'Olivia Rose',
        username: 'oliviarose',
        profile_image: 'https://i.pravatar.cc/300?img=9',
        follower_count: 120000,
        category: 'Beauty',
      },
      {
        id: 4,
        name: 'Ava Johnson',
        username: 'avastyle',
        profile_image: 'https://i.pravatar.cc/300?img=10',
        follower_count: 67000,
        category: 'Fashion',
      },
      {
        id: 5,
        name: 'Mia Anderson',
        username: 'miamode',
        profile_image: 'https://i.pravatar.cc/300?img=23',
        follower_count: 93000,
        category: 'Sustainable Fashion',
      },
    ];
  }

  /**
   * Auto-follow discovered curators for the user
   * @param {number} userId - User ID
   * @param {Array} curatorIds - Array of curator IDs to follow
   * @returns {Promise<Object>} Result of auto-follow operation
   */
  static async autoFollowCurators(userId, curatorIds) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Insert user_influencer_follows for each curator
      const followPromises = curatorIds.map((curatorId) =>
        client.query(
          `INSERT INTO user_influencer_follows (user_id, influencer_id, source)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, influencer_id) DO NOTHING`,
          [userId, curatorId, 'instagram_scan']
        )
      );

      await Promise.all(followPromises);

      await client.query('COMMIT');

      logger.info(`Auto-followed ${curatorIds.length} curators for user ${userId}`);

      return {
        success: true,
        followedCount: curatorIds.length,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error auto-following curators:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get sample products from followed curators
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Sample products
   */
  static async getSampleProducts(userId) {
    try {
      const result = await pool.query(
        `SELECT
          p.id,
          p.name,
          p.image_url,
          b.name as brand
         FROM products p
         JOIN brands b ON p.brand_id = b.id
         WHERE p.is_active = true
         ORDER BY RANDOM()
         LIMIT 20`
      );

      if (result.rows.length > 0) {
        return result.rows;
      }

      // Fallback to mock products
      return this.getMockProducts();
    } catch (error) {
      logger.warn('Could not fetch products, using mock data');
      return this.getMockProducts();
    }
  }

  /**
   * Get mock products (fallback)
   * @returns {Array} Mock product list
   */
  static getMockProducts() {
    return [
      {
        id: 1,
        name: 'Summer Dress',
        image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400',
        brand: 'Reformation',
      },
      {
        id: 2,
        name: 'Leather Belt',
        image_url: 'https://images.unsplash.com/photo-1624222247344-550fb60583c2?w=400',
        brand: 'Gucci',
      },
      {
        id: 3,
        name: 'Flip Flops',
        image_url: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=400',
        brand: 'Havaianas',
      },
      {
        id: 4,
        name: 'Tote Bag',
        image_url: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400',
        brand: 'Cuyana',
      },
      {
        id: 5,
        name: 'Sunglasses',
        image_url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400',
        brand: 'Ray-Ban',
      },
    ];
  }
}

module.exports = InstagramScanService;
