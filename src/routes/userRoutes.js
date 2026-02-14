const express = require('express');
const UserController = require('../controllers/userController');
const { validateJoi, updateProfileSchema, updateUserSchema, onboardingSchema } = require('../middleware/validation');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All user routes require authentication
router.use(authMiddleware);

router.get('/me', UserController.getProfile);
router.put('/me', validateJoi(updateUserSchema), UserController.updateUser);
router.put('/me/profile', validateJoi(updateProfileSchema), UserController.updateProfile);
router.patch('/me/onboarding', validateJoi(onboardingSchema), UserController.updateOnboarding);
router.delete('/me', UserController.deleteUser);

module.exports = router;
