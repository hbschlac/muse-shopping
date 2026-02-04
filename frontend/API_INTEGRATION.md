# Muse Shopping - Frontend API Integration

## Overview

This document describes how the Muse Shopping frontend integrates with the backend API services.

## Backend API

- **Base URL**: `http://localhost:3000/api/v1` (development)
- **API Version**: v1
- **Authentication**: JWT Bearer tokens
- **Framework**: Express.js with PostgreSQL database

## Environment Setup

### Required Environment Variables

Create a `.env.local` file in the frontend directory:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id

# App Configuration
NEXT_PUBLIC_APP_NAME=Muse
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

## API Client Architecture

### Core Client (`/lib/api/client.ts`)

The API client provides a centralized HTTP request handler with:
- Automatic JWT token management
- Request/response interceptors
- Error handling with custom `APIError` class
- TypeScript type safety

### API Services

All API services are organized by domain:

| Service | File | Purpose |
|---------|------|---------|
| Authentication | `/lib/api/auth.ts` | User registration, login, OAuth |
| Newsfeed | `/lib/api/newsfeed.ts` | Hero campaigns, stories, brand modules |
| Products | `/lib/api/products.ts` | Product search, details, recommendations |
| Brands | `/lib/api/brands.ts` | Brand catalog and favorites |
| Cart | `/lib/api/cart.ts` | Shopping cart operations |
| Chat | `/lib/api/chat.ts` | AI stylist chat interface |
| Saves | `/lib/api/saves.ts` | Saved items management |
| Retailers | `/lib/api/retailers.ts` | Retailer OAuth, product search (Target, Walmart, Nordstrom) |

## React Hooks

### useAuth Hook

```typescript
import { useAuth } from '@/lib/hooks/useAuth';

function MyComponent() {
  const { user, isAuthenticated, loading, error } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please log in</div>;

  return <div>Welcome, {user.first_name}!</div>;
}
```

### useNewsfeed Hook

```typescript
import { useNewsfeed } from '@/lib/hooks/useNewsfeed';

function MyComponent() {
  const { data, loading, error } = useNewsfeed({
    userId: user?.id,
    enabled: true
  });

  if (loading) return <div>Loading feed...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data.brand_modules.map(module => (
        <BrandModule key={module.id} module={module} />
      ))}
    </div>
  );
}
```

## API Endpoints Used

### Newsfeed

```typescript
// Get personalized newsfeed
GET /newsfeed?user_id={userId}

// Get stories
GET /newsfeed/stories

// Track analytics
POST /newsfeed/stories/view
POST /newsfeed/modules/analytics
```

### Products

```typescript
// Search products
GET /products/search?q={query}&brands={brands}&price_min={min}&price_max={max}

// Get product details
GET /products/{productId}

// Get recommendations
GET /products/recommendations?user_id={userId}&limit={limit}

// Get real-time data
GET /products/{productId}/realtime

// Get checkout link
GET /products/{productId}/checkout-link?size={size}&color={color}
```

### Authentication

```typescript
// Register
POST /auth/register
Body: { email, password, first_name, last_name }

// Login
POST /auth/login
Body: { email, password }

// Refresh token
POST /auth/refresh-token
Body: { refreshToken }

// Google OAuth
GET /auth/google
POST /auth/google/callback
```

### Cart

```typescript
// Get cart
GET /cart

// Add item
POST /cart/items
Body: { product_id, quantity, size, color }

// Update item
PUT /cart/items/{itemId}
Body: { quantity }

// Remove item
DELETE /cart/items/{itemId}
```

### Brands

```typescript
// Get all brands
GET /brands

// Get brand by ID
GET /brands/{brandId}

// Search brands
GET /brands/search?q={query}

// Get favorites
GET /brands/favorites?user_id={userId}

// Add favorite
POST /brands/favorites
Body: { brand_id }
```

### Chat

```typescript
// Send message
POST /chat
Body: { message, history[], context, session_id }

// Get history
GET /chat/sessions/{sessionId}/messages

// Submit feedback
POST /chat/feedback
Body: { session_id, message_id, rating, feedback }
```

### Saved Items

```typescript
// Get saved items
GET /items/saved

// Save product
POST /items/saved
Body: { product_id, notes }

// Unsave product
DELETE /items/saved/{savedItemId}

// Check if saved
GET /items/saved/check/{productId}
```

## Type Definitions

All API types are defined in `/lib/types/api.ts`:

