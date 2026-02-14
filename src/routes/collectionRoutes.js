const express = require('express');
const router = express.Router();
const CollectionController = require('../controllers/collectionController');
const authMiddleware = require('../middleware/authMiddleware');

// All collection routes require authentication
router.use(authMiddleware);

// Collection CRUD
router.get('/', CollectionController.getUserCollections);
router.post('/', CollectionController.createCollection);
router.get('/:id', CollectionController.getCollectionById);
router.put('/:id', CollectionController.updateCollection);
router.delete('/:id', CollectionController.deleteCollection);

// Collection items
router.get('/:id/items', CollectionController.getCollectionItems);
router.post('/:id/items', CollectionController.addItemToCollection);
router.delete('/:id/items/:itemId', CollectionController.removeItemFromCollection);

module.exports = router;
