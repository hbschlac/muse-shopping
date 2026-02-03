# Muse Shopping Platform

Muse is a unified fashion shopping platform that allows users to discover and purchase items from multiple retailers in a single, seamless experience.

## Key Features

### 🛍️ Multi-Store Shopping
- Shop from Target, Walmart, Nordstrom, and more in one app
- Unified cart experience across multiple retailers
- Single checkout for multiple stores

### 🔐 OAuth Integration
- Connect retailer accounts once, shop seamlessly forever
- Retailers remain merchant of record (not Muse)
- Preserve store benefits (free shipping, rewards points)
- Credit card shows retailer name (e.g., "NORDSTROM" not "MUSE")

### 📦 Smart Returns
- Instant return eligibility checking
- One-click return initiation via retailer APIs
- Returns registered in retailer's system
- Visible in both Muse and retailer apps

### 🎯 Personalization
- AI-powered product recommendations
- Instagram integration for style profiling
- Brand discovery based on preferences
- Personalized newsfeed

### 💬 AI Chat Assistant
- Product discovery through conversation
- Style advice and recommendations
- Order tracking and support

### 📊 Experimentation Framework
- A/B testing for features
- Multi-armed bandit optimization
- Analytics and metrics tracking

## Tech Stack

**Backend:**
- Node.js + Express
- PostgreSQL
- OAuth 2.0
- AES-256-GCM encryption

**APIs:**
- Gmail API (email receipt scanning)
- Instagram Graph API (style profiling)
- Retailer Partner APIs (Target, Walmart, Nordstrom)
- Stripe (payment processing infrastructure)

**Security:**
- PCI DSS compliant (no raw card data storage)
- Encrypted OAuth tokens
- CSRF protection
- Rate limiting and input validation

## Project Structure

```
muse-shopping/
├── src/
│   ├── controllers/     # API route handlers
│   ├── services/        # Business logic
│   │   └── retailerAPIs/  # Retailer API clients
│   ├── routes/          # API routes
│   ├── middleware/      # Auth, validation, etc.
│   ├── db/             # Database connection
│   └── utils/          # Helpers and utilities
├── migrations/         # Database migrations
├── public/            # Static files
├── scripts/           # Utility scripts
└── docs/              # Documentation
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/muse-shopping.git
cd muse-shopping
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. Run database migrations:
```bash
npm run migrate
```

5. Start the development server:
```bash
npm run dev
```

## Environment Variables

See `.env.example` for required environment variables. Key variables include:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens
- `ENCRYPTION_KEY` - For OAuth token encryption
- `GOOGLE_CLIENT_ID/SECRET` - Gmail API credentials
- `META_APP_ID/SECRET` - Instagram API credentials
- Retailer OAuth credentials (Target, Walmart, Nordstrom)

## Deployment

This project is designed to deploy on Vercel:

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy!

Database should be hosted separately (e.g., Supabase, Railway, or your own PostgreSQL instance).

## Architecture

### OAuth Checkout Flow
```
User → Muse (Platform) → Retailer API → Retailer (Merchant)
                              ↓
                         Order Created
                         (in retailer's system)
```

### Key Principles
- **Muse is a PLATFORM, not a MERCHANT**
- Retailers process all payments
- Orders exist in retailer systems
- Muse maintains references for display
- No PCI compliance burden on Muse

## Documentation

- [OAuth Checkout Architecture](OAUTH_CHECKOUT_ARCHITECTURE.md)
- [Return Experience Design](RETURN_EXPERIENCE_DESIGN.md)
- [OAuth Checkout Complete](OAUTH_CHECKOUT_COMPLETE.md)
- [Security Implementation](SECURITY_SUMMARY.md)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout

### Store Connections (OAuth)
- `GET /api/store-connections` - Get user's connected stores
- `POST /api/store-connections/:storeId/connect` - Initiate OAuth flow
- `DELETE /api/store-connections/:storeId` - Disconnect store

### Shopping
- `GET /api/products` - Search products
- `POST /api/cart/items` - Add to cart
- `POST /api/checkout` - Checkout

### Returns
- `GET /api/returns/eligibility/:orderId` - Check return eligibility
- `POST /api/returns` - Initiate return

### Newsfeed
- `GET /api/newsfeed` - Get personalized feed
- `POST /api/newsfeed/:itemId/interact` - Track interactions

### Chat
- `POST /api/chat/message` - Send message to AI assistant
- `GET /api/chat/history` - Get conversation history

## Contributing

This is a proprietary project. Contact the team for contribution guidelines.

## License

Proprietary - All rights reserved

## Contact

For questions or support, contact the Muse team.
