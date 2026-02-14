# Admin Email System - User Guide

This guide explains how to use the Admin Email System to send emails to shoppers on Muse Shopping.

## Overview

The Admin Email System allows you (as owner/manager/PM) to:
- Send individual emails to specific shoppers
- Send bulk emails to multiple shoppers
- Target shoppers based on criteria (spending, brands purchased, signup date, etc.)
- Track email send history
- View bulk campaign performance

## Setup

### 1. Run the Database Migration

First, run the migration to create the necessary database tables:

```bash
node run-migrations.js
```

### 2. Configure SMTP Settings

Ensure your `.env` file has the following SMTP configuration:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=Muse Shopping <noreply@muse.shopping>
BASE_URL=https://yourdomain.com
```

### 3. Ensure Admin Authentication

Make sure you're authenticated as an admin user when making API calls.

## API Endpoints

All endpoints require admin authentication via Bearer token in the Authorization header.

### 1. Send Email to a Single Shopper

**Endpoint:** `POST /api/v1/admin/emails/send`

**Request Body:**
```json
{
  "userId": 123,
  "subject": "Exclusive Offer Just for You!",
  "heading": "Your Personalized Shopping Deal",
  "body": "<p>We noticed you love sustainable fashion! Here's a 20% discount on eco-friendly brands.</p><p>This offer expires in 48 hours.</p>",
  "buttonText": "Shop Now",
  "buttonUrl": "https://muse.shopping/eco-brands",
  "preheader": "20% off your favorite eco-friendly brands",
  "emailType": "marketing"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "email": "shopper@example.com",
    "userId": 123
  }
}
```

**Field Descriptions:**
- `userId` (required): The ID of the user to send the email to
- `subject` (required): Email subject line
- `heading` (required): Main heading in the email
- `body` (required): Email body content (supports HTML)
- `buttonText` (optional): Call-to-action button text
- `buttonUrl` (optional): Call-to-action button URL
- `preheader` (optional): Preview text shown in email clients (marketing emails only)
- `emailType` (optional): Either `"marketing"` or `"transactional"` (default: `"transactional"`)

---

### 2. Send Bulk Email to Multiple Shoppers

**Endpoint:** `POST /api/v1/admin/emails/send/bulk`

**Request Body:**
```json
{
  "userIds": [123, 456, 789],
  "subject": "New Spring Collection Available",
  "heading": "Spring Into Style",
  "body": "<p>Our new spring collection has arrived! Shop the latest trends in sustainable fashion.</p>",
  "buttonText": "Browse Collection",
  "buttonUrl": "https://muse.shopping/spring-collection",
  "preheader": "Discover the hottest spring trends",
  "emailType": "marketing"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "bulkSendId": 42,
    "total": 3,
    "sent": 3,
    "failed": 0,
    "errors": []
  }
}
```

**Notes:**
- Maximum 1000 users per bulk send
- Emails are sent in batches of 10 with 1-second delays to avoid overwhelming SMTP
- Failed sends are logged individually

---

### 3. Send Email by Criteria (Target Specific Segments)

**Endpoint:** `POST /api/v1/admin/emails/send/criteria`

**Request Body:**
```json
{
  "criteria": {
    "minOrderValue": 100,
    "maxOrderValue": 500,
    "brandIds": [5, 12, 23],
    "signupAfter": "2024-01-01",
    "signupBefore": "2024-12-31"
  },
  "subject": "We Miss You!",
  "heading": "Come Back and Save",
  "body": "<p>We noticed you haven't shopped with us in a while. Here's 15% off your next purchase!</p>",
  "buttonText": "Claim Your Discount",
  "buttonUrl": "https://muse.shopping/welcome-back",
  "emailType": "marketing"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "bulkSendId": 43,
    "total": 156,
    "sent": 156,
    "failed": 0,
    "errors": []
  }
}
```

**Criteria Options:**
- `minOrderValue` (number): Minimum total spent in dollars
- `maxOrderValue` (number): Maximum total spent in dollars
- `brandIds` (array): Array of brand IDs the user has purchased from
- `signupAfter` (string): ISO date string - users who signed up after this date
- `signupBefore` (string): ISO date string - users who signed up before this date

All criteria are optional and can be combined.

---

### 4. Get Email Send History

**Endpoint:** `GET /api/v1/admin/emails/history`

**Query Parameters:**
- `limit` (optional, default: 50): Number of records to return
- `offset` (optional, default: 0): Pagination offset
- `userId` (optional): Filter by specific user ID
- `status` (optional): Filter by status (`"sent"` or `"failed"`)

**Example Request:**
```
GET /api/v1/admin/emails/history?limit=20&status=sent
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1234,
      "user_id": 123,
      "email": "shopper@example.com",
      "full_name": "Jane Doe",
      "subject": "Exclusive Offer Just for You!",
      "email_type": "marketing",
      "status": "sent",
      "error_message": null,
      "sent_at": "2024-02-08T10:30:00.000Z",
      "sent_by_admin_id": 1
    }
  ]
}
```

---

### 5. Get Bulk Send History

**Endpoint:** `GET /api/v1/admin/emails/history/bulk`

**Query Parameters:**
- `limit` (optional, default: 50): Number of records to return
- `offset` (optional, default: 0): Pagination offset

**Example Request:**
```
GET /api/v1/admin/emails/history/bulk?limit=10
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 42,
      "subject": "New Spring Collection Available",
      "email_type": "marketing",
      "total_recipients": 156,
      "emails_sent": 156,
      "emails_failed": 0,
      "sent_by_admin_id": 1,
      "created_at": "2024-02-08T09:00:00.000Z",
      "completed_at": "2024-02-08T09:05:30.000Z"
    }
  ]
}
```

---

## Email Types

### Marketing Emails
- Include unsubscribe link
- Include preheader text for better inbox preview
- Best for: promotions, newsletters, announcements

### Transactional Emails
- No unsubscribe link (legally required to be sent)
- Best for: order confirmations, password resets, account updates

---

## Usage Examples

### Example 1: Welcome Back Campaign for Inactive Users

Target users who signed up more than 6 months ago but have spent less than $100:

```bash
curl -X POST https://api.muse.shopping/api/v1/admin/emails/send/criteria \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "criteria": {
      "maxOrderValue": 100,
      "signupBefore": "2023-08-01"
    },
    "subject": "We Miss You! Here's 20% Off",
    "heading": "Come Back and Save",
    "body": "<p>It's been a while since we've seen you! We'd love to have you back.</p><p>Use code <strong>WELCOME20</strong> for 20% off your next purchase.</p>",
    "buttonText": "Start Shopping",
    "buttonUrl": "https://muse.shopping/welcome-back",
    "preheader": "20% off just for you",
    "emailType": "marketing"
  }'
