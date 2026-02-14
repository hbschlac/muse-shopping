const campaignService = require('../services/campaignService');
const logger = require('../config/logger');

/**
 * Get campaign details including items
 */
exports.getCampaignDetails = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user?.id;

    const campaign = await campaignService.getCampaignDetails(campaignId, userId);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found or is not active',
      });
    }

    res.json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    logger.error('Error getting campaign details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load campaign details',
    });
  }
};

/**
 * Track campaign impression
 */
exports.trackImpression = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user?.id;

    await campaignService.trackImpression(campaignId, userId);

    res.json({
      success: true,
      message: 'Impression tracked',
    });
  } catch (error) {
    logger.error('Error tracking campaign impression:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track impression',
    });
  }
};

/**
 * Track campaign click
 */
exports.trackClick = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { click_type } = req.body;
    const userId = req.user?.id;

    if (!click_type) {
      return res.status(400).json({
        success: false,
        error: 'click_type is required',
      });
    }

    await campaignService.trackClick(campaignId, userId, click_type);

    res.json({
      success: true,
      message: 'Click tracked',
    });
  } catch (error) {
    logger.error('Error tracking campaign click:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track click',
    });
  }
};

/**
 * Track campaign conversion
 */
exports.trackConversion = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { item_id, conversion_type } = req.body;
    const userId = req.user?.id;

    if (!item_id || !conversion_type) {
      return res.status(400).json({
        success: false,
        error: 'item_id and conversion_type are required',
      });
    }

    await campaignService.trackConversion(campaignId, userId, item_id, conversion_type);

    res.json({
      success: true,
      message: 'Conversion tracked',
    });
  } catch (error) {
    logger.error('Error tracking campaign conversion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track conversion',
    });
  }
};
