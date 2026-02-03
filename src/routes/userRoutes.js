const express = require('express');
const UserController = require('../controllers/userController');
const { validate, updateProfileSchema, updateUserSchema, onboardingSchema } = require('../middleware/validation');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All user routes require authentication
router.use(authMiddleware);

router.get('/me', UserController.getProfile);
router.put('/me', validate(updateUserSchema), UserController.updateUser);
router.put('/me/profile', validate(updateProfileSchema), UserController.updateProfile);
router.patch('/me/onboarding', validate(onboardingSchema), UserController.updateOnboarding);
router.delete('/me', UserController.deleteUser);

module.exports = router;
