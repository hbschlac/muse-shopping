# Admin Email System - Quick Examples

Here are quick copy-paste examples to get started sending emails to shoppers.

## Prerequisites

You need an admin authentication token. Get this by logging in as an admin user.

```bash
# Example: Login as admin (replace with your actual credentials)
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@muse.shopping",
    "password": "your_admin_password"
  }'

# Save the token from the response
export ADMIN_TOKEN="your_token_here"
```

---

## Example 1: Send Email to One Shopper

Send a personalized email to user ID 123:

```bash
curl -X POST http://localhost:5000/api/v1/admin/emails/send \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 123,
    "subject": "Your Weekly Style Picks",
    "heading": "Curated Just for You",
    "body": "<p>Based on your recent activity, we think you'll love these new arrivals!</p><p>Shop now and get free shipping on orders over $50.</p>",
    "buttonText": "Shop Your Picks",
    "buttonUrl": "https://muse.shopping/curated",
    "preheader": "New arrivals selected just for you",
    "emailType": "marketing"
  }'
```

---

## Example 2: Send to Multiple Shoppers

Send the same email to users 123, 456, and 789:

```bash
curl -X POST http://localhost:5000/api/v1/admin/emails/send/bulk \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": [123, 456, 789],
    "subject": "Flash Sale: 24 Hours Only!",
    "heading": "Don't Miss Out",
    "body": "<p>Our biggest sale of the season starts now!</p><p>Get up to 50% off on select items. Sale ends tomorrow at midnight.</p>",
    "buttonText": "Shop the Sale",
    "buttonUrl": "https://muse.shopping/flash-sale",
    "preheader": "Up to 50% off - ends tomorrow!",
    "emailType": "marketing"
  }'
```

---

## Example 3: Target High-Value Customers

Send to customers who have spent more than $500:

```bash
curl -X POST http://localhost:5000/api/v1/admin/emails/send/criteria \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "criteria": {
      "minOrderValue": 500
    },
    "subject": "Exclusive VIP Preview",
    "heading": "You're Invited: VIP Early Access",
    "body": "<p>Thank you for being a valued Muse customer!</p><p>As a VIP, you get exclusive early access to our new collection plus an extra 25% off.</p><p>Valid for the next 48 hours only.</p>",
    "buttonText": "Shop VIP Preview",
    "buttonUrl": "https://muse.shopping/vip",
    "preheader": "Your exclusive VIP early access starts now",
    "emailType": "marketing"
  }'
```

---

## Example 4: Re-engagement Campaign

Target users who signed up over 6 months ago but have spent less than $100:

```bash
curl -X POST http://localhost:5000/api/v1/admin/emails/send/criteria \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "criteria": {
      "maxOrderValue": 100,
      "signupBefore": "2023-08-01"
    },
    "subject": "We Miss You! Here's 20% Off",
    "heading": "Come Back to Muse",
    "body": "<p>It's been a while since we've seen you!</p><p>We've added tons of new brands and items you'll love.</p><p>Use code <strong>WELCOME20</strong> for 20% off your next purchase.</p>",
    "buttonText": "Start Shopping",
    "buttonUrl": "https://muse.shopping/welcome-back",
    "preheader": "We miss you! 20% off your next order",
    "emailType": "marketing"
  }'
```

---

## Example 5: Brand-Specific Campaign

Target users who have purchased from specific brands (replace brand IDs with real ones):

```bash
curl -X POST http://localhost:5000/api/v1/admin/emails/send/criteria \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "criteria": {
      "brandIds": [5, 12, 23]
    },
    "subject": "New Drops from Your Favorite Brands",
    "heading": "Fresh Styles Just Arrived",
    "body": "<p>Great news! The brands you love just restocked.</p><p>Check out the latest arrivals before they sell out.</p>",
    "buttonText": "See What's New",
    "buttonUrl": "https://muse.shopping/new-arrivals",
    "preheader": "New items from brands you love",
    "emailType": "marketing"
  }'
```

---

## Example 6: New Customer Welcome Series

Target users who signed up in the last 7 days:

```bash
curl -X POST http://localhost:5000/api/v1/admin/emails/send/criteria \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "criteria": {
      "signupAfter": "2024-02-01"
    },
    "subject": "Welcome to Muse! Here's How to Get Started",
    "heading": "Welcome to Your Personalized Shopping Experience",
    "body": "<p>We're so excited to have you here!</p><p>Here are some tips to make the most of Muse:</p><ul><li>Follow your favorite brands</li><li>Save items to your wishlist</li><li>Get personalized recommendations</li></ul><p>Plus, enjoy <strong>15% off</strong> your first purchase with code NEWMUSE15.</p>",
    "buttonText": "Start Exploring",
    "buttonUrl": "https://muse.shopping/discover",
    "preheader": "Get started with 15% off your first order",
    "emailType": "marketing"
  }'
```

---

## Example 7: Check Email History

View recent emails you've sent:

```bash
# Get last 20 emails sent
curl -X GET "http://localhost:5000/api/v1/admin/emails/history?limit=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Get emails for a specific user
curl -X GET "http://localhost:5000/api/v1/admin/emails/history?userId=123" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Get only failed emails
curl -X GET "http://localhost:5000/api/v1/admin/emails/history?status=failed" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Example 8: Check Bulk Campaign Performance

View your bulk email campaigns:

```bash
curl -X GET "http://localhost:5000/api/v1/admin/emails/history/bulk?limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Testing Before Sending to Real Users

**Always test first!** Send to yourself to preview the email:

```bash
# Find your own user ID first
curl -X GET "http://localhost:5000/api/v1/users/me" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Then send a test email to yourself
curl -X POST http://localhost:5000/api/v1/admin/emails/send \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": YOUR_USER_ID,
    "subject": "TEST: Email Preview",
    "heading": "This is a Test Email",
    "body": "<p>This is how the email will look to users.</p>",
    "buttonText": "Test Button",
    "buttonUrl": "https://muse.shopping",
    "emailType": "marketing"
  }'
```

---

## Common Criteria Combinations

### Re-engage dormant users
```json
{
  "criteria": {
    "signupBefore": "2023-06-01",
    "maxOrderValue": 50
  }
}
```

### Target new big spenders
```json
{
  "criteria": {
    "minOrderValue": 200,
    "signupAfter": "2024-01-01"
  }
}
```

### Brand loyalists in a price range
```json
{
  "criteria": {
    "brandIds": [5, 12],
    "minOrderValue": 100,
    "maxOrderValue": 500
  }
}
```

---

## Production vs Development

In development mode (when SMTP is not configured), emails will be logged to the console instead of being sent. Check the server logs to see the email content.

For production, make sure these environment variables are set:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=Muse Shopping <noreply@muse.shopping>
```

---

## Need Help?

- Full documentation: See `ADMIN_EMAIL_GUIDE.md`
- API endpoint: `/api/v1/admin/emails/*`
- All endpoints require admin authentication
