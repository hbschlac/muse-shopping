# Brand Search API Documentation

## Overview
The Brand Search API allows you to search for brands by name and description with case-insensitive partial matching. The search functionality integrates seamlessly with existing pagination and filtering options.

## Endpoint

```
GET /api/v1/brands
```

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Search term for brand name or description (case-insensitive partial match) |
| `page` | integer | No | Page number for pagination (default: 1) |
| `limit` | integer | No | Number of results per page (default: 20) |
| `category` | string | No | Filter by brand category |
| `price_tier` | string | No | Filter by price tier (budget, mid, premium) |

## Features

### Case-Insensitive Search
The search is case-insensitive, so `"ZARA"`, `"zara"`, and `"Zara"` will all return the same results.

### Partial Matching
The search supports partial matching, allowing you to find brands with incomplete search terms:
- Searching for `"reform"` will find `"Reformation"`
- Searching for `"sustain"` will find brands with `"sustainable"` in their name or description

### Multi-Field Search
The search looks in both the `name` and `description` fields of brands, so you can search by:
- Brand name (e.g., `"Zara"`)
- Description keywords (e.g., `"sustainable"`, `"outdoor clothing"`)

### Combined Filters
You can combine search with other filters for more specific results:
- Search + Category
- Search + Price Tier
- Search + Category + Price Tier

## Examples

### Basic Search

Search for brands containing "sustainable":
```bash
GET /api/v1/brands?search=sustainable
```

Response:
```json
{
  "status": "success",
  "data": {
    "brands": [
      {
        "id": 6,
        "name": "Everlane",
        "description": "Ethical fashion brand known for radical transparency and sustainable practices",
        "category": "sustainable",
        "price_tier": "mid"
      },
      {
        "id": 8,
        "name": "Reformation",
        "description": "Sustainable fashion brand creating vintage-inspired pieces",
        "category": "sustainable",
        "price_tier": "premium"
      }
    ],
    "pagination": {
      "total": 2,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

### Search with Pagination

Get page 2 of search results with 5 items per page:
```bash
GET /api/v1/brands?search=fashion&page=2&limit=5
```

### Search with Category Filter

Find fast-fashion brands with "fashion" in their name or description:
```bash
GET /api/v1/brands?search=fashion&category=fast-fashion
```

Response:
```json
{
  "status": "success",
  "data": {
    "brands": [
      {
        "id": 1,
        "name": "Zara",
        "category": "fast-fashion",
        "description": "Spanish fast-fashion retailer known for trendy, affordable clothing"
      },
      {
        "id": 2,
        "name": "H&M",
        "category": "fast-fashion",
        "description": "Swedish multinational clothing company offering fashion and quality at the best price"
      }
    ],
    "pagination": {
      "total": 4,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

### Search with Price Tier Filter

Find premium brands mentioning "brand" in their details:
```bash
GET /api/v1/brands?search=brand&price_tier=premium
```

### Combined Filters

Search for outdoor clothing brands in the premium tier:
```bash
GET /api/v1/brands?search=clothing&category=outdoor&price_tier=premium
```

Response:
```json
{
  "status": "success",
  "data": {
    "brands": [
      {
        "id": 7,
        "name": "Patagonia",
        "category": "outdoor",
        "price_tier": "premium",
        "description": "Outdoor clothing company committed to environmental responsibility"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

### Special Characters

Search handles special characters correctly (URL encoding recommended):
```bash
GET /api/v1/brands?search=H%26M
```

## Implementation Details

### SQL Query
The search uses PostgreSQL's `ILIKE` operator for case-insensitive pattern matching:

```sql
WHERE is_active = TRUE
  AND (name ILIKE '%search_term%' OR description ILIKE '%search_term%')
```

### Performance
- The search is optimized to work with existing indexes on the `brands` table
- Results are ordered by brand name
- Only active brands (`is_active = TRUE`) are included in search results

## Testing

Run the comprehensive test suite to verify search functionality:

```bash
# Test the service layer directly
node scripts/test-brand-search.js

# Test the API endpoints (requires server running)
npm run dev  # In one terminal
node scripts/test-brand-api.js  # In another terminal
```

## Error Handling

The API returns standard HTTP status codes:
- `200 OK` - Search successful (even if no results found)
- `400 Bad Request` - Invalid query parameters
- `500 Internal Server Error` - Server error

Empty search results return an empty array with pagination info:
```json
{
  "status": "success",
  "data": {
    "brands": [],
    "pagination": {
      "total": 0,
      "page": 1,
      "limit": 20,
      "totalPages": 0
    }
  }
}
```