```typescript
// User
interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  onboarding_completed: boolean;
}

// Product
interface Product {
  id: string;
  name: string;
  brand_id: string;
  brand_name: string;
  price: number;
  image_url: string;
  in_stock: boolean;
  retailer_name: string;
}

// Brand Module
interface BrandModule {
  id: string;
  brand: Brand;
  products: Product[];
  is_favorite?: boolean;
}

// And many more...
```

## Authentication Flow

### 1. User Registration/Login

```typescript
import { register, login } from '@/lib/api/auth';

// Register
const response = await register({
  email: 'user@example.com',
  password: 'password123',
  first_name: 'Jane',
  last_name: 'Doe'
});

// Tokens are automatically saved to localStorage
// response.token and response.refreshToken
```

### 2. Authenticated Requests

```typescript
import { api } from '@/lib/api/client';

// Token is automatically included in Authorization header
const cart = await api.get('/cart', { requiresAuth: true });
```

### 3. Token Refresh

```typescript
import { refreshToken } from '@/lib/api/auth';

// Refresh when access token expires
try {
  const newTokens = await refreshToken();
  // New tokens saved automatically
} catch (error) {
  // Redirect to login
}
```

## Error Handling

```typescript
import { APIError } from '@/lib/api/client';

try {
  const product = await getProduct('123');
} catch (error) {
  if (error instanceof APIError) {
    if (error.status === 401) {
      // Unauthorized - redirect to login
    } else if (error.status === 404) {
      // Not found
    } else {
      // Other API error
      console.error(error.message, error.data);
    }
  } else {
    // Network error
    console.error('Network request failed');
  }
}
```

## Analytics Tracking

The newsfeed component automatically tracks:

- Story views: `trackStoryView(storyId)`
- Module interactions: `trackModuleInteraction(moduleId, action)`
  - `view` - When module enters viewport
  - `click` - When product is clicked
  - `scroll` - When carousel is scrolled

## Components Using API

### Newsfeed Component

**File**: `/components/Newsfeed.tsx`

**API Integrations**:
- Fetches newsfeed data with `useNewsfeed()` hook
- Tracks story views and module interactions
- Displays personalized brand modules based on user favorites
- Shows different context for authenticated vs guest users

**Features**:
- Auto-rotating hero campaigns from backend
- Dynamic stories from API
- Brand modules with real product data
- Real-time analytics tracking
- Responsive to user authentication state

### Future Components

**Product Detail Page** (planned):
- `getProduct(productId)` - Product details
- `getRealtimeProductData(productId)` - Live pricing
- `getCheckoutLink(productId)` - Direct retailer checkout
- `saveProduct(productId)` - Save to favorites

**Search Page** (planned):
- `searchProducts(query, filters)` - Product search
- Filter by brands, price, categories, sizes, colors
- Pagination support

**Chat/Muse Page** (planned):
- `sendChatMessage(request)` - AI stylist interaction
- `getChatHistory(sessionId)` - Previous conversations
- Product recommendations from chat

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Files

- `/frontend/__tests__/home.test.tsx` - Home page component tests
- Tests cover:
  - Hero banner rotation
  - Stories row display
  - Search/chat input expansion
  - Brand module rendering
  - Scroll to top button
  - Bottom navigation

## Development Workflow

1. **Start Backend Server**:
   ```bash
   cd /Users/hannahschlacter/Desktop/muse-shopping
   npm run dev
   ```

2. **Start Frontend Dev Server**:
   ```bash
   cd /Users/hannahschlacter/Desktop/muse-shopping/frontend
   npm run dev
   ```

3. **Access Application**:
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:3000/api/v1

## Production Deployment

### Backend
- Deployed on Vercel
- Environment variables configured in Vercel dashboard
- PostgreSQL database (Vercel Postgres or external)

### Frontend
- Next.js app deployed on Vercel
- Set `NEXT_PUBLIC_API_URL` to production API URL
- Configure OAuth credentials for production domains

## Troubleshooting

### CORS Issues
- Ensure backend CORS_ORIGIN includes frontend domain
- Check `/src/app.js` for CORS configuration

### Authentication Issues
- Verify JWT_SECRET matches between frontend and backend
- Check token expiration times
- Ensure tokens are stored in localStorage correctly

### API Connection Issues
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check backend server is running
- Test API endpoints with curl or Postman

## Next Steps

1. ✅ API client architecture
2. ✅ Type definitions
3. ✅ Authentication hooks
4. ✅ Newsfeed integration
5. ⏳ Product detail page integration
6. ⏳ Search page integration
7. ⏳ Chat/Muse page integration
8. ⏳ Cart functionality
9. ⏳ Checkout flow
10. ⏳ User profile and settings
