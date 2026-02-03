# Newsfeed API Documentation

The newsfeed provides personalized content to users based on the brands they follow. It consists of two main sections:

1. **Stories** (Top carousel) - Instagram-style stories for sales, edits, and new arrivals
2. **Modules** (Main feed) - Time-based content carousels with items

## Authentication

All newsfeed endpoints require authentication via Bearer token.

```http
Authorization: Bearer <access_token>
```

---

## Complete Feed

### Get Complete Newsfeed
Get both stories and modules in a single request.

```http
GET /api/v1/newsfeed?limit=20&offset=0
```

**Query Parameters:**
- `limit` (optional): Number of modules to return (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "stories": [
      {
        "story_id": 1,
        "brand_id": 5,
        "brand_name": "Old Navy",
        "brand_logo": "https://...",
        "title": "Flash Sale - Ends Tonight",
        "story_type": "sale",
        "thumbnail_url": "https://...",
        "background_color": "#FF6B6B",
        "text_color": "#FFFFFF",
        "priority": 95,
        "expires_at": "2026-02-01T12:00:00Z",
        "viewed": false,
        "frame_count": 3
      }
    ],
    "modules": [
      {
        "module_id": 1,
        "brand_id": 3,
        "brand_name": "Abercrombie",
        "brand_logo": "https://...",
        "title": "Abercrombie Ski Edit",
        "subtitle": "Hit the slopes in style",
        "module_type": "seasonal_edit",
        "expires_at": "2026-03-01T00:00:00Z",
        "item_count": 5,
        "priority": 100,
        "items": [
          {
            "item_id": 12,
            "canonical_name": "Ski Jacket",
            "description": "Waterproof ski jacket...",
            "category": "outerwear",
            "primary_image_url": "https://...",
            "min_price": 129.99,
            "sale_price": 89.99,
            "is_featured": true,
            "display_order": 1
          }
        ]
      }
    ],
    "pagination": {
      "limit": 20,
      "offset": 0,
      "has_more": false
    }
  }
}
```

---

## Stories Endpoints

### Get All Stories
Get brand stories for the top carousel (only from brands user follows).

```http
GET /api/v1/newsfeed/stories
```

**Response:**
```json
{
  "success": true,
  "data": {
    "stories": [
      {
        "story_id": 1,
        "brand_id": 5,
        "brand_name": "Old Navy",
        "brand_logo": "https://...",
        "title": "Flash Sale - Ends Tonight",
        "story_type": "sale",
        "thumbnail_url": "https://...",
        "background_color": "#FF6B6B",
        "text_color": "#FFFFFF",
        "priority": 95,
        "expires_at": "2026-02-01T12:00:00Z",
        "viewed": false,
        "frame_count": 3
      }
    ]
  }
}
```

**Story Types:**
- `sale` - Sales and promotions
- `edit` - Fashion edits/collections
- `new_arrivals` - New product launches
- `collection` - Seasonal collections

### Get Story Details
Get detailed story with all frames/slides.

```http
GET /api/v1/newsfeed/stories/:storyId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "brand_id": 5,
    "brand_name": "Old Navy",
    "brand_logo": "https://...",
    "title": "Flash Sale - Ends Tonight",
    "story_type": "sale",
    "background_color": "#FF6B6B",
    "text_color": "#FFFFFF",
    "expires_at": "2026-02-01T12:00:00Z",
    "metadata": {
      "discount": "50%",
      "urgency": "ends tonight"
    },
    "frames": [
      {
        "id": 1,
        "frame_order": 1,
        "image_url": "https://...",
        "caption": "50% Off Everything",
        "cta_text": "Shop Now",
        "cta_url": "https://oldnavy.com/sale",
        "item_ids": [12, 15, 18],
        "duration_seconds": 5
      },
      {
        "id": 2,
        "frame_order": 2,
        "image_url": "https://...",
        "caption": "Tonight Only!",
        "cta_text": "Shop Sale",
        "cta_url": "https://oldnavy.com/sale",
        "item_ids": [],
        "duration_seconds": 5
      }
    ],
    "user_view": {
      "viewed_at": "2026-01-31T10:30:00Z",
      "frames_viewed": 2,
      "completed": true
    }
  }
}
```

### Mark Story as Viewed
Track that user has viewed a story.

```http
POST /api/v1/newsfeed/stories/:storyId/view
Content-Type: application/json

{
  "frames_viewed": 3,
  "completed": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 123,
    "story_id": 1,
    "viewed_at": "2026-01-31T12:00:00Z",
    "frames_viewed": 3,
    "completed": true
  }
}
```

### Get Story Analytics
Get analytics for a story (views, completion rate).

```http
GET /api/v1/newsfeed/stories/:storyId/analytics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "story_id": 1,
    "total_views": 1523,
    "unique_viewers": 1205,
    "completed_views": 987,
    "avg_frames_viewed": 2.8,
    "completion_rate": "64.81"
  }
}
```

---

## Modules Endpoints

### Get Feed Modules
Get personalized feed modules (from brands user follows).

```http
GET /api/v1/newsfeed/modules?limit=20&offset=0
```

**Query Parameters:**
- `limit` (optional): Number of modules (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "modules": [
      {
        "module_id": 1,
        "brand_id": 3,
        "brand_name": "Abercrombie",
        "brand_logo": "https://...",
        "title": "Abercrombie Ski Edit",
        "subtitle": "Hit the slopes in style",
        "module_type": "seasonal_edit",
        "expires_at": "2026-03-01T00:00:00Z",
        "item_count": 5,
        "priority": 100
      }
    ],
    "pagination": {
      "limit": 20,
      "offset": 0,
      "has_more": false
    }
  }
}
```

