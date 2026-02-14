# Waitlist Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Run the Migration

```bash
# Make sure your database is running
npm run dev

# In another terminal, run migrations
node run-migrations.js
```

This creates the `waitlist_signups` table and all necessary functions.

### 2. Start the Servers

```bash
# Backend (if not already running)
npm run dev

# Frontend (in another terminal)
cd frontend
npm run dev
```

### 3. Test the Waitlist

Open your browser:
- **Join Waitlist:** http://localhost:3000/waitlist
- **Check Status:** http://localhost:3000/waitlist/status

## 🎯 Quick Test Commands

### Test Backend API

```bash
# Join waitlist
curl -X POST http://localhost:3001/api/waitlist/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "first_name": "Test",
    "last_name": "User",
    "interest_categories": ["Dresses", "Shoes"],
    "favorite_brands": ["Nike", "Zara"],
    "price_range_preference": "mid-range"
  }'

# Check status
curl "http://localhost:3001/api/waitlist/status?email=test@example.com"
```

### Test from Frontend

1. Go to http://localhost:3000/waitlist
2. Fill out the form with:
   - Email: your-email@example.com
   - Name: Your Name
   - Select some interest categories
   - Add favorite brands (comma-separated)
   - Choose a price range
3. Click "Join the Waitlist"
4. You should see success screen with your position

## 📊 Admin Features (Requires Auth)

### Get Statistics

```bash
curl -X GET http://localhost:3001/api/waitlist/admin/statistics \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

### View Waitlist

```bash
curl -X GET "http://localhost:3001/api/waitlist/admin/list?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

### Send Invites to Top 10

```bash
curl -X POST http://localhost:3001/api/waitlist/admin/batch-invite \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"count": 10}'
```

## 🔍 Database Queries

```sql
-- View all waitlist signups
SELECT id, email, first_name, status, priority_score, position, created_at
FROM waitlist_signups
ORDER BY priority_score DESC;

-- Get waitlist analytics
SELECT * FROM waitlist_analytics ORDER BY signup_date DESC LIMIT 7;

-- Check conversion rate
SELECT
  COUNT(*) FILTER (WHERE status = 'invited') as invited,
  COUNT(*) FILTER (WHERE status = 'converted') as converted,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'converted')::NUMERIC /
    NULLIF(COUNT(*) FILTER (WHERE status = 'invited'), 0) * 100,
    2
  ) as conversion_rate_pct
FROM waitlist_signups;
```

## 🎨 UTM Tracking

The waitlist automatically captures UTM parameters from the URL:

```
http://localhost:3000/waitlist?utm_source=instagram&utm_campaign=launch&ref=FRIEND123
```

This will track:
- utm_source: instagram
- utm_campaign: launch
- referral_code: FRIEND123

All stored in the database for analytics!

## ✅ Verify Integration with Auth

1. Sign up a user on waitlist:
```bash
curl -X POST http://localhost:3001/api/waitlist/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "newuser@test.com", "first_name": "New", "interest_categories": ["Dresses"]}'
```

2. Register that user:
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "newuser@test.com", "password": "Test123!", "full_name": "New User"}'
```

3. Check database:
```sql
-- User should be marked as converted
SELECT status, user_id FROM waitlist_signups WHERE email = 'newuser@test.com';

-- User's shopper_profile should have seeded interests
SELECT interests FROM shopper_profiles WHERE user_id = (
  SELECT user_id FROM waitlist_signups WHERE email = 'newuser@test.com'
);
```

## 🎉 What's Included

### Database
- ✅ waitlist_signups table
- ✅ Priority scoring function
- ✅ Analytics view
- ✅ Automatic timestamp updates
- ✅ Indexes for performance

### Backend
- ✅ WaitlistService (business logic)
- ✅ WaitlistController (HTTP handlers)
- ✅ Routes with validation
- ✅ Integration with auth system
- ✅ Personalization seeding

### Frontend
- ✅ Landing page at /waitlist
- ✅ Status page at /waitlist/status
- ✅ TypeScript API client
- ✅ Beautiful UI with gradients
- ✅ Multi-step form
- ✅ Success/error states
- ✅ UTM parameter capture

## 🔧 Customization

### Change Priority Scoring

Edit `migrations/063_create_waitlist.sql`:

```sql
CREATE OR REPLACE FUNCTION calculate_waitlist_priority(...)
-- Adjust the score calculations to your needs
```

### Customize Form Fields

Edit `frontend/app/waitlist/page.tsx`:

```typescript
const interestCategories = [
  'Dresses',
  'Tops',
  // Add or remove categories
];
```

### Add Email Notifications

In `src/controllers/waitlistController.js`:

```javascript
static async sendInvite(req, res, next) {
  const signup = await WaitlistService.markAsInvited(id);

  // Add your email service here
  await emailService.sendWaitlistInvite(
    signup.email,
    signup.first_name
  );

  res.json(successResponse(signup));
}
```

## 🐛 Troubleshooting

### "Email already registered"
This email is already on the waitlist. Check status instead.

### "Failed to join waitlist"
- Check backend is running (port 3001)
- Check database connection
- View backend logs for errors

### No data showing in frontend
- Check API endpoint in `.env`: `NEXT_PUBLIC_API_URL`
- Open browser console for errors
- Verify CORS settings

### Migration fails
- Ensure PostgreSQL is running
- Check connection string in `.env`
- Verify you have CREATE TABLE permissions

## 📚 Next Steps

1. **Email Integration**: Connect to SendGrid/Mailgun
2. **Admin Dashboard**: Build UI for managing waitlist
3. **Referral Program**: Track and reward referrals
4. **A/B Testing**: Test different invite strategies
5. **Social Sharing**: Add viral loop features

## 🎯 Key Files

```
Backend:
- migrations/063_create_waitlist.sql
- src/services/waitlistService.js
- src/controllers/waitlistController.js
- src/routes/waitlistRoutes.js
- src/routes/index.js (routes registered)
- src/services/authService.js (integration)

Frontend:
- frontend/app/waitlist/page.tsx (signup form)
- frontend/app/waitlist/status/page.tsx (status check)
- frontend/lib/api/waitlist.ts (API client)

Documentation:
- WAITLIST_SYSTEM.md (detailed docs)
- WAITLIST_QUICK_START.md (this file)
```

## 💡 Pro Tips

1. **Priority Boost**: Users with referral codes get +20 points
2. **Engagement Score**: More interests = higher priority
3. **Position Updates**: Runs in real-time, no caching
4. **Fraud Prevention**: IP and user agent logged
5. **Analytics Ready**: Built-in views for reporting

---

**You're all set!** 🎉 The waitlist is ready to accept signups and integrate with your personalization engine.
