/**
 * Multi-Armed Bandit Service
 * Implements explore-exploit algorithms for optimal item/brand/position selection
 * Supports: Thompson Sampling, Upper Confidence Bound (UCB), Epsilon-Greedy
 */

const pool = require('../db/pool');
const logger = require('../utils/logger');

class MultiArmedBanditService {
  /**
   * Create bandit arm
   * @param {Object} armData - Arm configuration
   * @returns {Promise<Object>} Created arm
   */
  static async createArm(armData) {
    const {
      experimentId,
      armType,
      armId,
      armName,
      metadata = {}
    } = armData;

    const query = `
      INSERT INTO bandit_arms (
        experiment_id, arm_type, arm_id, arm_name, metadata
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (experiment_id, arm_type, arm_id)
      DO UPDATE SET arm_name = EXCLUDED.arm_name, metadata = EXCLUDED.metadata
      RETURNING *
    `;

    const result = await pool.query(query, [
      experimentId,
      armType,
      armId,
      armName,
      JSON.stringify(metadata)
    ]);

    return result.rows[0];
  }

  /**
   * Thompson Sampling: Select arm based on Beta distribution sampling
   * Best for: Binary rewards (click/no-click, convert/no-convert)
   * @param {number} experimentId - Experiment ID
   * @param {string} armType - Type of arms to select from
   * @param {number} count - Number of arms to select
   * @returns {Promise<Array>} Selected arms
   */
  static async thompsonSampling(experimentId, armType, count = 1) {
    // Get all arms of this type
    const result = await pool.query(
      `SELECT * FROM bandit_arms
       WHERE experiment_id = $1 AND arm_type = $2`,
      [experimentId, armType]
    );

    const arms = result.rows;

    if (arms.length === 0) {
      throw new Error(`No arms found for experiment ${experimentId}, type ${armType}`);
    }

    // Sample from Beta distribution for each arm
    const sampledArms = arms.map(arm => ({
      ...arm,
      sample: this.sampleBeta(parseFloat(arm.alpha), parseFloat(arm.beta))
    }));

    // Sort by sample value (descending) and return top N
    sampledArms.sort((a, b) => b.sample - a.sample);

    const selected = sampledArms.slice(0, Math.min(count, sampledArms.length));

    logger.info(`Thompson Sampling selected ${selected.length} arms for ${armType}`);

    return selected;
  }

  /**
   * Sample from Beta distribution (approximation using normal distribution)
   * @param {number} alpha - Alpha parameter
   * @param {number} beta - Beta parameter
   * @returns {number} Sampled value
   */
  static sampleBeta(alpha, beta) {
    // For large alpha and beta, use normal approximation
    if (alpha > 1 && beta > 1) {
      const mean = alpha / (alpha + beta);
      const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
      return Math.max(0, Math.min(1, this.sampleNormal(mean, Math.sqrt(variance))));
    }

    // Simple approximation for small values
    // In production, use a proper Beta distribution sampler
    const samples = 100;
    let sum = 0;
    for (let i = 0; i < samples; i++) {
      const u = Math.random();
      sum += Math.pow(u, 1 / alpha) * Math.pow(1 - u, 1 / beta);
    }
    return sum / samples;
  }

