const express = require('express');
const AuthController = require('../controllers/authController');
const { validate, registerSchema, loginSchema, refreshTokenSchema, changePasswordSchema } = require('../middleware/validation');
const { authLimiter, registerLimiter } = require('../middleware/rateLimiter');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', registerLimiter, validate(registerSchema), AuthController.register);
router.post('/login', authLimiter, validate(loginSchema), AuthController.login);
router.post('/refresh-token', validate(refreshTokenSchema), AuthController.refreshToken);
router.post('/logout', validate(refreshTokenSchema), AuthController.logout);

// Protected routes
router.patch('/change-password', authMiddleware, validate(changePasswordSchema), AuthController.changePassword);

module.exports = router;
