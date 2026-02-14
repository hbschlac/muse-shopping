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

// Checkout readiness for current cart
router.get('/readiness', CheckoutController.getCheckoutReadiness);

// Initiate checkout session from cart
router.post('/sessions', CheckoutController.initiateCheckout);

// Get checkout session details
router.get('/sessions/:sessionId', CheckoutController.getCheckoutSession);

// Add shipping address to session
router.put('/sessions/:sessionId/shipping', CheckoutController.addShippingAddress);

// Save recipient contact info (email, phone, name)
router.put('/sessions/:sessionId/recipient', CheckoutController.setRecipientInfo);

// Save billing settings (same-as-shipping or custom billing address)
router.put('/sessions/:sessionId/billing', CheckoutController.setBillingPreferences);

// Add payment method to session
router.put('/sessions/:sessionId/payment', CheckoutController.addPaymentMethod);

// Apply promo code scaffold (eligible across stores in session)
router.put('/sessions/:sessionId/promo', CheckoutController.applyPromoCode);

// Save per-store shipping option selections and SLA choices
router.put('/sessions/:sessionId/shipping-options', CheckoutController.setShippingSelections);

// Place orders with all retailers
router.post('/sessions/:sessionId/place', CheckoutController.placeOrders);

module.exports = router;
