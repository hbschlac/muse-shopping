const express = require('express');
const AuthController = require('../controllers/authController');
const { validateJoi, registerSchema, loginSchema, refreshTokenSchema, changePasswordSchema } = require('../middleware/validation');
const { authLimiter, registerLimiter } = require('../middleware/rateLimiter');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', registerLimiter, validateJoi(registerSchema), AuthController.register);
router.post('/login', authLimiter, validateJoi(loginSchema), AuthController.login);
router.post('/refresh-token', validateJoi(refreshTokenSchema), AuthController.refreshToken);
router.post('/logout', validateJoi(refreshTokenSchema), AuthController.logout);

// Password reset routes (public)
router.post('/forgot-password', authLimiter, AuthController.forgotPassword);
router.get('/verify-reset-token', AuthController.verifyResetToken);
router.post('/reset-password', authLimiter, AuthController.resetPassword);

// Protected routes
router.patch('/change-password', authMiddleware, validateJoi(changePasswordSchema), AuthController.changePassword);

module.exports = router;
