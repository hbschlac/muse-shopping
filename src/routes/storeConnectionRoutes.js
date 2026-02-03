/**
 * Store Connection Routes
 * OAuth connections to retailer accounts
 */

const express = require('express');
const router = express.Router();
const StoreConnectionController = require('../controllers/storeConnectionController');
const requireAuth = require('../middleware/authMiddleware');

// Get all user's store connections
router.get('/', requireAuth, StoreConnectionController.getUserConnections);

// Get specific store connection
router.get('/:storeId', requireAuth, StoreConnectionController.getConnection);

// Initiate OAuth flow
router.post('/:storeId/connect', requireAuth, StoreConnectionController.initiateOAuth);

// OAuth callback (public - no auth required)
router.get('/callback', StoreConnectionController.handleOAuthCallback);

// Disconnect store
router.delete('/:storeId', requireAuth, StoreConnectionController.disconnectStore);

// Get payment methods for a store
router.get('/:storeId/payment-methods', requireAuth, StoreConnectionController.getPaymentMethods);

// Get addresses for a store
router.get('/:storeId/addresses', requireAuth, StoreConnectionController.getAddresses);

// Sync payment methods from retailer
router.post('/:storeId/sync-payment-methods', requireAuth, StoreConnectionController.syncPaymentMethodsEndpoint);

// Sync addresses from retailer
router.post('/:storeId/sync-addresses', requireAuth, StoreConnectionController.syncAddressesEndpoint);

module.exports = router;
