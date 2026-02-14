const express = require('express');
const FashionFeedService = require('../services/fashionFeedService');
const router = express.Router();

// GET /fashion/sources
router.get('/sources', async (req, res, next) => {
  try {
    const sources = await FashionFeedService.listSources();
    res.json({ success: true, data: sources });
  } catch (error) {
    next(error);
  }
});

// GET /fashion/feed
router.get('/feed', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const offset = parseInt(req.query.offset || '0', 10);
    const region = req.query.region;
    const category = req.query.category;
    const items = await FashionFeedService.listFeed({ limit, offset, region, category });
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
});


// GET /fashion/context
router.get('/context', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const context = await FashionFeedService.buildContext({ limit });
    res.json({ success: true, data: context });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