**Module Types:**
- `seasonal_edit` - Seasonal collections (e.g., "Ski Edit")
- `new_arrivals` - New product launches
- `sale` - Sale events
- `trending` - Trending items
- `curated` - Hand-picked collections

### Get Module Items
Get items in a specific module carousel.

```http
GET /api/v1/newsfeed/modules/:moduleId/items
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "item_id": 12,
        "canonical_name": "The Linen Relaxed Shirt",
        "description": "Crafted from breezy linen...",
        "category": "tops",
        "primary_image_url": "https://...",
        "min_price": 68.00,
        "sale_price": null,
        "is_featured": true,
        "display_order": 1
      }
    ]
  }
}
```

### Track Module Interaction
Track user interaction with a module (for analytics and personalization).

```http
POST /api/v1/newsfeed/modules/:moduleId/interact
Content-Type: application/json

{
  "interaction_type": "item_click",
  "item_id": 12
}
```

**Interaction Types:**
- `view` - Module appeared in viewport
- `swipe` - User swiped through carousel
- `item_click` - User clicked on an item
- `dismiss` - User dismissed/hid the module

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 456,
    "user_id": 123,
    "module_id": 1,
    "interaction_type": "item_click",
    "item_id": 12,
    "created_at": "2026-01-31T12:00:00Z"
  }
}
```

### Get Module Analytics
Get analytics for a module.

```http
GET /api/v1/newsfeed/modules/:moduleId/analytics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "module_id": 1,
    "interactions": {
      "view": {
        "count": 2340,
        "unique_users": 1850
      },
      "swipe": {
        "count": 892,
        "unique_users": 678
      },
      "item_click": {
        "count": 456,
        "unique_users": 412
      },
      "dismiss": {
        "count": 23,
        "unique_users": 22
      }
    }
  }
}
```

---

## Example Use Cases

### 1. Display Newsfeed Homepage

```javascript
// Fetch complete feed
const response = await fetch('/api/v1/newsfeed?limit=10', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const { stories, modules } = response.data;

// Display stories carousel at top
renderStories(stories);

// Display module carousels below
modules.forEach(module => {
  renderModuleCarousel(module);
});
```

### 2. View a Brand Story

```javascript
// Get story details
const story = await fetch(`/api/v1/newsfeed/stories/${storyId}`);

// Display frames
story.frames.forEach((frame, index) => {
  setTimeout(() => {
    displayFrame(frame);
  }, index * frame.duration_seconds * 1000);
});

// Mark as viewed when done
await fetch(`/api/v1/newsfeed/stories/${storyId}/view`, {
  method: 'POST',
  body: JSON.stringify({
    frames_viewed: story.frames.length,
    completed: true
  })
});
```

### 3. Track Module Engagement

```javascript
// When module enters viewport
await fetch(`/api/v1/newsfeed/modules/${moduleId}/interact`, {
  method: 'POST',
  body: JSON.stringify({
    interaction_type: 'view'
  })
});

// When user swipes carousel
await fetch(`/api/v1/newsfeed/modules/${moduleId}/interact`, {
  method: 'POST',
  body: JSON.stringify({
    interaction_type: 'swipe'
  })
});

// When user clicks item
await fetch(`/api/v1/newsfeed/modules/${moduleId}/interact`, {
  method: 'POST',
  body: JSON.stringify({
    interaction_type: 'item_click',
    item_id: 12
  })
});
```

---

## Personalization Logic

The newsfeed is personalized based on:

1. **Brand Following**: Only shows content from brands the user follows
2. **Priority**: Content is ordered by priority (brand-set) and recency
3. **Target Audience**: Modules can target specific user preferences (aesthetics, occasions, categories)
4. **Freshness**: Expired content is automatically filtered out
5. **View Status**: Stories show unviewed ones first

## Content Expiration

- Stories have `starts_at` and `expires_at` timestamps
- Modules have time-based relevance (e.g., seasonal edits)
- Expired content is automatically filtered from API responses
- Frontend should respect `expires_at` for countdown timers

## Performance Tips

1. **Use Complete Feed Endpoint**: `/api/v1/newsfeed` fetches stories + modules in one request
2. **Pagination**: Use `limit` and `offset` for infinite scroll
3. **Cache Stories**: Stories don't change frequently, cache for 5-10 minutes
4. **Track Interactions**: Send interaction events asynchronously
5. **Prefetch Items**: When module enters viewport, prefetch items for smooth scrolling
