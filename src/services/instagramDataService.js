/**
 * Instagram Data Fetching Service
 * Fetches user's following list and influencer profile data from Instagram API
 */

const axios = require('axios');
const pool = require('../db/pool');
const { decrypt } = require('../utils/encryption');
const logger = require('../utils/logger');

class InstagramDataService {
  /**
   * Get Instagram access token for user
   * @param {number} userId - User ID
   * @returns {Promise<string>} Decrypted access token
   */
  static async getAccessToken(userId) {
    const result = await pool.query(
      `SELECT access_token_encrypted, token_expires_at
       FROM social_connections
       WHERE user_id = $1 AND provider = 'instagram' AND is_active = true`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('No Instagram connection found for this user');
    }

    const connection = result.rows[0];

    // Check if token is expired
    if (connection.token_expires_at && new Date() >= new Date(connection.token_expires_at)) {
      throw new Error('Instagram access token has expired. Please reconnect your account.');
    }

    // Decrypt and return token
    return decrypt(connection.access_token_encrypted);
  }

  /**
   * Get Instagram account ID for user
   * @param {number} userId - User ID
   * @returns {Promise<string>} Instagram account ID
   */
  static async getInstagramAccountId(userId) {
    const result = await pool.query(
      `SELECT provider_user_id
       FROM social_connections
       WHERE user_id = $1 AND provider = 'instagram' AND is_active = true`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('No Instagram connection found');
    }

    return result.rows[0].provider_user_id;
  }

  /**
   * Fetch user's Instagram profile info
   * @param {string} accessToken - Instagram access token
   * @param {string} igAccountId - Instagram account ID
   * @returns {Promise<Object>} Profile data
   */
  static async fetchProfile(accessToken, igAccountId) {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${igAccountId}`,
        {
          params: {
            fields: 'id,username,name,profile_picture_url,followers_count,follows_count,media_count,biography',
            access_token: accessToken,
          },
        }
      );

      return {
        instagramUserId: response.data.id,
        username: response.data.username,
        displayName: response.data.name,
        profilePictureUrl: response.data.profile_picture_url,
        followerCount: response.data.followers_count,
        followingCount: response.data.follows_count,
        mediaCount: response.data.media_count,
        biography: response.data.biography,
      };
    } catch (error) {
      logger.error('Error fetching Instagram profile:', error.response?.data || error);
      throw new Error('Failed to fetch Instagram profile');
    }
  }

  /**
   * Fetch user's recent Instagram posts
   * @param {string} accessToken - Instagram access token
   * @param {string} igAccountId - Instagram account ID
   * @param {number} limit - Number of posts to fetch (max 25)
   * @returns {Promise<Array>} Array of posts
   */
  static async fetchRecentPosts(accessToken, igAccountId, limit = 25) {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${igAccountId}/media`,
        {
          params: {
            fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
            limit: Math.min(limit, 25),
            access_token: accessToken,
          },
        }
      );

