/**
 * Checkout Routes
 * Handles unified checkout API endpoints
 */

const express = require('express');
const router = express.Router();
const CheckoutController = require('../controllers/checkoutController');
const authMiddleware = require('../middleware/authMiddleware');

// All checkout routes require authentication
router.use(authMiddleware);

/**
 * Checkout session management
 */

// Initiate checkout session from cart
router.post('/sessions', CheckoutController.initiateCheckout);

// Get checkout session details
router.get('/sessions/:sessionId', CheckoutController.getCheckoutSession);

// Add shipping address to session
router.put('/sessions/:sessionId/shipping', CheckoutController.addShippingAddress);

// Add payment method to session
router.put('/sessions/:sessionId/payment', CheckoutController.addPaymentMethod);

// Place orders with all retailers
router.post('/sessions/:sessionId/place', CheckoutController.placeOrders);

module.exports = router;
