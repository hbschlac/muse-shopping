/**
 * Instagram Scan Controller
 * Handles Instagram scanning and curator discovery
 */

const InstagramScanService = require('../services/instagramScanService');
const { successResponse } = require('../utils/responseFormatter');
const logger = require('../utils/logger');

class InstagramScanController {
  /**
   * Initiate Instagram scan
   * @route   POST /api/v1/instagram/scan
   * @access  Protected
   */
  static async scanFollowers(req, res, next) {
    try {
      const userId = req.user.userId;
      const { instagram_access_token } = req.body;

      // Scan Instagram followers for curators
      const results = await InstagramScanService.scanFollowersForCurators(
        userId,
        instagram_access_token
      );

      // Get sample products to show
      const products = await InstagramScanService.getSampleProducts(userId);

      res.status(200).json(
        successResponse(
          {
            ...results,
            products: products.slice(0, 10),
          },
          'Instagram scan completed'
        )
      );
    } catch (error) {
      logger.error('Error scanning Instagram:', error);
      next(error);
    }
  }

  /**
   * Auto-follow discovered curators
   * @route   POST /api/v1/instagram/auto-follow
   * @access  Protected
   */
  static async autoFollowCurators(req, res, next) {
    try {
      const userId = req.user.userId;
      const { curator_ids } = req.body;

      if (!curator_ids || !Array.isArray(curator_ids)) {
        return res.status(400).json({
          success: false,
          error: 'curator_ids must be an array',
        });
      }

      const result = await InstagramScanService.autoFollowCurators(
        userId,
        curator_ids
      );

      res.status(200).json(
        successResponse(result, 'Successfully followed curators')
      );
    } catch (error) {
      logger.error('Error auto-following curators:', error);
      next(error);
    }
  }

  /**
   * Get mock scan data (for testing without Instagram connection)
   * @route   GET /api/v1/instagram/mock-scan
   * @access  Protected
   */
  static async getMockScanData(req, res, next) {
    try {
      const curators = InstagramScanService.getMockCurators();
      const products = InstagramScanService.getMockProducts();

      res.status(200).json(
        successResponse(
          {
            totalScanned: 1071,
            curatorsFound: curators.length,
            curators,
            products,
            timeElapsed: 45,
          },
          'Mock scan data retrieved'
        )
      );
    } catch (error) {
      logger.error('Error getting mock scan data:', error);
      next(error);
    }
  }
}

module.exports = InstagramScanController;
