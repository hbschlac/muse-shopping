/**
 * Influencer Analysis Service
 * Identifies fashion influencers and analyzes their content for style profiling
 */

const pool = require('../db/pool');
const logger = require('../utils/logger');

// Fashion-related keywords for content analysis
const FASHION_KEYWORDS = {
  categories: [
    'dress', 'dresses', 'top', 'tops', 'blouse', 'shirt', 'pants', 'jeans',
    'skirt', 'jacket', 'coat', 'sweater', 'hoodie', 'shoes', 'boots', 'sneakers',
    'bag', 'handbag', 'purse', 'accessories', 'jewelry', 'watch', 'sunglasses',
    'outfit', 'ootd', 'fashion', 'style', 'look', 'wear', 'wearing'
  ],
  aesthetics: {
    minimalist: ['minimalist', 'minimal', 'simple', 'clean', 'timeless', 'classic', 'elegant'],
    streetwear: ['streetwear', 'urban', 'hypebeast', 'sneakerhead', 'street style', 'casual'],
    luxury: ['luxury', 'designer', 'couture', 'high-end', 'premium', 'exclusive', 'chic'],
    vintage: ['vintage', 'retro', 'thrift', 'secondhand', 'antique', '90s', '80s'],
    bohemian: ['boho', 'bohemian', 'hippie', 'free spirit', 'earthy', 'folk'],
    preppy: ['preppy', 'classic', 'collegiate', 'nautical', 'tennis', 'golf'],
    edgy: ['edgy', 'grunge', 'punk', 'rock', 'alternative', 'gothic'],
    feminine: ['feminine', 'girly', 'romantic', 'pretty', 'delicate', 'soft'],
    athleisure: ['athleisure', 'activewear', 'sporty', 'athletic', 'workout', 'gym'],
    business: ['business', 'professional', 'office', 'workwear', 'corporate', 'formal']
  },
  luxury_brands: [
    'gucci', 'prada', 'chanel', 'dior', 'louis vuitton', 'lv', 'hermes', 'balenciaga',
    'valentino', 'givenchy', 'versace', 'burberry', 'fendi', 'saint laurent', 'ysl',
    'celine', 'bottega veneta', 'loewe', 'cartier', 'tiffany'
  ],
  premium_brands: [
    'reformation', 'ganni', 'rag & bone', 'theory', 'vince', 'equipment', 'alice + olivia',
    'rails', 'zimmermann', 'faithfull', 'rotate', 'staud', 'nanushka'
  ],
  mid_brands: [
    'zara', 'mango', 'cos', 'arket', 'massimo dutti', '& other stories', 'uniqlo',
    'everlane', 'madewell', 'anthropologie', 'free people', 'urban outfitters'
  ]
};

