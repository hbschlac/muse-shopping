const Brand = require('../models/Brand');
const BrandDiscoveryService = require('./brandDiscoveryService');
const { NotFoundError, ConflictError } = require('../utils/errors');

class BrandService {
  static async getBrands(page = 1, limit = 20, filters = {}) {
    const offset = (page - 1) * limit;

    // If search term provided, use auto-discovery
    if (filters.search) {
      const brands = await BrandDiscoveryService.searchOrCreateBrand(filters.search);
      return {
        brands,
        pagination: {
          total: brands.length,
          page: 1,
          limit: brands.length,
          totalPages: 1,
        },
        autoDiscovered: brands.some(b => b.metadata?.auto_discovered),
      };
    }

    const brands = await Brand.findAll(limit, offset, filters);
    const total = await Brand.count(filters);

    return {
      brands,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getBrandById(brandId) {
    const brand = await Brand.findById(brandId);
    if (!brand) {
      throw new NotFoundError('Brand');
    }
    return brand;
  }

  static async followBrand(userId, brandId, notificationEnabled) {
    // Check if brand exists
    const brand = await Brand.findById(brandId);
    if (!brand) {
      throw new NotFoundError('Brand');
    }

    const follow = await Brand.followBrand(userId, brandId, notificationEnabled);
    return { follow, brand };
  }

  static async unfollowBrand(userId, brandId) {
    const isFollowing = await Brand.isFollowing(userId, brandId);
    if (!isFollowing) {
      throw new NotFoundError('Follow relationship');
    }

    await Brand.unfollowBrand(userId, brandId);
  }

  static async getFollowedBrands(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const brands = await Brand.getFollowedBrands(userId, limit, offset);

    return {
      brands,
      page,
      limit,
    };
  }

  static async getBrandWithStats(brandId) {
    const brand = await this.getBrandById(brandId);
    const followerCount = await Brand.getFollowerCount(brandId);

    return {
      ...brand,
      followers: followerCount,
    };
  }
}

module.exports = BrandService;
