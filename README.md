# Muse Shopping Backend API

Personalized fashion shopping aggregator backend built with Node.js, Express, and PostgreSQL.

## Overview

Muse Shopping is a backend API for a personalized fashion shopping platform that aggregates multiple brands and stores, providing users with:
- Personalized recommendations based on style preferences
- Price comparison across retailers
- Brand/store following functionality
- Fashion preference management for AI-powered personalization

## Tech Stack

- **Runtime**: Node.js 20.x
- **Framework**: Express.js
- **Database**: PostgreSQL 16
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting

## Prerequisites

- Node.js 20.x or higher
- PostgreSQL 16.x or higher
- npm 10.x or higher

## Installation

1. **Clone the repository**
```bash
cd /Users/hannahschlacter/Desktop/muse-shopping
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your database credentials and JWT secrets
```

4. **Create database**
```bash
# The database should already be created. If not:
createdb muse_shopping_dev
```

5. **Run migrations**
```bash
npm run migrate
```

6. **Seed database (optional)**
```bash
npm run seed
```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000` by default.

## API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication Endpoints

#### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123!",
  "full_name": "John Doe",
  "username": "johndoe" (optional)
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "username": "johndoe",
      "full_name": "John Doe",
      "is_verified": false
    },
    "tokens": {
      "access_token": "eyJhbGc...",
      "refresh_token": "eyJhbGc...",
      "expires_in": 3600
    }
  },
  "message": "Registration successful"
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123!"
}
```

#### Refresh Token
```http
POST /api/v1/auth/refresh-token
Content-Type: application/json

{
  "refresh_token": "eyJhbGc..."
}
```

#### Logout
```http
POST /api/v1/auth/logout
Content-Type: application/json

{
  "refresh_token": "eyJhbGc..."
}
```

#### Change Password
```http
PATCH /api/v1/auth/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "current_password": "Password123!",
  "new_password": "NewPassword456!"
}
```

### User Profile Endpoints

All user endpoints require authentication (Bearer token).

#### Get Current User Profile
```http
GET /api/v1/users/me
Authorization: Bearer <access_token>
```

#### Update User Info
```http
PUT /api/v1/users/me
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "username": "newusername",
  "full_name": "New Name",
  "profile_image_url": "https://..."
}
```

#### Update User Profile
```http
PUT /api/v1/users/me/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "bio": "Fashion enthusiast",
  "location": "New York, NY",
  "style_preferences": {},
  "size_preferences": {
    "tops": "M",
    "bottoms": "8"
  },
  "budget_range": {
    "min": 50,
    "max": 300
  }
}
```

#### Delete Account
```http
DELETE /api/v1/users/me
Authorization: Bearer <access_token>
```

### Brand Endpoints

#### Get All Brands
```http
GET /api/v1/brands?page=1&limit=20&category=sustainable&price_tier=mid&search=everlane
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `category` (optional): Filter by category
- `price_tier` (optional): Filter by price tier
- `search` (optional): Search by name/description

#### Get Brand by ID
```http
GET /api/v1/brands/:id
```

#### Follow Brand
```http
POST /api/v1/brands/follow
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "brand_id": 1,
  "notification_enabled": true
}
```

#### Unfollow Brand
```http
DELETE /api/v1/brands/follow/:brandId
Authorization: Bearer <access_token>
```

#### Get Followed Brands
```http
GET /api/v1/brands/following/me?page=1&limit=20
Authorization: Bearer <access_token>
```

### Fashion Preferences Endpoints

All preferences endpoints require authentication.

#### Get Fashion Preferences
```http
GET /api/v1/preferences
Authorization: Bearer <access_token>
```

#### Update Fashion Preferences (Full Replace)
```http
PUT /api/v1/preferences
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "preferred_colors": ["black", "white", "navy"],
  "preferred_styles": ["minimalist", "contemporary"],
  "preferred_categories": ["tops", "outerwear"],
  "avoided_materials": ["polyester"],
  "fit_preferences": {
    "tops": "regular",
    "bottoms": "slim"
  },
  "occasions": ["work", "casual"]
}
```

#### Partial Update Fashion Preferences
```http
PATCH /api/v1/preferences
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "preferred_colors": ["black", "white", "navy", "olive"]
}
```

### Health Check
```http
GET /api/v1/health
```

## Database Schema

### Users
- Core authentication and account information
- Fields: email, password_hash, username, full_name, is_verified, is_active

### User Profiles
- Extended profile data
- JSONB fields for flexible style, size, and budget preferences

### Brands
- Store and brand information
- Fields: name, slug, category, price_tier, website_url

### User Brand Follows
- Many-to-many relationship between users and brands
- Tracks following relationships and notification preferences

### User Fashion Preferences
- Detailed fashion attributes for personalization
- JSONB arrays for colors, styles, categories, materials, occasions

### Refresh Tokens
- JWT refresh token management for secure authentication

## Security Features

- **Password Hashing**: Bcrypt with 12 rounds
- **JWT Authentication**: Short-lived access tokens (1h) + long-lived refresh tokens (7d)
- **Rate Limiting**:
  - Global: 100 requests per 15 minutes
  - Auth: 5 login attempts per 15 minutes
  - Registration: 3 per hour per IP
- **Input Validation**: Joi schemas for all endpoints
- **SQL Injection Prevention**: Parameterized queries only
- **Security Headers**: Helmet.js
- **CORS**: Configurable origins

## Development Scripts

```bash
npm run dev          # Start development server with nodemon
npm start            # Start production server
npm run migrate      # Run database migrations
npm run seed         # Seed database with sample data
npm test             # Run tests (when implemented)
npm run lint         # Run ESLint
npm run lint:fix     # Fix linting issues
```

## Error Handling

All API responses follow a standard format:

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": { ... } // Only in development mode
  }
}
```

**Error Codes:**
- `VALIDATION_ERROR` (400): Request validation failed
- `AUTHENTICATION_ERROR` (401): Authentication failed
- `AUTHORIZATION_ERROR` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `CONFLICT` (409): Resource already exists
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error

## Testing

Example API test using cURL:

```bash
# Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!","full_name":"Test User"}'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}'

# Get profile (replace TOKEN with actual access token)
curl -X GET http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer TOKEN"

# Get brands
curl -X GET "http://localhost:3000/api/v1/brands?limit=10"
```

## Future Enhancements

### Immediate (Next 4-8 weeks)
- Email verification integration
- Profile image upload (S3/Cloudinary)
- Item catalog (products table)
- Favorites/hearts system
- Shopping cart functionality

### Medium-Term (Next 3-4 months)
- Price monitoring and alerts
- Recommendation engine (collaborative + content-based filtering)
- Instagram OAuth integration
- Discovery feed (influencer content)

### Advanced (6+ months)
- Real-time features (WebSocket for live drops)
- Image recognition for fashion attributes
- Production deployment (Docker, CI/CD)
- Comprehensive testing suite
- API documentation (Swagger/OpenAPI)

## Project Structure

```
muse-shopping/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Request handlers
│   ├── middleware/     # Custom middleware
│   ├── models/         # Database models
│   ├── routes/         # Route definitions
│   ├── services/       # Business logic
│   ├── utils/          # Utility functions
│   ├── db/             # Database related files
│   └── server.js       # Application entry point
├── scripts/            # Utility scripts
├── tests/              # Test files
└── logs/               # Application logs
```

## License

ISC

## Contact

For questions or support, please create an issue in the repository.