  /**
   * Sample from Normal distribution (Box-Muller transform)
   * @param {number} mean - Mean
   * @param {number} stdDev - Standard deviation
   * @returns {number} Sampled value
   */
  static sampleNormal(mean, stdDev) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * stdDev;
  }

  /**
   * Upper Confidence Bound (UCB1): Select arm based on confidence bounds
   * Best for: Continuous rewards, when you want to balance explore/exploit explicitly
   * @param {number} experimentId - Experiment ID
   * @param {string} armType - Type of arms
   * @param {number} count - Number of arms to select
   * @param {number} c - Exploration constant (default: sqrt(2))
   * @returns {Promise<Array>} Selected arms
   */
  static async upperConfidenceBound(experimentId, armType, count = 1, c = Math.sqrt(2)) {
    // Get all arms and total pulls
    const result = await pool.query(
      `SELECT
        ba.*,
        (SELECT SUM(total_pulls) FROM bandit_arms
         WHERE experiment_id = $1 AND arm_type = $2) as total_pulls_all
       FROM bandit_arms ba
       WHERE ba.experiment_id = $1 AND ba.arm_type = $2`,
      [experimentId, armType]
    );

    const arms = result.rows;

    if (arms.length === 0) {
      throw new Error(`No arms found for experiment ${experimentId}, type ${armType}`);
    }

    const totalPulls = parseInt(arms[0].total_pulls_all || 0);

    // Calculate UCB for each arm
    const armsWithUCB = arms.map(arm => {
      const pulls = parseInt(arm.total_pulls);

      // If never pulled, give infinite UCB (exploration)
      if (pulls === 0) {
        return { ...arm, ucb: Infinity };
      }

      const avgReward = parseFloat(arm.average_reward || 0);
      const exploration = c * Math.sqrt(Math.log(totalPulls) / pulls);
      const ucb = avgReward + exploration;

      return { ...arm, ucb };
    });

    // Sort by UCB (descending) and return top N
    armsWithUCB.sort((a, b) => b.ucb - a.ucb);

    const selected = armsWithUCB.slice(0, Math.min(count, armsWithUCB.length));

    logger.info(`UCB selected ${selected.length} arms for ${armType}`);

    return selected;
  }

  /**
   * Epsilon-Greedy: Exploit best arm with probability (1-epsilon), explore randomly with epsilon
   * Best for: Simple scenarios, quick prototyping
   * @param {number} experimentId - Experiment ID
   * @param {string} armType - Type of arms
   * @param {number} count - Number of arms to select
   * @param {number} epsilon - Exploration rate (0-1)
   * @returns {Promise<Array>} Selected arms
   */
  static async epsilonGreedy(experimentId, armType, count = 1, epsilon = 0.1) {
    // Get all arms
    const result = await pool.query(
      `SELECT * FROM bandit_arms
       WHERE experiment_id = $1 AND arm_type = $2
       ORDER BY average_reward DESC NULLS LAST`,
      [experimentId, armType]
    );

    const arms = result.rows;

    if (arms.length === 0) {
      throw new Error(`No arms found for experiment ${experimentId}, type ${armType}`);
    }

    const selected = [];

    for (let i = 0; i < count; i++) {
      if (Math.random() < epsilon) {
        // Explore: pick random arm
        const randomIndex = Math.floor(Math.random() * arms.length);
        selected.push(arms[randomIndex]);
      } else {
        // Exploit: pick best arm(s)
        selected.push(arms[i % arms.length]);
      }
    }

    logger.info(`Epsilon-Greedy selected ${selected.length} arms for ${armType}`);

    return selected;
  }

  /**
   * Update arm with reward
   * @param {number} armId - Arm ID
   * @param {number} reward - Reward value (0-1 for Thompson, any value for UCB)
   * @param {boolean} success - Was it a success? (for Thompson Sampling)
   * @returns {Promise<void>}
   */
  static async updateArm(armId, reward, success = null) {
    await pool.query(
      'SELECT update_bandit_arm_performance($1, $2, $3)',
      [armId, reward, success !== null ? success : reward > 0.5]
    );

    logger.info(`Arm ${armId} updated with reward ${reward}`);
  }

  /**
   * Get arm performance
   * @param {number} experimentId - Experiment ID
   * @param {string} armType - Optional arm type filter
   * @returns {Promise<Array>} Arm performance data
   */
  static async getArmPerformance(experimentId, armType = null) {
    let query = `
      SELECT
        arm_id,
        arm_name,
        arm_type,
        total_pulls,
        total_reward,
        average_reward,
        alpha,
        beta,
        ROUND(alpha::DECIMAL / (alpha + beta), 4) as expected_win_rate
      FROM bandit_arms
      WHERE experiment_id = $1
    `;

    const params = [experimentId];

    if (armType) {
      query += ' AND arm_type = $2';
      params.push(armType);
    }

    query += ' ORDER BY average_reward DESC NULLS LAST';

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Optimize item ordering using bandit algorithm
   * @param {number} experimentId - Experiment ID
   * @param {Array} items - Available items
   * @param {string} algorithm - Algorithm to use ('thompson', 'ucb', 'epsilon')
   * @param {Object} options - Algorithm options
   * @returns {Promise<Array>} Optimally ordered items
   */
  static async optimizeItemOrdering(experimentId, items, algorithm = 'thompson', options = {}) {
    // Create/update arms for each item
    for (const item of items) {
      await this.createArm({
        experimentId,
        armType: 'item',
        armId: String(item.id),
        armName: item.name,
        metadata: { brandId: item.brand_id, category: item.category }
      });
    }

    // Select items using chosen algorithm
    let selected;
    switch (algorithm) {
      case 'thompson':
        selected = await this.thompsonSampling(experimentId, 'item', items.length);
        break;
      case 'ucb':
        selected = await this.upperConfidenceBound(experimentId, 'item', items.length, options.c);
        break;
      case 'epsilon':
        selected = await this.epsilonGreedy(experimentId, 'item', items.length, options.epsilon);
        break;
      default:
        throw new Error(`Unknown algorithm: ${algorithm}`);
    }

    // Map selected arms back to items with their ordering
    const orderedItems = selected.map((arm, index) => {
      const item = items.find(i => String(i.id) === arm.arm_id);
      return {
        ...item,
        bandit_position: index + 1,
        bandit_score: arm.sample || arm.ucb || arm.average_reward || 0,
        arm_id: arm.id
      };
    });

    logger.info(`Optimized ordering for ${orderedItems.length} items using ${algorithm}`);

    return orderedItems;
  }

  /**
   * Optimize brand ranking
   * @param {number} experimentId - Experiment ID
   * @param {Array} brands - Available brands
   * @param {string} algorithm - Algorithm to use
   * @param {Object} options - Algorithm options
   * @returns {Promise<Array>} Optimally ranked brands
   */
  static async optimizeBrandRanking(experimentId, brands, algorithm = 'thompson', options = {}) {
    // Create/update arms for each brand
    for (const brand of brands) {
      await this.createArm({
        experimentId,
        armType: 'brand',
        armId: String(brand.id),
        armName: brand.name,
        metadata: { category: brand.category }
      });
    }

    // Select brands using chosen algorithm
    let selected;
    switch (algorithm) {
      case 'thompson':
        selected = await this.thompsonSampling(experimentId, 'brand', brands.length);
        break;
      case 'ucb':
        selected = await this.upperConfidenceBound(experimentId, 'brand', brands.length, options.c);
        break;
      case 'epsilon':
        selected = await this.epsilonGreedy(experimentId, 'brand', brands.length, options.epsilon);
        break;
      default:
        throw new Error(`Unknown algorithm: ${algorithm}`);
    }

    // Map selected arms back to brands
    const rankedBrands = selected.map((arm, index) => {
      const brand = brands.find(b => String(b.id) === arm.arm_id);
      return {
        ...brand,
        bandit_rank: index + 1,
        bandit_score: arm.sample || arm.ucb || arm.average_reward || 0,
        arm_id: arm.id
      };
    });

    logger.info(`Optimized ranking for ${rankedBrands.length} brands using ${algorithm}`);

    return rankedBrands;
  }

  /**
   * Reset arm (for testing or algorithm changes)
   * @param {number} armId - Arm ID
   * @returns {Promise<void>}
   */
  static async resetArm(armId) {
    await pool.query(
      `UPDATE bandit_arms
       SET total_pulls = 0,
           total_reward = 0,
           average_reward = NULL,
           alpha = 1,
           beta = 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [armId]
    );

    logger.info(`Arm ${armId} reset`);
  }

  /**
   * Get best performing arms
   * @param {number} experimentId - Experiment ID
   * @param {string} armType - Arm type
   * @param {number} limit - Number of top arms to return
   * @returns {Promise<Array>} Top performing arms
   */
  static async getBestArms(experimentId, armType, limit = 10) {
    const result = await pool.query(
      `SELECT *
       FROM bandit_arms
       WHERE experiment_id = $1 AND arm_type = $2
       ORDER BY average_reward DESC NULLS LAST,
                total_pulls DESC
       LIMIT $3`,
      [experimentId, armType, limit]
    );

    return result.rows;
  }
}

module.exports = MultiArmedBanditService;
