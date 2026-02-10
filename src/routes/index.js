const express = require('express');
const authRoutes = require('./authRoutes');
const googleAuthRoutes = require('./googleAuthRoutes');
const appleAuthRoutes = require('./appleAuthRoutes');
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
const moduleExperimentRoutes = require('./moduleExperimentRoutes');
const chatRoutes = require('./chatRoutes');
const influencerRoutes = require('./influencers');
const instagramScanRoutes = require('./instagramScanRoutes');
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
const adminReviewRoutes = require('./admin/reviews');
const adminEmailRoutes = require('./admin/emails');
const adminEmailUIRoutes = require('./admin/emailUI');
const adminSignupRequestRoutes = require('./admin/signupRequests');
const adminCacheRoutes = require('./admin/cacheRoutes');
const shopperDataRoutes = require('./shopperDataRoutes');
const recommendationRoutes = require('./recommendationRoutes');
const collectionRoutes = require('./collectionRoutes');
const waitlistRoutes = require('./waitlistRoutes');
const feedbackRoutes = require('./feedbackRoutes');

const router = express.Router();
const path = require('path');
const HealthCheckController = require('../controllers/healthCheckController');

// Health check endpoints - using new comprehensive controller
router.get('/health', HealthCheckController.liveness);
router.get('/health/ready', HealthCheckController.readiness);
router.get('/health/detailed', HealthCheckController.detailed);
router.get('/health/circuit-breakers', HealthCheckController.circuitBreakers);
router.get('/health/metrics', HealthCheckController.metrics);

// Legal pages
router.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/privacy-policy.html'));
});

router.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/terms-of-service.html'));
});

// PDP page (static HTML)
router.get('/pdp', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/pdp.html'));
});

// API routes
router.use('/auth', authRoutes);
router.use('/auth', googleAuthRoutes); // Google OAuth routes
router.use('/auth', appleAuthRoutes); // Apple OAuth routes
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
router.use('/experiments/modules', moduleExperimentRoutes);
router.use('/chat', chatRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/sponsored', sponsoredContentRoutes);
router.use('/influencers', influencerRoutes);
router.use('/instagram', instagramScanRoutes);
router.use('/shopper', shopperDataRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/collections', collectionRoutes);
router.use('/waitlist', waitlistRoutes);
router.use('/feedback', feedbackRoutes);

// Data deletion callback (Meta/Facebook compliance)
router.use('/', dataDeletionRoutes);

// Admin routes
router.use('/admin/catalog', adminCatalogRoutes);
router.use('/admin/newsfeed', adminNewsfeedRoutes);
router.use('/admin/instagram', adminInstagramRoutes);
router.use('/admin/experiments', adminExperimentRoutes);
router.use('/admin/chat', adminChatRoutes);
router.use('/admin/manual-orders', adminManualOrderRoutes);
router.use('/admin/reviews', adminReviewRoutes);
router.use('/admin/emails', adminEmailRoutes);
router.use('/admin/email-ui', adminEmailUIRoutes);
router.use('/admin/signup-requests', adminSignupRequestRoutes);
router.use('/admin/cache', adminCacheRoutes);

module.exports = router;
