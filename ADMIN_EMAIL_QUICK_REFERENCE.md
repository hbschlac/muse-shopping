# Admin Email System - Quick Reference Card

## 🔗 API Endpoints

Base URL: `/api/v1/admin/emails`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/send` | POST | Send to 1 user |
| `/send/bulk` | POST | Send to multiple users |
| `/send/criteria` | POST | Send by targeting criteria |
| `/history` | GET | View send history |
| `/history/bulk` | GET | View bulk campaigns |

---

## 📝 Request Body Fields

### Required Fields
```json
{
  "userId": 123,              // For /send only
  "userIds": [1,2,3],         // For /send/bulk only
  "criteria": {},             // For /send/criteria only
  "subject": "Email Subject",
  "heading": "Email Heading",
  "body": "<p>Email body HTML</p>"
}
```

### Optional Fields
```json
{
  "buttonText": "Click Here",
  "buttonUrl": "https://link.com",
  "preheader": "Preview text",
  "emailType": "marketing"     // or "transactional"
}
```

---

## 🎯 Targeting Criteria

All criteria are optional and can be combined:

```json
{
  "criteria": {
    "minOrderValue": 100,           // Min $ spent (number)
    "maxOrderValue": 500,           // Max $ spent (number)
    "brandIds": [5, 12, 23],       // Array of brand IDs
    "signupAfter": "2024-01-01",   // ISO date string
    "signupBefore": "2024-12-31"   // ISO date string
  }
}
```

---

## 📧 Email Types

### Marketing
- Has unsubscribe link
- Supports preheader text
- For: promotions, newsletters

### Transactional
- No unsubscribe link
- For: confirmations, resets

---

## 🔍 Common Criteria Patterns

### High-Value Customers
```json
{"minOrderValue": 500}
```

### New Users (Last 30 Days)
```json
{"signupAfter": "2024-01-09"}
```

### Inactive Users
```json
{
  "maxOrderValue": 100,
  "signupBefore": "2023-08-01"
}
```

### Brand Fans
```json
{"brandIds": [5, 12, 23]}
```

### New Big Spenders
```json
{
  "minOrderValue": 200,
  "signupAfter": "2024-01-01"
}
```

---

## 💻 Quick Commands

### Get Admin Token
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@muse.shopping","password":"pass"}'
```

### Send One Email
```bash
curl -X POST http://localhost:5000/api/v1/admin/emails/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":123,"subject":"Hi","heading":"Hello","body":"<p>Test</p>"}'
```

### Send Bulk
```bash
curl -X POST http://localhost:5000/api/v1/admin/emails/send/bulk \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userIds":[1,2,3],"subject":"Hi","heading":"Hello","body":"<p>Test</p>"}'
```

### Send By Criteria
```bash
curl -X POST http://localhost:5000/api/v1/admin/emails/send/criteria \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"criteria":{"minOrderValue":500},"subject":"VIP","heading":"Hello","body":"<p>VIP offer</p>"}'
```

### View History
```bash
curl http://localhost:5000/api/v1/admin/emails/history?limit=20 \
  -H "Authorization: Bearer $TOKEN"
```

---

## ⚡ Limits & Performance

- **Bulk send limit**: 1000 users per request
- **Batch size**: 10 emails at a time
- **Delay between batches**: 1 second
- **Approximate speed**: ~10 emails/second

---

## 🔐 Environment Variables

Required in `.env`:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=Muse Shopping <noreply@muse.shopping>
BASE_URL=https://yourdomain.com
```

---

## 📊 Response Examples

### Success
```json
{
  "success": true,
  "data": {
    "success": true,
    "email": "user@example.com",
    "userId": 123
  }
}
```

### Bulk Success
```json
{
  "success": true,
  "data": {
    "bulkSendId": 42,
    "total": 100,
    "sent": 98,
    "failed": 2,
    "errors": [...]
  }
}
```

### Error
```json
{
  "success": false,
  "error": "Error message here"
}
```

---

## 🎨 HTML Body Tips

```html
<!-- Good: Simple HTML -->
<p>Hello! Here's your offer.</p>
<p><strong>20% OFF</strong> - use code SAVE20</p>
<ul>
  <li>Free shipping</li>
  <li>Easy returns</li>
</ul>

<!-- Avoid: Complex CSS, JavaScript, external images -->
```

---

## ✅ Pre-Send Checklist

- [ ] SMTP configured in .env
- [ ] Admin token obtained
- [ ] Test email sent to self
- [ ] Subject line under 50 chars
- [ ] Body uses simple HTML
- [ ] CTA button included
- [ ] Email type selected
- [ ] Criteria tested (if using)

---

## 📁 Files Reference

- `ADMIN_EMAIL_GUIDE.md` - Full documentation
- `ADMIN_EMAIL_EXAMPLES.md` - Copy-paste examples
- `ADMIN_EMAIL_SETUP_COMPLETE.md` - Setup summary

---

**Keep this handy for quick reference!**
