const BrandService = require('../services/brandService');
const { successResponse } = require('../utils/responseFormatter');

class BrandController {
  static async getBrands(req, res, next) {
    try {
      const { page = 1, limit = 20, category, price_tier, search } = req.query;
      const filters = {};

      if (category) filters.category = category;
      if (price_tier) filters.price_tier = price_tier;
      if (search) filters.search = search;

      const result = await BrandService.getBrands(
        parseInt(page),
        parseInt(limit),
        filters
      );

      res.status(200).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  static async getBrandById(req, res, next) {
    try {
      const brand = await BrandService.getBrandWithStats(parseInt(req.params.id));
      res.status(200).json(successResponse({ brand }));
    } catch (error) {
      next(error);
    }
  }

  static async followBrand(req, res, next) {
    try {
      const { brand_id, notification_enabled } = req.body;
      const result = await BrandService.followBrand(
        req.userId,
        brand_id,
        notification_enabled
      );
      res.status(201).json(successResponse(result, 'Brand followed successfully'));
    } catch (error) {
      next(error);
    }
  }

  static async unfollowBrand(req, res, next) {
    try {
      await BrandService.unfollowBrand(req.userId, parseInt(req.params.brandId));
      res.status(200).json(successResponse(null, 'Brand unfollowed successfully'));
    } catch (error) {
      next(error);
    }
  }

  static async getFollowedBrands(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await BrandService.getFollowedBrands(
        req.userId,
        parseInt(page),
        parseInt(limit)
      );
      res.status(200).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = BrandController;
