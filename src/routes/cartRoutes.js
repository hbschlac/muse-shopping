/**
 * Cart Routes
 * Handles shopping cart API endpoints
 */

const express = require('express');
const router = express.Router();
const CartController = require('../controllers/cartController');
const authMiddleware = require('../middleware/authMiddleware');

// All cart routes require authentication
router.use(authMiddleware);

/**
 * Cart item management
 */

// Add single item to cart
router.post('/items', CartController.addItem);

// Add multiple items to cart
router.post('/items/batch', CartController.addItems);

// Check if item exists in cart
router.get('/items/check', CartController.checkItem);

// Update cart item (quantity, size, color, etc.)
router.put('/items/:id', CartController.updateItem);

// Update cart item quantity only
router.patch('/items/:id/quantity', CartController.updateItemQuantity);

// Remove item from cart
router.delete('/items/:id', CartController.removeItem);

/**
 * Cart management
 */

// Get user's cart (grouped by store)
router.get('/', CartController.getCart);

// Get cart summary (totals, counts)
router.get('/summary', CartController.getCartSummary);

// Clear entire cart
router.delete('/', CartController.clearCart);

module.exports = router;
