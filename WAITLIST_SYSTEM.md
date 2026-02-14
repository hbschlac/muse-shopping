# Waitlist System Documentation

## Overview

The Muse Shopping waitlist system allows users to sign up before the platform is fully launched, collecting valuable preference data that integrates with the personalization engine when they eventually create an account.

## Architecture

### Database Schema

**Table: `waitlist_signups`**
- Stores email, name, phone, and preference data
- Tracks signup status (pending, invited, converted, unsubscribed)
- Includes priority scoring system for determining invite order
- Captures UTM parameters and referral codes for analytics
- Stores IP and user agent for fraud prevention

**Key Features:**
- Priority score calculation based on engagement and referrals
- Automatic conversion tracking when users sign up
- Integration with personalization system (style_profiles, shopper_profiles)

### Backend Components

#### Service Layer (`src/services/waitlistService.js`)
- `addSignup()` - Add new waitlist entry with priority scoring
- `findByEmail()` - Lookup existing waitlist entries
- `getWaitlistPosition()` - Calculate position in queue
- `markAsInvited()` - Track when invites are sent
- `markAsConverted()` - Link waitlist entry to user account
- `seedUserPersonalization()` - Transfer preferences to user profile
- `getStatistics()` - Analytics for admin dashboard

#### Controller Layer (`src/controllers/waitlistController.js`)
- Public endpoints for signup and status checking
- Admin endpoints for management and bulk invites
- Input validation and error handling

#### Routes (`src/routes/waitlistRoutes.js`)
- **Public Routes:**
  - `POST /waitlist/signup` - Join waitlist
  - `GET /waitlist/status` - Check position by email
  - `POST /waitlist/unsubscribe` - Remove from waitlist

- **Admin Routes (require auth):**
  - `GET /waitlist/admin/statistics` - View stats
  - `GET /waitlist/admin/list` - Paginated list
  - `GET /waitlist/admin/:id` - Get specific signup
  - `PATCH /waitlist/admin/:id` - Update signup
  - `POST /waitlist/admin/:id/invite` - Send invite
  - `POST /waitlist/admin/batch-invite` - Bulk invite top priority

### Frontend Components

#### Landing Page (`frontend/app/waitlist/page.tsx`)
- Beautiful gradient design matching Muse brand
- Multi-step form collecting:
  - Email, name, phone
  - Interest categories (Dresses, Tops, Shoes, etc.)
  - Favorite brands
  - Price range preference
- UTM parameter capture for tracking
- Success state showing position in line
- Error handling with retry

#### Status Page (`frontend/app/waitlist/status/page.tsx`)
- Check waitlist position by email
- Shows current status and priority score
- Call-to-action based on status

#### API Client (`frontend/lib/api/waitlist.ts`)
- TypeScript types for type safety
- `joinWaitlist()` - Submit signup
- `checkWaitlistStatus()` - Get current status
- `unsubscribeFromWaitlist()` - Opt out

## Priority Scoring System

The `calculate_waitlist_priority()` SQL function assigns scores:
- **Base score:** 10 points (everyone)
- **Referral code:** +20 points
- **Interest categories:** +5 points per category
- **Favorite brands:** +3 points per brand

Higher scores = earlier access. This incentivizes users to:
1. Share referral codes
2. Provide detailed preferences
3. Show genuine interest

## Integration with Personalization

When a waitlist user creates an account (`authService.registerUser()`):
1. System checks for waitlist entry by email
2. If found, marks as "converted" and links to user_id
3. Calls `WaitlistService.seedUserPersonalization()` to:
   - Update `shopper_profiles` with favorite brands
   - Initialize `style_profiles` with interest categories
   - Provide better recommendations from day 1

## Usage

### Running Migrations

```bash
# Run the migration to create waitlist table
node run-migrations.js
```

### Accessing the Waitlist

**Users:**
- Join: `https://yourdomain.com/waitlist`
- Check status: `https://yourdomain.com/waitlist/status`

**Admin:**
- Stats: `GET /api/waitlist/admin/statistics`
- Manage: `GET /api/waitlist/admin/list?page=1&limit=50`

### Sending Invites

```bash
# Via API (admin authenticated)
curl -X POST https://yourdomain.com/api/waitlist/admin/batch-invite \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"count": 10}'
```

This will:
1. Select top 10 priority pending signups
2. Mark them as "invited"
3. Update last_email_sent_at timestamp
4. TODO: Actually send invite emails (integrate with email service)

## Analytics Views

The `waitlist_analytics` view provides daily stats:
- Total signups per day
- Invite and conversion counts
- Conversion rate percentage
- UTM source tracking

```sql
SELECT * FROM waitlist_analytics ORDER BY signup_date DESC LIMIT 30;
```

## Future Enhancements

### Email Integration
- Welcome email on signup
- Invite email with unique access code
- Reminder emails for inactive signups
- Weekly position update emails

### Referral System
- Generate unique referral codes per user
- Track referrals and reward referrers
- Move referrers up in line when referrals sign up

### Admin Dashboard
- Visual analytics (charts, graphs)
- Bulk operations (tag, invite, export)
- Segmentation by preferences
- A/B testing for invite strategies

### Social Sharing
- "Share to Twitter/Instagram" buttons
- Pre-filled social posts with referral links
- Viral loop mechanics

## API Examples

### Join Waitlist
```typescript
import { joinWaitlist } from '@/lib/api/waitlist';

const signup = await joinWaitlist({
  email: 'user@example.com',
  first_name: 'Jane',
  last_name: 'Doe',
  interest_categories: ['Dresses', 'Shoes'],
  favorite_brands: ['Nike', 'Zara'],
  price_range_preference: 'mid-range',
  utm_source: 'instagram',
  utm_campaign: 'launch_2024'
});

console.log(`You're #${signup.position} in line!`);
```

### Check Status
```typescript
import { checkWaitlistStatus } from '@/lib/api/waitlist';

const status = await checkWaitlistStatus('user@example.com');
console.log(`Status: ${status.status}, Position: ${status.position}`);
```

## Security Considerations

- Email validation on both client and server
- Rate limiting on signup endpoint (prevent spam)
- IP address tracking for fraud detection
- Unique email constraint prevents duplicates
- Admin endpoints require authentication
- Input sanitization via express-validator

## Performance

- GIN indexes on JSONB columns for fast queries
- Efficient position calculation via subquery
- Pagination for large waitlist views
- Caching recommendations for analytics views

## Testing

```bash
# Test waitlist signup
curl -X POST http://localhost:3001/api/waitlist/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "first_name": "Test",
    "interest_categories": ["Dresses"],
    "favorite_brands": ["Nike"]
  }'

# Check status
curl "http://localhost:3001/api/waitlist/status?email=test@example.com"
```

## Migration File

Location: `migrations/063_create_waitlist.sql`

Run with:
```bash
node run-migrations.js
# or
./run-production-migrations.sh
```

## Summary

The waitlist system is production-ready and includes:
✅ Complete database schema with priority scoring
✅ Backend API with validation and error handling
✅ Beautiful frontend UI with multi-step form
✅ Integration with personalization engine
✅ Admin tools for management
✅ Analytics and reporting
✅ Type-safe TypeScript API client
✅ Security and performance optimizations

Next steps:
- Integrate with email service for automated invites
- Build admin dashboard UI
- Add referral tracking
- Implement social sharing
