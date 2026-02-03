/**
 * Store Account Routes
 * Routes for store account linking and management
 */

const express = require('express');
const StoreAccountController = require('../controllers/storeAccountController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/v1/store-accounts
 * @desc    Get all store accounts for current user
 * @access  Private
 */
router.get('/', StoreAccountController.getUserStoreAccounts);

/**
 * @route   GET /api/v1/store-accounts/detected
 * @desc    Get auto-detected stores (not yet linked)
 * @access  Private
 */
router.get('/detected', StoreAccountController.getDetectedStores);

/**
 * @route   GET /api/v1/store-accounts/summary
 * @desc    Get account summary stats
 * @access  Private
 */
router.get('/summary', StoreAccountController.getAccountSummary);

/**
 * @route   GET /api/v1/store-accounts/:storeId/orders
 * @desc    Get order history for a specific store
 * @access  Private
 */
router.get('/:storeId/orders', StoreAccountController.getStoreOrderHistory);

/**
 * @route   POST /api/v1/store-accounts/:storeId/link
 * @desc    Link a store account
 * @access  Private
 */
router.post('/:storeId/link', StoreAccountController.linkStore);

/**
 * @route   DELETE /api/v1/store-accounts/:storeId
 * @desc    Unlink a store account
 * @access  Private
 */
router.delete('/:storeId', StoreAccountController.unlinkStore);

module.exports = router;