```

### Example 2: VIP Customer Appreciation

Target high-value customers (spent over $500):

```bash
curl -X POST https://api.muse.shopping/api/v1/admin/emails/send/criteria \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "criteria": {
      "minOrderValue": 500
    },
    "subject": "Exclusive VIP Early Access",
    "heading": "You're Invited: VIP Preview",
    "body": "<p>As one of our most valued customers, you get exclusive early access to our new collection.</p><p>Shop before anyone else and enjoy 25% off!</p>",
    "buttonText": "Shop VIP Preview",
    "buttonUrl": "https://muse.shopping/vip-preview",
    "preheader": "25% off early access - VIP only",
    "emailType": "marketing"
  }'
```

### Example 3: Brand-Specific Announcement

Target users who have purchased from specific brands (e.g., brand IDs 5, 12, 23):

```bash
curl -X POST https://api.muse.shopping/api/v1/admin/emails/send/criteria \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "criteria": {
      "brandIds": [5, 12, 23]
    },
    "subject": "New Arrivals from Your Favorite Brands",
    "heading": "Fresh Styles Just Dropped",
    "body": "<p>We just added new items from brands you love!</p><p>Check out the latest arrivals and find your next favorite piece.</p>",
    "buttonText": "See New Arrivals",
    "buttonUrl": "https://muse.shopping/new-arrivals",
    "preheader": "New items from your favorite brands",
    "emailType": "marketing"
  }'
```

---

## Best Practices

1. **Test First**: Send to yourself or a test user before bulk sending
2. **Personalization**: Use the shopper's name (automatically included as "Hi {userName}")
3. **Clear CTAs**: Always include a clear call-to-action button
4. **Mobile-Friendly**: Emails are automatically mobile-responsive
5. **Subject Lines**: Keep subject lines under 50 characters for better mobile display
6. **Preheader Text**: Use compelling preheader text for marketing emails
7. **Timing**: Consider time zones when sending bulk emails
8. **Segmentation**: Use criteria targeting for better engagement
9. **Track Performance**: Review send history to identify failed emails

---

## Troubleshooting

### Emails Not Sending

1. Check SMTP configuration in `.env`
2. Verify admin authentication token
3. Check server logs for detailed error messages
4. Ensure email service is enabled (not in dev mode)

### Failed Sends

- Check the email history endpoint to see error messages
- Verify user email addresses are valid
- Check SMTP rate limits

### Bulk Send Taking Too Long

- Bulk sends process in batches with delays to prevent SMTP throttling
- For 1000+ users, consider breaking into multiple smaller campaigns
- Monitor the bulk send history to see completion status

---

## Database Schema

The system creates two tables:

### admin_email_logs
Tracks individual email sends with status and error information.

### admin_email_bulk_sends
Tracks bulk email campaigns with aggregate statistics.

Both tables reference the admin user who initiated the send.
