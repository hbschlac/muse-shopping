const UserService = require('../services/userService');
const { successResponse } = require('../utils/responseFormatter');

class UserController {
  static async getProfile(req, res, next) {
    try {
      const profile = await UserService.getUserProfile(req.userId);
      res.status(200).json(successResponse(profile));
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const profile = await UserService.updateUserProfile(req.userId, req.body);
      res.status(200).json(successResponse({ profile }, 'Profile updated successfully'));
    } catch (error) {
      next(error);
    }
  }

  static async updateUser(req, res, next) {
    try {
      const user = await UserService.updateUser(req.userId, req.body);
      res.status(200).json(successResponse({ user }, 'User updated successfully'));
    } catch (error) {
      next(error);
    }
  }

  static async deleteUser(req, res, next) {
    try {
      await UserService.deleteUser(req.userId);
      res.status(200).json(successResponse(null, 'Account deleted successfully'));
    } catch (error) {
      next(error);
    }
  }

  static async updateOnboarding(req, res, next) {
    try {
      const profile = await UserService.updateUserProfile(req.userId, req.body);
      res.status(200).json(successResponse({ profile }, 'Onboarding profile updated successfully'));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UserController;
