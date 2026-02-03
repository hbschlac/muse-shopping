const express = require('express');
const authRoutes = require('./authRoutes');
const googleAuthRoutes = require('./googleAuthRoutes');
const userRoutes = require('./userRoutes');
const brandRoutes = require('./brandRoutes');
const preferencesRoutes = require('./preferencesRoutes');
const newsfeedRoutes = require('./newsfeedRoutes');
const itemRoutes = require('./itemRoutes');
const emailConnectionRoutes = require('./emailConnectionRoutes');
const storeAccountRoutes = require('./storeAccountRoutes');
const storeConnectionRoutes = require('./storeConnectionRoutes');
const productRoutes = require('./productRoutes');
const cartRoutes = require('./cartRoutes');
const checkoutRoutes = require('./checkoutRoutes');
const orderRoutes = require('./orderRoutes');
const returnRoutes = require('./returnRoutes');
const webhookRoutes = require('./webhookRoutes');
const socialConnectionRoutes = require('./socialConnectionRoutes');
const experimentRoutes = require('./experimentRoutes');
const chatRoutes = require('./chatRoutes');
// Use secured analytics routes with rate limiting, validation, and audit logging
const analyticsRoutes = require('./analyticsRoutes.secured');
const dataDeletionRoutes = require('./dataDeletionRoutes');
const sponsoredContentRoutes = require('./sponsoredContentRoutes');
const adminCatalogRoutes = require('./admin/catalog');
const adminNewsfeedRoutes = require('./admin/newsfeed');
const adminInstagramRoutes = require('./admin/instagram');
const adminChatRoutes = require('./admin/chat');
const adminExperimentRoutes = require('./admin/experiments');
const adminManualOrderRoutes = require('./admin/manualOrders');

const router = express.Router();
const path = require('path');

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

// Legal pages
router.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/privacy-policy.html'));
});

router.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/terms-of-service.html'));
});

// API routes
router.use('/auth', authRoutes);
router.use('/auth', googleAuthRoutes); // Google OAuth routes
router.use('/users', userRoutes);
router.use('/brands', brandRoutes);
router.use('/preferences', preferencesRoutes);
router.use('/newsfeed', newsfeedRoutes);
router.use('/items', itemRoutes);
router.use('/email', emailConnectionRoutes);
router.use('/store-accounts', storeAccountRoutes);
router.use('/store-connections', storeConnectionRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/orders', orderRoutes);
router.use('/returns', returnRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/social', socialConnectionRoutes);
router.use('/experiments', experimentRoutes);
router.use('/chat', chatRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/sponsored', sponsoredContentRoutes);

// Data deletion callback (Meta/Facebook compliance)
router.use('/', dataDeletionRoutes);

// Admin routes
router.use('/admin/catalog', adminCatalogRoutes);
router.use('/admin/newsfeed', adminNewsfeedRoutes);
router.use('/admin/instagram', adminInstagramRoutes);
router.use('/admin/experiments', adminExperimentRoutes);
router.use('/admin/chat', adminChatRoutes);
router.use('/admin/manual-orders', adminManualOrderRoutes);

module.exports = router;
