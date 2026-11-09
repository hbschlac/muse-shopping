/**
 * Item watches (Notify me on a sold-out size, price watch on a saved item).
 * See src/services/watches.
 *
 *   GET    /watches?store=&item=   the shopper's active watches
 *   POST   /watches                { storeKey, itemId, kind: 'size'|'price', variantId?, size?, color?,
 *                                    title?, imageUrl?, priceCents?, currency? }
 *   DELETE /watches/:id            stop watching
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Watches = require('../services/watches');
const { successResponse } = require('../utils/responseFormatter');

router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try {
    const watches = await Watches.listWatches(req.userId, {
      storeKey: req.query.store ? String(req.query.store) : null,
      itemId: req.query.item ? String(req.query.item) : null,
    });
    res.json(successResponse({ count: watches.length, watches }));
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const watch = await Watches.createWatch(req.userId, req.body || {});
    res.status(201).json(successResponse({ watch }));
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    res.json(successResponse(await Watches.removeWatch(req.userId, req.params.id)));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
