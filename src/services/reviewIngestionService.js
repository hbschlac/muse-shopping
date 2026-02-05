const axios = require('axios');
const pool = require('../db/pool');
const logger = require('../utils/logger');

const SUPPORTED_RETAILERS = ['nordstrom', 'bloomingdales', 'macys'];

class ReviewIngestionService {
  static async syncItemReviews(itemId, options = {}) {
    const {
      retailers = SUPPORTED_RETAILERS,
      dryRun = false
    } = options;

    const listings = await this._getItemListings(itemId, retailers);
    if (listings.length === 0) {
      return { item_id: itemId, imported: 0, skipped: 0, retailers: [] };
    }

    let imported = 0;
    let skipped = 0;
    const retailersTouched = new Set();

    for (const listing of listings) {
      const retailerKey = listing.retailer_key;
      const adapter = this._getAdapter(retailerKey);
      if (!adapter) {
        logger.warn(`No review adapter for retailer: ${retailerKey}`);
        continue;
      }

      const reviews = await adapter.fetchReviewsForListing(listing);
      retailersTouched.add(retailerKey);

      for (const review of reviews) {
        if (!review.source_review_id) {
          skipped += 1;
          continue;
        }

        if (dryRun) {
          imported += 1;
          continue;
        }

        const upserted = await this._upsertReview(itemId, retailerKey, review);
        if (upserted) {
          imported += 1;
        } else {
          skipped += 1;
        }
      }
    }

    return {
      item_id: itemId,
      imported,
      skipped,
      retailers: Array.from(retailersTouched)
    };
  }

  static async _getItemListings(itemId, retailers) {
    const query = `
      SELECT
        il.id as listing_id,
        il.item_id,
        il.product_url,
        il.affiliate_url,
        b.name as retailer_name,
        b.slug as retailer_slug,
        b.id as retailer_id
      FROM item_listings il
      JOIN brands b ON il.retailer_id = b.id
      WHERE il.item_id = $1
    `;

    const result = await pool.query(query, [itemId]);
    const normalized = result.rows
      .map(row => ({
        ...row,
        retailer_key: this._normalizeRetailer(row.retailer_slug || row.retailer_name)
      }))
      .filter(row => retailers.includes(row.retailer_key));

    return normalized;
  }

