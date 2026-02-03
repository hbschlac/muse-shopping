/**
 * Experiment Middleware
 * Applies A/B testing and bandit optimization to API responses
 */

const ExperimentService = require('../services/experimentService');
const MultiArmedBanditService = require('../services/multiArmedBanditService');
const logger = require('../utils/logger');

/**
 * Newsfeed experimentation middleware
 * Applies experiments to newsfeed item ordering and presentation
 */
const newsfeedExperiment = async (req, res, next) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return next(); // Skip if no user
    }

    // Check for active newsfeed experiments
    const experiments = await ExperimentService.getRunningExperiments();
    const newsfeedExp = experiments.find(exp => exp.target === 'newsfeed' || exp.target === 'item_ordering');

    if (!newsfeedExp) {
      return next(); // No active experiments
    }

    // Assign user to variant
    const variant = await ExperimentService.assignUserToVariant(userId, newsfeedExp.id, req.sessionId);

    if (!variant) {
      return next(); // User not in experiment
    }

    // Attach experiment info to request
    req.experiment = {
      id: newsfeedExp.id,
      name: newsfeedExp.name,
      variant: variant,
      config: variant.config
    };

    logger.info(`User ${userId} in experiment ${newsfeedExp.name}, variant: ${variant.name}`);

    next();
  } catch (error) {
    logger.error('Error in newsfeed experiment middleware:', error);
    next(); // Don't block request on experiment error
  }
};

/**
 * Apply bandit optimization to items
 * Reorders items based on multi-armed bandit algorithm
 */
const applyBanditOptimization = async (items, experimentId, algorithm = 'thompson', options = {}) => {
  try {
    if (!items || items.length === 0) {
      return items;
    }

    // Optimize item ordering
    const optimizedItems = await MultiArmedBanditService.optimizeItemOrdering(
      experimentId,
      items,
      algorithm,
      options
    );

    return optimizedItems;
  } catch (error) {
    logger.error('Error applying bandit optimization:', error);
    return items; // Return original order on error
  }
};

/**
 * Transform response based on experiment variant
 * @param {Object} data - Response data
 * @param {Object} experiment - Experiment configuration
 * @returns {Object} Transformed data
 */
const transformResponseByVariant = (data, experiment) => {
  if (!experiment || !experiment.config) {
    return data;
  }

  const config = experiment.config;

  // Apply transformations based on variant config
  if (config.itemOrdering) {
    // Custom ordering logic
    switch (config.itemOrdering) {
      case 'price_asc':
        data.items = data.items?.sort((a, b) => (a.price_cents || 0) - (b.price_cents || 0));
        break;
      case 'price_desc':
        data.items = data.items?.sort((a, b) => (b.price_cents || 0) - (a.price_cents || 0));
        break;
      case 'newest_first':
        data.items = data.items?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'random':
        data.items = data.items?.sort(() => Math.random() - 0.5);
        break;
      // 'bandit' handled separately
    }
  }

  if (config.displaySettings) {
    // Apply display settings
    data.displaySettings = {
      ...data.displaySettings,
      ...config.displaySettings
    };
  }

  if (config.moduleOrdering) {
    // Reorder feed modules
    data.modules = data.modules?.sort((a, b) => {
      const aIndex = config.moduleOrdering.indexOf(a.id);
      const bIndex = config.moduleOrdering.indexOf(b.id);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
  }

  return data;
};

/**
 * Wrapper middleware that applies experiment to response
 */
const applyExperiment = (dataExtractor) => {
  return async (req, res, next) => {
    // Store original json function
    const originalJson = res.json.bind(res);

    // Override res.json
    res.json = async function (data) {
      try {
        if (req.experiment) {
          // Extract items from response
          let items = dataExtractor ? dataExtractor(data) : data.items || data.data?.items;

          if (items && items.length > 0) {
            const config = req.experiment.config;

            // Apply bandit optimization if configured
            if (config.itemOrdering === 'bandit') {
              items = await applyBanditOptimization(
                items,
                req.experiment.id,
                config.banditAlgorithm || 'thompson',
                config.banditOptions || {}
              );

              // Update response with optimized items
              if (dataExtractor) {
                // Custom data structure
                data = { ...data };
              } else if (data.data?.items) {
                data.data.items = items;
              } else if (data.items) {
                data.items = items;
              }
            }

            // Apply other variant transformations
            data = transformResponseByVariant(data, req.experiment);

            // Track impression event
            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              await ExperimentService.trackEvent({
                userId: req.userId,
                experimentId: req.experiment.id,
                variantId: req.experiment.variant.id,
                eventType: 'impression',
                eventName: 'item_impression',
                itemId: item.id,
                brandId: item.brand_id,
                position: i + 1,
                sessionId: req.sessionId
              });
            }
          }
        }
      } catch (error) {
        logger.error('Error applying experiment transformation:', error);
        // Continue with original data on error
      }

      // Call original json with (possibly) modified data
      return originalJson(data);
    };

    next();
  };
};

/**
 * Track click event middleware
 */
const trackClick = async (req, res, next) => {
  try {
    const { itemId, experimentId, variantId, position } = req.body;

    if (experimentId && variantId && itemId) {
      await ExperimentService.trackEvent({
        userId: req.userId,
        experimentId,
        variantId,
        eventType: 'click',
        eventName: 'item_click',
        itemId,
        position,
        sessionId: req.sessionId
      });

      // Update bandit arm if applicable
      const arm = await pool.query(
        `SELECT id FROM bandit_arms
         WHERE experiment_id = $1 AND arm_type = 'item' AND arm_id = $2`,
        [experimentId, String(itemId)]
      );

      if (arm.rows.length > 0) {
        await MultiArmedBanditService.updateArm(arm.rows[0].id, 1.0, true);
      }

      // Update position performance
      if (position) {
        await ExperimentService.updatePositionPerformance(experimentId, position, {
          clicks: 1
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Error tracking click:', error);
    next(); // Don't block request
  }
};

/**
 * Track conversion event middleware
 */
const trackConversion = async (req, res, next) => {
  try {
    const { itemId, experimentId, variantId, position, value } = req.body;

    if (experimentId && variantId && itemId) {
      await ExperimentService.trackEvent({
        userId: req.userId,
        experimentId,
        variantId,
        eventType: 'conversion',
        eventName: 'add_to_cart',
        itemId,
        position,
        value: value || 0,
        sessionId: req.sessionId
      });

      // Update bandit arm with higher reward for conversion
      const arm = await pool.query(
        `SELECT id FROM bandit_arms
         WHERE experiment_id = $1 AND arm_type = 'item' AND arm_id = $2`,
        [experimentId, String(itemId)]
      );

      if (arm.rows.length > 0) {
        // Higher reward for conversion
        await MultiArmedBanditService.updateArm(arm.rows[0].id, 2.0, true);
      }

      // Update position performance
      if (position) {
        await ExperimentService.updatePositionPerformance(experimentId, position, {
          conversions: 1,
          value: value || 0
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Error tracking conversion:', error);
    next();
  }
};

/**
 * Extract experiment info from query params for tracking
 */
const extractExperimentInfo = (req, res, next) => {
  // Extract from query params or headers
  req.experimentId = req.query.experimentId || req.headers['x-experiment-id'];
  req.variantId = req.query.variantId || req.headers['x-variant-id'];
  req.sessionId = req.query.sessionId || req.headers['x-session-id'] || req.sessionID;

  next();
};

module.exports = {
  newsfeedExperiment,
  applyBanditOptimization,
  applyExperiment,
  trackClick,
  trackConversion,
  extractExperimentInfo,
  transformResponseByVariant
};
