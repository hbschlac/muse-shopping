# 🚀 Feedback System Quick Start

## Step 1: Run the Migration

```bash
# Connect to your database and run the migration
psql -U muse_admin -d muse_shopping_dev -f migrations/066_create_feedback_system.sql
```

Or use your migration runner:
```bash
node run-migrations.js
```

## Step 2: Configure Email (Optional but Recommended)

Add to your `.env` file:

```bash
# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FEEDBACK=feedback@muse.shopping
EMAIL_FROM_TEAM=Muse Team <team@muse.shopping>
BASE_URL=http://localhost:3001
```

### Get Gmail App Password:
1. Google Account → Security → 2-Step Verification
2. App passwords → Generate
3. Copy the 16-character password

## Step 3: Test the System

### Option A: Use the Frontend Form

1. Start your servers:
   ```bash
   # Backend
   npm start

   # Frontend (in another terminal)
   cd frontend && npm run dev
   ```

2. Visit: http://localhost:3001/feedback

3. Fill out the form and submit

4. Check for:
   - Ticket number on success screen
   - Confirmation email to your email
   - Notification email to feedback@muse.shopping

### Option B: Test via API

```bash
curl -X POST http://localhost:3000/api/v1/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "category": "bug",
    "subject": "Test feedback submission",
    "message": "This is a test message to verify the feedback system is working correctly.",
    "email": "your-email@example.com",
    "fullName": "Test User"
  }'
```

Expected Response:
```json
{
  "success": true,
  "data": {
    "ticketNumber": "MUSE-2026-00001",
    "status": "new",
    "createdAt": "2026-02-09T..."
  },
  "message": "Feedback submitted successfully. Ticket number: MUSE-2026-00001"
}
```

## Step 4: Verify in Database

```sql
-- Check submitted feedback
SELECT ticket_number, category, subject, email, status, created_at
FROM feedback_submissions
ORDER BY created_at DESC
LIMIT 5;

-- Check ticket counter
SELECT * FROM feedback_ticket_counter;
```

## 🎉 That's It!

Your feedback system is now live and ready to receive submissions.

## 📧 Email Destinations

- **User confirmation:** Goes to the email provided in the form
- **Team notification:** Goes to `EMAIL_FEEDBACK` address (feedback@muse.shopping)

## 🔍 Troubleshooting

### No emails being sent?

1. **Check .env configuration:**
   ```bash
   # Verify these are set
   echo $SMTP_HOST
   echo $SMTP_USER
   echo $SMTP_PASS
   ```

2. **Check logs:**
   ```bash
   # Look for email sending logs
   tail -f logs/app.log | grep -i email
   ```

3. **Dev mode fallback:**
   - Without SMTP config, emails won't send but feedback is still saved
   - Check server logs for the reset token/link in development

### Ticket numbers not incrementing?

Check the counter table:
```sql
SELECT * FROM feedback_ticket_counter;
```

Should show:
```
 id | year | counter
----+------+---------
  1 | 2026 |       5
```

### Can't view submitted feedback?

- Users can only view their own submissions
- Admins can view all submissions
- Check authentication token is being sent

## 📊 Admin Functions (Available Now)

```bash
# Get all feedback (requires admin auth)
curl http://localhost:3000/api/v1/feedback \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Get statistics
curl http://localhost:3000/api/v1/feedback/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Update ticket status
curl -X PATCH http://localhost:3000/api/v1/feedback/MUSE-2026-00001 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress", "priority": "high"}'
```

## 🎯 Next: Build Admin Dashboard

The backend is ready. You can now build:
- Ticket management UI
- Response system
- Assignment workflow
- Analytics dashboard

All the APIs are ready to use!

---

Need help? Check `FEEDBACK_SYSTEM_COMPLETE.md` for full documentation.
