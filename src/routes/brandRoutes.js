const express = require('express');
const BrandController = require('../controllers/brandController');
const { validate, followBrandSchema } = require('../middleware/validation');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.get('/', BrandController.getBrands);
router.get('/:id', BrandController.getBrandById);

// Protected routes
router.post('/follow', authMiddleware, validate(followBrandSchema), BrandController.followBrand);
router.delete('/follow/:brandId', authMiddleware, BrandController.unfollowBrand);
router.get('/following/me', authMiddleware, BrandController.getFollowedBrands);

module.exports = router;
