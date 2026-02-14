const AuthService = require('../services/authService');
const { successResponse } = require('../utils/responseFormatter');

class AuthController {
  static async register(req, res, next) {
    try {
      const result = await AuthService.registerUser(req.body);
      res.status(201).json({
        ...successResponse(result, 'Registration successful'),
        user: result.user,
        tokens: result.tokens,
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const result = await AuthService.loginUser(req.body);
      res.status(200).json(successResponse(result, 'Login successful'));
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(req, res, next) {
    try {
      const { refresh_token } = req.body;
      const tokens = await AuthService.refreshToken(refresh_token);
      res.status(200).json(successResponse({ tokens }, 'Token refreshed'));
    } catch (error) {
      next(error);
    }
  }

  static async logout(req, res, next) {
    try {
      const { refresh_token } = req.body;
      await AuthService.logout(refresh_token);
      res.status(200).json(successResponse(null, 'Logout successful'));
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req, res, next) {
    try {
      const { current_password, new_password } = req.body;
      await AuthService.changePassword(req.userId, current_password, new_password);
      res.status(200).json(successResponse(null, 'Password changed successfully'));
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      await AuthService.requestPasswordReset(email);
      // Always return success to prevent email enumeration
      res.status(200).json(successResponse(null, 'If an account exists with this email, a password reset link has been sent'));
    } catch (error) {
      next(error);
    }
  }

  static async verifyResetToken(req, res, next) {
    try {
      const { token } = req.query;
      const valid = await AuthService.verifyResetToken(token);
      res.status(200).json(successResponse({ valid }, 'Token verification complete'));
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req, res, next) {
    try {
      const { token, new_password } = req.body;
      await AuthService.resetPassword(token, new_password);
      res.status(200).json(successResponse(null, 'Password reset successfully'));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