      return response.data.data || [];
    } catch (error) {
      logger.error('Error fetching Instagram posts:', error.response?.data || error);
      throw new Error('Failed to fetch Instagram posts');
    }
  }

  /**
   * Fetch Instagram account insights (for Business/Creator accounts)
   * @param {string} accessToken - Instagram access token
   * @param {string} igAccountId - Instagram account ID
   * @returns {Promise<Object>} Insights data
   */
  static async fetchInsights(accessToken, igAccountId) {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${igAccountId}/insights`,
        {
          params: {
            metric: 'impressions,reach,profile_views,follower_count',
            period: 'day',
            access_token: accessToken,
          },
        }
      );

      const insights = {};
      response.data.data?.forEach(metric => {
        insights[metric.name] = metric.values?.[0]?.value || 0;
      });

      return insights;
    } catch (error) {
      // Insights may not be available for all accounts
      logger.warn('Could not fetch Instagram insights:', error.response?.data?.error?.message);
      return {};
    }
  }

  /**
   * Search for Instagram accounts (limited by API)
   * Note: Instagram Basic Display API doesn't provide search.
   * This would require Instagram Graph API with additional permissions.
   * @param {string} username - Username to search for
   * @returns {Promise<Object|null>} Account info or null
   */
  static async searchAccount(username) {
    // Instagram Basic Display API doesn't support search
    // For now, we'll need to rely on user's following list or external data sources
    logger.warn('Instagram account search not available with Basic Display API');
    return null;
  }

  /**
   * Get list of accounts user follows (requires additional permissions)
   * Note: Instagram Basic Display API has limited access to follows.
   * Full implementation would require Instagram Graph API with extended permissions.
   * @param {string} accessToken - Access token
   * @param {string} igAccountId - Instagram account ID
   * @returns {Promise<Array>} List of followed accounts
   */
  static async fetchFollowing(accessToken, igAccountId) {
    // Instagram Basic Display API doesn't provide access to following list
    // This would require:
    // 1. Instagram Graph API (not Basic Display)
    // 2. instagram_manage_insights permission
    // 3. Business/Creator account

    logger.warn('Fetching following list requires Instagram Graph API with extended permissions');

    // For MVP, we can work with:
    // 1. User's own posts and who they tag/mention
    // 2. Pre-seeded influencer database
    // 3. External data sources

    return [];
  }

  /**
   * Analyze user's posts for mentioned/tagged accounts
   * This helps identify influencers/brands they engage with
   * @param {Array} posts - User's Instagram posts
   * @returns {Array} List of mentioned usernames
   */
  static extractMentionsFromPosts(posts) {
    const mentions = new Set();
    const mentionRegex = /@(\w+)/g;

    posts.forEach(post => {
      if (post.caption) {
        let match;
        while ((match = mentionRegex.exec(post.caption)) !== null) {
          mentions.add(match[1]);
        }
      }
    });

    return Array.from(mentions);
  }

  /**
   * Sync user's Instagram data (profile + posts)
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Sync results
   */
  static async syncUserData(userId) {
    try {
      const accessToken = await this.getAccessToken(userId);
      const igAccountId = await this.getInstagramAccountId(userId);

      // Fetch profile data
      const profile = await this.fetchProfile(accessToken, igAccountId);

      // Fetch recent posts
      const posts = await this.fetchRecentPosts(accessToken, igAccountId, 25);

      // Extract mentions from posts
      const mentions = this.extractMentionsFromPosts(posts);

      // Fetch insights (if available)
      const insights = await this.fetchInsights(accessToken, igAccountId);

      // Update social_connections with latest data
      await pool.query(
        `UPDATE social_connections
         SET last_synced_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND provider = 'instagram'`,
        [userId]
      );

      logger.info(`Instagram data synced for user ${userId}: ${posts.length} posts, ${mentions.length} mentions`);

      return {
        profile,
        posts,
        mentions,
        insights,
        syncedAt: new Date(),
      };
    } catch (error) {
      logger.error(`Error syncing Instagram data for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get Instagram Business account info (different endpoint)
   * @param {string} accessToken - Access token
   * @param {string} igAccountId - Instagram Business account ID
   * @returns {Promise<Object>} Business account data
   */
  static async fetchBusinessAccountInfo(accessToken, igAccountId) {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${igAccountId}`,
        {
          params: {
            fields: 'id,username,name,profile_picture_url,followers_count,follows_count,media_count,biography,website',
            access_token: accessToken,
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Error fetching Instagram Business account:', error.response?.data || error);
      throw new Error('Failed to fetch Instagram Business account info');
    }
  }

  /**
   * Fetch public profile data using username (requires scraping or external API)
   * This is a placeholder for integration with Instagram scraping services
   * @param {string} username - Instagram username
   * @returns {Promise<Object|null>} Public profile data
   */
  static async fetchPublicProfile(username) {
    // This would integrate with:
    // 1. Instagram's public endpoints (limited, may break)
    // 2. Third-party APIs (RapidAPI Instagram endpoints)
    // 3. Web scraping services

    logger.info(`Public profile fetch for @${username} - requires external API integration`);

    // For now, return null
    // In production, integrate with services like:
    // - Instagram's oEmbed API (limited data)
    // - RapidAPI Instagram endpoints
    // - Apify Instagram scrapers

    return null;
  }

  /**
   * Batch fetch multiple influencer profiles
   * @param {Array<string>} usernames - Array of Instagram usernames
   * @returns {Promise<Array>} Array of profile data
   */
  static async batchFetchProfiles(usernames) {
    const profiles = [];

    for (const username of usernames) {
      try {
        const profile = await this.fetchPublicProfile(username);
        if (profile) {
          profiles.push(profile);
        }
      } catch (error) {
        logger.error(`Error fetching profile for @${username}:`, error.message);
      }
    }

    return profiles;
  }

  /**
   * Calculate engagement rate
   * @param {Object} profile - Profile data with follower_count
   * @param {Array} posts - Recent posts with like_count and comments_count
   * @returns {number} Engagement rate percentage
   */
  static calculateEngagementRate(profile, posts) {
    if (!posts || posts.length === 0 || !profile.followerCount) {
      return 0;
    }

    const totalEngagement = posts.reduce((sum, post) => {
      const likes = post.like_count || 0;
      const comments = post.comments_count || 0;
      return sum + likes + comments;
    }, 0);

    const avgEngagement = totalEngagement / posts.length;
    const engagementRate = (avgEngagement / profile.followerCount) * 100;

    return parseFloat(engagementRate.toFixed(2));
  }

  /**
   * Determine influencer tier based on follower count
   * @param {number} followerCount - Number of followers
   * @returns {string} Tier classification
   */
  static determineInfluencerTier(followerCount) {
    if (followerCount >= 1000000) return 'mega'; // 1M+
    if (followerCount >= 100000) return 'macro'; // 100K-1M
    if (followerCount >= 10000) return 'micro'; // 10K-100K
    if (followerCount >= 1000) return 'nano'; // 1K-10K
    return 'user'; // < 1K
  }
}

module.exports = InstagramDataService;
