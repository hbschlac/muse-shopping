# Review Ingestion

## Overview
Muse aggregates reviews from retailer sources and stores them in `item_reviews` for PDP display.
This system is automatic once retailer API access is configured.

## Supported Retailers (Order of Integration)
1. Nordstrom
2. Bloomingdale's
3. Macy's

## Environment Variables
Set the following in your `.env`:

```
NORDSTROM_REVIEWS_PROVIDER=bazaarvoice
NORDSTROM_BAZAARVOICE_PASSKEY=your_key
NORDSTROM_BAZAARVOICE_API_BASE=https://api.bazaarvoice.com/data/reviews.json

BLOOMINGDALES_REVIEWS_PROVIDER=bazaarvoice
BLOOMINGDALES_BAZAARVOICE_PASSKEY=your_key
BLOOMINGDALES_BAZAARVOICE_API_BASE=https://api.bazaarvoice.com/data/reviews.json

MACYS_REVIEWS_PROVIDER=bazaarvoice
MACYS_BAZAARVOICE_PASSKEY=your_key
MACYS_BAZAARVOICE_API_BASE=https://api.bazaarvoice.com/data/reviews.json

REVIEWS_SYNC_INTERVAL_MINUTES=60
REVIEWS_SYNC_LIMIT=200
REVIEWS_SYNC_RETAILERS=nordstrom,bloomingdales,macys
```

## Running Sync
Manual run:
```
npm run sync:reviews -- --item_id=123
```

Batch run:
```
npm run sync:reviews -- --limit=200
```

Continuous scheduler:
```
npm run sync:reviews:loop
```

## Admin Trigger
Admin endpoint:
```
POST /api/v1/admin/reviews/sync
```

Body example:
```
{
  "itemId": 123,
  "retailers": ["nordstrom", "bloomingdales"],
  "dryRun": false
}
```

## Notes
- Review ingestion uses official/partner APIs only. Scraping is not used.
- Product IDs are derived from listing URLs. If a retailer uses different IDs, add a mapping field.

## PDP Reviews API
Get reviews (supports pagination):
```
GET /api/v1/items/:itemId/reviews?limit=5&offset=0&sort_by=newest
```

Mark helpful:
```
POST /api/v1/items/:itemId/reviews/:reviewId/helpful
```

Helpful throttling:
- One helpful per user (if authenticated) or per IP (if anonymous).

Reviews page:
- `public/reviews.html?itemId=123`

Report review:
```
POST /api/v1/items/:itemId/reviews/:reviewId/report
```
