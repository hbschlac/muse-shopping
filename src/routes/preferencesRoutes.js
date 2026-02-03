const express = require('express');
const PreferencesController = require('../controllers/preferencesController');
const { validate, updatePreferencesSchema } = require('../middleware/validation');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All preferences routes require authentication
router.use(authMiddleware);

router.get('/', PreferencesController.getPreferences);
router.put('/', validate(updatePreferencesSchema), PreferencesController.updatePreferences);
router.patch('/', validate(updatePreferencesSchema), PreferencesController.patchPreferences);

module.exports = router;