class InfluencerAnalysisService {
  /**
   * Analyze if an account is fashion-focused
   * @param {Object} profile - Instagram profile data
   * @param {Array} posts - Recent posts
   * @returns {Object} Analysis result with confidence score
   */
  static analyzeFashionFocus(profile, posts) {
    let fashionScore = 0;
    let totalChecks = 0;

    // Check biography for fashion keywords
    if (profile.biography) {
      const bioLower = profile.biography.toLowerCase();
      const fashionKeywordMatches = FASHION_KEYWORDS.categories.filter(keyword =>
        bioLower.includes(keyword)
      ).length;

      if (fashionKeywordMatches > 0) {
        fashionScore += Math.min(fashionKeywordMatches * 10, 30); // Max 30 points from bio
      }

      // Check for style/fashion-related terms
      if (bioLower.match(/fashion|style|outfit|ootd|fashionista|stylist|model|influencer/)) {
        fashionScore += 20;
      }
      totalChecks += 50;
    }

    // Analyze post captions
    if (posts && posts.length > 0) {
      let fashionPostCount = 0;

      posts.forEach(post => {
        if (post.caption) {
          const captionLower = post.caption.toLowerCase();

          // Check for fashion keywords
          const hasFashionKeywords = FASHION_KEYWORDS.categories.some(keyword =>
            captionLower.includes(keyword)
          );

          // Check for fashion hashtags
          const hasFashionHashtags = captionLower.match(/#(fashion|style|ootd|outfit|look)/);

          if (hasFashionKeywords || hasFashionHashtags) {
            fashionPostCount++;
          }
        }
      });

      const fashionPostRatio = fashionPostCount / posts.length;
      fashionScore += fashionPostRatio * 50; // Max 50 points from posts
      totalChecks += 50;
    }

    const confidenceScore = Math.min((fashionScore / totalChecks) * 100, 100);
    const isFashionInfluencer = confidenceScore >= 40; // 40% threshold

    return {
      isFashionInfluencer,
      confidenceScore: parseFloat(confidenceScore.toFixed(2)),
      fashionScore,
      totalChecks
    };
  }

  /**
   * Analyze post content for fashion categories
   * @param {Array} posts - Instagram posts
   * @returns {Object} Category scores
   */
  static analyzeCategoryPreferences(posts) {
    const categoryScores = {};

    posts.forEach(post => {
      if (!post.caption) return;

      const captionLower = post.caption.toLowerCase();

      // Map keywords to categories
      const keywordToCategory = {
        'dress': 'dresses',
        'dresses': 'dresses',
        'top': 'tops',
        'tops': 'tops',
        'blouse': 'tops',
        'shirt': 'tops',
        'tshirt': 'tops',
        't-shirt': 'tops',
        'pants': 'pants',
        'jeans': 'jeans',
        'denim': 'jeans',
        'skirt': 'skirts',
        'jacket': 'outerwear',
        'coat': 'outerwear',
        'blazer': 'outerwear',
        'sweater': 'sweaters',
        'hoodie': 'sweaters',
        'cardigan': 'sweaters',
        'shoes': 'shoes',
        'boots': 'shoes',
        'sneakers': 'shoes',
        'heels': 'shoes',
        'sandals': 'shoes',
        'bag': 'bags',
        'handbag': 'bags',
        'purse': 'bags',
        'backpack': 'bags',
        'jewelry': 'accessories',
        'necklace': 'accessories',
        'earrings': 'accessories',
        'bracelet': 'accessories',
        'watch': 'accessories',
        'sunglasses': 'accessories'
      };

      Object.entries(keywordToCategory).forEach(([keyword, category]) => {
        if (captionLower.includes(keyword)) {
          categoryScores[category] = (categoryScores[category] || 0) + 1;
        }
      });
    });

    // Normalize scores to percentages
    const total = Object.values(categoryScores).reduce((sum, score) => sum + score, 0);
    if (total > 0) {
      Object.keys(categoryScores).forEach(category => {
        categoryScores[category] = parseFloat(((categoryScores[category] / total) * 100).toFixed(2));
      });
    }

    return categoryScores;
  }

  /**
   * Detect aesthetic preferences from content
   * @param {Object} profile - Profile data
   * @param {Array} posts - Instagram posts
   * @returns {Array} List of detected aesthetics
   */
  static detectAesthetics(profile, posts) {
    const aestheticScores = {};

    // Combine all text to analyze
    const allText = [
      profile.biography || '',
      ...posts.map(p => p.caption || '')
    ].join(' ').toLowerCase();

    // Score each aesthetic
    Object.entries(FASHION_KEYWORDS.aesthetics).forEach(([aesthetic, keywords]) => {
      const matches = keywords.filter(keyword => allText.includes(keyword)).length;
      if (matches > 0) {
        aestheticScores[aesthetic] = matches;
      }
    });

    // Return top aesthetics (with at least 2 mentions)
    return Object.entries(aestheticScores)
      .filter(([, score]) => score >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([aesthetic]) => aesthetic)
      .slice(0, 5); // Top 5 aesthetics
  }

  /**
   * Determine price tier based on brand mentions
   * @param {Object} profile - Profile data
   * @param {Array} posts - Instagram posts
   * @returns {string} Price tier classification
   */
  static determinePriceTier(profile, posts) {
    const allText = [
      profile.biography || '',
      ...posts.map(p => p.caption || '')
    ].join(' ').toLowerCase();

    let luxuryMentions = 0;
    let premiumMentions = 0;
    let midMentions = 0;

    // Count luxury brand mentions
    FASHION_KEYWORDS.luxury_brands.forEach(brand => {
      if (allText.includes(brand)) luxuryMentions++;
    });

    // Count premium brand mentions
    FASHION_KEYWORDS.premium_brands.forEach(brand => {
      if (allText.includes(brand)) premiumMentions++;
    });

    // Count mid-range brand mentions
    FASHION_KEYWORDS.mid_brands.forEach(brand => {
      if (allText.includes(brand)) midMentions++;
    });

    // Determine tier based on mentions
    if (luxuryMentions >= 3) return 'luxury';
    if (luxuryMentions >= 1 && premiumMentions >= 1) return 'premium';
    if (premiumMentions >= 3) return 'premium';
    if (midMentions >= 3) return 'mid-range';
    if (midMentions >= 1) return 'budget';

    // Default to mid-range if no clear signals
    return 'mid-range';
  }

  /**
   * Extract brand affiliations from content
   * @param {Object} profile - Profile data
   * @param {Array} posts - Instagram posts
   * @returns {Array} List of mentioned brands
   */
  static extractBrandAffiliations(profile, posts) {
    const allBrands = [
      ...FASHION_KEYWORDS.luxury_brands,
      ...FASHION_KEYWORDS.premium_brands,
      ...FASHION_KEYWORDS.mid_brands
    ];

    const allText = [
      profile.biography || '',
      ...posts.map(p => p.caption || '')
    ].join(' ').toLowerCase();

    const mentionedBrands = new Set();

    allBrands.forEach(brand => {
      if (allText.includes(brand)) {
        // Capitalize first letter of each word
        const formatted = brand
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        mentionedBrands.add(formatted);
      }
    });

    return Array.from(mentionedBrands);
  }

  /**
   * Analyze color palette from captions (limited without image analysis)
   * @param {Array} posts - Instagram posts
   * @returns {Object} Color frequency scores
   */
  static analyzeColorPalette(posts) {
    const colors = [
      'black', 'white', 'grey', 'gray', 'beige', 'tan', 'brown',
      'red', 'pink', 'orange', 'yellow', 'green', 'blue', 'navy',
      'purple', 'lavender', 'gold', 'silver', 'cream', 'ivory'
    ];

    const colorScores = {};

    posts.forEach(post => {
      if (!post.caption) return;

      const captionLower = post.caption.toLowerCase();

      colors.forEach(color => {
        if (captionLower.includes(color)) {
          colorScores[color] = (colorScores[color] || 0) + 1;
        }
      });
    });

    // Normalize to percentages
    const total = Object.values(colorScores).reduce((sum, score) => sum + score, 0);
    if (total > 0) {
      Object.keys(colorScores).forEach(color => {
        colorScores[color] = parseFloat(((colorScores[color] / total) * 100).toFixed(2));
      });
    }

    return colorScores;
  }

  /**
   * Create complete influencer profile from analysis
   * @param {Object} profile - Instagram profile data
   * @param {Array} posts - Recent posts
   * @returns {Object} Complete analyzed profile
   */
  static createInfluencerProfile(profile, posts) {
    const fashionAnalysis = this.analyzeFashionFocus(profile, posts);
    const categories = this.analyzeCategoryPreferences(posts);
    const aesthetics = this.detectAesthetics(profile, posts);
    const priceTier = this.determinePriceTier(profile, posts);
    const brands = this.extractBrandAffiliations(profile, posts);
    const colors = this.analyzeColorPalette(posts);

    // Calculate engagement metrics
    let avgLikes = 0;
    let avgComments = 0;

    if (posts.length > 0) {
      avgLikes = posts.reduce((sum, p) => sum + (p.like_count || 0), 0) / posts.length;
      avgComments = posts.reduce((sum, p) => sum + (p.comments_count || 0), 0) / posts.length;
    }

    const engagementRate = profile.followerCount > 0
      ? ((avgLikes + avgComments) / profile.followerCount) * 100
      : 0;

    return {
      ...profile,
      isFashionInfluencer: fashionAnalysis.isFashionInfluencer,
      confidenceScore: fashionAnalysis.confidenceScore,
      influencerTier: this.determineInfluencerTier(profile.followerCount),
      primaryCategories: categories,
      aestheticTags: aesthetics,
      colorPalette: colors,
      priceTier,
      brandAffiliations: brands,
      avgLikes: Math.round(avgLikes),
      avgComments: Math.round(avgComments),
      engagementRate: parseFloat(engagementRate.toFixed(2)),
      postsAnalyzed: posts.length,
      lastAnalyzedAt: new Date(),
      analysisVersion: '1.0'
    };
  }

  /**
   * Determine influencer tier from follower count
   * @param {number} followerCount - Number of followers
   * @returns {string} Tier classification
   */
  static determineInfluencerTier(followerCount) {
    if (followerCount >= 1000000) return 'mega';
    if (followerCount >= 100000) return 'macro';
    if (followerCount >= 10000) return 'micro';
    if (followerCount >= 1000) return 'nano';
    return 'user';
  }

  /**
   * Save or update influencer in database
   * @param {Object} influencerData - Analyzed influencer data
   * @returns {Promise<Object>} Saved influencer record
   */
  static async saveInfluencer(influencerData) {
    const query = `
      INSERT INTO fashion_influencers (
        instagram_user_id,
        username,
        display_name,
        profile_picture_url,
        follower_count,
        following_count,
        media_count,
        biography,
        is_fashion_influencer,
        influencer_tier,
        confidence_score,
        primary_categories,
        aesthetic_tags,
        color_palette,
        price_tier,
        brand_affiliations,
        last_analyzed_at,
        posts_analyzed,
        analysis_version,
        avg_likes,
        avg_comments,
        engagement_rate
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      ON CONFLICT (instagram_user_id)
      DO UPDATE SET
        username = EXCLUDED.username,
        display_name = EXCLUDED.display_name,
        profile_picture_url = EXCLUDED.profile_picture_url,
        follower_count = EXCLUDED.follower_count,
        following_count = EXCLUDED.following_count,
        media_count = EXCLUDED.media_count,
        biography = EXCLUDED.biography,
        is_fashion_influencer = EXCLUDED.is_fashion_influencer,
        influencer_tier = EXCLUDED.influencer_tier,
        confidence_score = EXCLUDED.confidence_score,
        primary_categories = EXCLUDED.primary_categories,
        aesthetic_tags = EXCLUDED.aesthetic_tags,
        color_palette = EXCLUDED.color_palette,
        price_tier = EXCLUDED.price_tier,
        brand_affiliations = EXCLUDED.brand_affiliations,
        last_analyzed_at = EXCLUDED.last_analyzed_at,
        posts_analyzed = EXCLUDED.posts_analyzed,
        analysis_version = EXCLUDED.analysis_version,
        avg_likes = EXCLUDED.avg_likes,
        avg_comments = EXCLUDED.avg_comments,
        engagement_rate = EXCLUDED.engagement_rate,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await pool.query(query, [
      influencerData.instagramUserId,
      influencerData.username,
      influencerData.displayName,
      influencerData.profilePictureUrl,
      influencerData.followerCount,
      influencerData.followingCount || 0,
      influencerData.mediaCount,
      influencerData.biography,
      influencerData.isFashionInfluencer,
      influencerData.influencerTier,
      influencerData.confidenceScore,
      JSON.stringify(influencerData.primaryCategories || {}),
      influencerData.aestheticTags || [],
      JSON.stringify(influencerData.colorPalette || {}),
      influencerData.priceTier,
      influencerData.brandAffiliations || [],
      influencerData.lastAnalyzedAt,
      influencerData.postsAnalyzed,
      influencerData.analysisVersion,
      influencerData.avgLikes,
      influencerData.avgComments,
      influencerData.engagementRate
    ]);

    logger.info(`Influencer saved/updated: @${influencerData.username} (fashion: ${influencerData.isFashionInfluencer}, confidence: ${influencerData.confidenceScore}%)`);

    return result.rows[0];
  }

  /**
   * Get influencer from database by username
   * @param {string} username - Instagram username
   * @returns {Promise<Object|null>} Influencer data or null
   */
  static async getInfluencerByUsername(username) {
    const result = await pool.query(
      'SELECT * FROM fashion_influencers WHERE username = $1',
      [username]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Get all fashion influencers
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} List of influencers
   */
  static async getInfluencers(filters = {}) {
    let query = 'SELECT * FROM fashion_influencers WHERE is_fashion_influencer = true';
    const params = [];

    if (filters.tier) {
      params.push(filters.tier);
      query += ` AND influencer_tier = $${params.length}`;
    }

    if (filters.minConfidence) {
      params.push(filters.minConfidence);
      query += ` AND confidence_score >= $${params.length}`;
    }

    query += ' ORDER BY follower_count DESC';

    if (filters.limit) {
      params.push(filters.limit);
      query += ` LIMIT $${params.length}`;
    }

    const result = await pool.query(query, params);
    return result.rows;
  }
}

module.exports = InfluencerAnalysisService;