  static _normalizeRetailer(value = '') {
    return value
      .toString()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  static _getAdapter(retailerKey) {
    switch (retailerKey) {
      case 'nordstrom':
        return nordstromAdapter;
      case 'bloomingdales':
        return bloomingdalesAdapter;
      case 'macys':
        return macysAdapter;
      default:
        return null;
    }
  }

  static async _upsertReview(itemId, retailerKey, review) {
    const query = `
      INSERT INTO item_reviews (
        item_id,
        reviewer_name,
        rating,
        title,
        body,
        helpful_count,
        status,
        source_retailer,
        source_review_id,
        source_url,
        source_product_id,
        source_created_at,
        verified_purchase,
        raw_payload
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'published', $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (source_retailer, source_review_id) DO UPDATE SET
        rating = EXCLUDED.rating,
        title = EXCLUDED.title,
        body = EXCLUDED.body,
        helpful_count = EXCLUDED.helpful_count,
        source_url = EXCLUDED.source_url,
        source_product_id = EXCLUDED.source_product_id,
        source_created_at = EXCLUDED.source_created_at,
        verified_purchase = EXCLUDED.verified_purchase,
        raw_payload = EXCLUDED.raw_payload,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `;

    const result = await pool.query(query, [
      itemId,
      review.reviewer_name || null,
      review.rating,
      review.title || null,
      review.body,
      review.helpful_count || 0,
      retailerKey,
      review.source_review_id,
      review.source_url || null,
      review.source_product_id || null,
      review.source_created_at || null,
      review.verified_purchase || false,
      review.raw_payload || {}
    ]);

    return result.rows[0] || null;
  }
}

const nordstromAdapter = {
  async fetchReviewsForListing(listing) {
    const provider = (process.env.NORDSTROM_REVIEWS_PROVIDER || 'bazaarvoice').toLowerCase();
    if (provider === 'bazaarvoice') {
      const passkey = process.env.NORDSTROM_BAZAARVOICE_PASSKEY;
      if (!passkey) {
        logger.warn('Nordstrom Bazaarvoice passkey not configured. Set NORDSTROM_BAZAARVOICE_PASSKEY.');
        return [];
      }

      const productId = deriveNordstromProductId(listing);
      if (!productId) {
        logger.warn(`Unable to derive Nordstrom product id for listing ${listing.listing_id}`);
        return [];
      }

      const endpoint = process.env.NORDSTROM_BAZAARVOICE_API_BASE
        || 'https://api.bazaarvoice.com/data/reviews.json';

      return await fetchBazaarvoiceReviews({
        endpoint,
        passkey,
        productId,
        sourceRetailer: 'nordstrom',
        sourceUrl: listing.product_url
      });
    }

    logger.warn(`Nordstrom reviews provider not supported: ${provider}`);
    return [];
  }
};

const bloomingdalesAdapter = {
  async fetchReviewsForListing(listing) {
    const provider = (process.env.BLOOMINGDALES_REVIEWS_PROVIDER || 'bazaarvoice').toLowerCase();
    if (provider === 'bazaarvoice') {
      const passkey = process.env.BLOOMINGDALES_BAZAARVOICE_PASSKEY;
      if (!passkey) {
        logger.warn('Bloomingdales Bazaarvoice passkey not configured. Set BLOOMINGDALES_BAZAARVOICE_PASSKEY.');
        return [];
      }

      const productId = deriveBloomingdalesProductId(listing);
      if (!productId) {
        logger.warn(`Unable to derive Bloomingdales product id for listing ${listing.listing_id}`);
        return [];
      }

      const endpoint = process.env.BLOOMINGDALES_BAZAARVOICE_API_BASE
        || 'https://api.bazaarvoice.com/data/reviews.json';

      return await fetchBazaarvoiceReviews({
        endpoint,
        passkey,
        productId,
        sourceRetailer: 'bloomingdales',
        sourceUrl: listing.product_url
      });
    }

    logger.warn(`Bloomingdales reviews provider not supported: ${provider}`);
    return [];
  }
};

const macysAdapter = {
  async fetchReviewsForListing(listing) {
    const provider = (process.env.MACYS_REVIEWS_PROVIDER || 'bazaarvoice').toLowerCase();
    if (provider === 'bazaarvoice') {
      const passkey = process.env.MACYS_BAZAARVOICE_PASSKEY;
      if (!passkey) {
        logger.warn('Macys Bazaarvoice passkey not configured. Set MACYS_BAZAARVOICE_PASSKEY.');
        return [];
      }

      const productId = deriveMacysProductId(listing);
      if (!productId) {
        logger.warn(`Unable to derive Macys product id for listing ${listing.listing_id}`);
        return [];
      }

      const endpoint = process.env.MACYS_BAZAARVOICE_API_BASE
        || 'https://api.bazaarvoice.com/data/reviews.json';

      return await fetchBazaarvoiceReviews({
        endpoint,
        passkey,
        productId,
        sourceRetailer: 'macys',
        sourceUrl: listing.product_url
      });
    }

    logger.warn(`Macys reviews provider not supported: ${provider}`);
    return [];
  }
};

async function fetchBazaarvoiceReviews({
  endpoint,
  passkey,
  productId,
  sourceRetailer,
  sourceUrl
}) {
  try {
    const params = new URLSearchParams({
      apiversion: '5.4',
      passkey,
      Filter: `ProductId:eq:${productId}`,
      Limit: '50',
      Sort: 'SubmissionTime:desc',
      Include: 'Products,Authors'
    });

    const url = `${endpoint}?${params.toString()}`;
    const response = await axios.get(url, { timeout: 10000 });
    const results = response.data && response.data.Results ? response.data.Results : [];

    return results.map(review => ({
      source_retailer: sourceRetailer,
      source_review_id: review.Id,
      source_url: sourceUrl,
      source_product_id: productId,
      reviewer_name: review.UserNickname || review.AuthorId || 'Verified Buyer',
      rating: review.Rating || 0,
      title: review.Title || null,
      body: review.ReviewText || '',
      helpful_count: review.TotalPositiveFeedbackCount || 0,
      verified_purchase: Boolean(review.IsVerifiedBuyer),
      source_created_at: review.SubmissionTime ? new Date(review.SubmissionTime) : null,
      raw_payload: review
    }));
  } catch (error) {
    logger.error('Bazaarvoice review fetch failed:', error.message);
    return [];
  }
}

function deriveNordstromProductId(listing) {
  const match = listing.product_url && listing.product_url.match(/\/(\d{5,})$/);
  return match ? match[1] : null;
}

function deriveBloomingdalesProductId(listing) {
  if (!listing.product_url) return null;
  const idMatch = listing.product_url.match(/ID=(\d+)/i);
  return idMatch ? idMatch[1] : null;
}

function deriveMacysProductId(listing) {
  if (!listing.product_url) return null;
  const idMatch = listing.product_url.match(/ID=(\d+)/i);
  return idMatch ? idMatch[1] : null;
}

module.exports = ReviewIngestionService;
