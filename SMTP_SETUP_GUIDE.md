# SMTP Setup Guide for Admin Email System

This guide walks you through setting up Gmail SMTP for sending emails from Muse Shopping.

## Option 1: Gmail SMTP (Recommended for Development)

### Step 1: Enable 2-Step Verification

1. Go to your Google Account: https://myaccount.google.com
2. Navigate to **Security** → **2-Step Verification**
3. Follow the prompts to enable 2-Step Verification
4. Complete the setup

### Step 2: Generate App Password

1. Go to: https://myaccount.google.com/apppasswords
2. In the "Select app" dropdown, choose **Mail**
3. In the "Select device" dropdown, choose **Other (Custom name)**
4. Type: "Muse Shopping Backend"
5. Click **Generate**
6. **Copy the 16-character password** (shown as: xxxx xxxx xxxx xxxx)

### Step 3: Update .env File

Open your `.env` file and update these lines:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-actual-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  # The 16-char app password (spaces optional)
EMAIL_FROM=Muse Shopping <noreply@muse.shopping>
BASE_URL=http://localhost:3001
```

**Example:**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=hannah@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
EMAIL_FROM=Muse Shopping <noreply@muse.shopping>
BASE_URL=http://localhost:3001
```

### Step 4: Restart Your Server

```bash
# Stop the server (Ctrl+C if running)
# Then restart it
npm run dev
```

---

## Option 2: Other Email Providers

### SendGrid

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
EMAIL_FROM=Muse Shopping <noreply@yourdomain.com>
BASE_URL=http://localhost:3001
```

### Mailgun

```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@yourdomain.com
SMTP_PASS=your-mailgun-smtp-password
EMAIL_FROM=Muse Shopping <noreply@yourdomain.com>
BASE_URL=http://localhost:3001
```

### Amazon SES

```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
EMAIL_FROM=Muse Shopping <noreply@yourdomain.com>
BASE_URL=http://localhost:3001
```

---

## Testing Your SMTP Configuration

### Test 1: Start the Server and Check Logs

```bash
npm run dev
```

Look for any SMTP-related errors in the logs.

### Test 2: Create a Test User

First, create a test user or find your user ID:

```bash
# Create a new user (or use existing)
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@gmail.com",
    "password": "Test123!",
    "full_name": "Test User"
  }'
```

### Test 3: Login as Admin

You need to login as an admin user. First, let's check if you have an admin user:

```bash
# Option 1: If you already have an admin account
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@muse.shopping",
    "password": "your-admin-password"
  }'

# Save the token from response
export ADMIN_TOKEN="paste_token_here"
```

### Test 4: Send a Test Email to Yourself

```bash
# Get your user ID first
curl http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Send test email (replace USER_ID with your actual ID)
curl -X POST http://localhost:3000/api/v1/admin/emails/send \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": USER_ID,
    "subject": "Test Email from Muse Shopping",
    "heading": "This is a Test",
    "body": "<p>If you receive this email, SMTP is working correctly!</p><p>The Admin Email System is ready to use.</p>",
    "buttonText": "View Dashboard",
    "buttonUrl": "http://localhost:3001",
    "emailType": "transactional"
  }'
```

### Test 5: Check Your Email

Check your inbox for the test email. It should arrive within a few seconds.

---

## Troubleshooting

### Error: "Invalid login"

**Solution:**
- Make sure you've enabled 2-Step Verification
- Generate a new App Password
- Copy the App Password exactly (remove spaces or keep them, both work)
- Update SMTP_PASS in .env

### Error: "SMTP connection timeout"

**Solution:**
- Check your internet connection
- Verify SMTP_HOST and SMTP_PORT are correct
- Try changing SMTP_PORT to 465 and add `SMTP_SECURE=true`

### Error: "Email service not configured"

**Solution:**
- Make sure all SMTP_* variables are set in .env
- Restart your server after updating .env
- Check for typos in variable names

### Emails not arriving

**Solution:**
- Check spam/junk folder
- Verify EMAIL_FROM address
- Check server logs for sending errors
- Try sending to a different email address

### "Cannot read properties of undefined"

**Solution:**
- Make sure .env file exists in project root
- Check that all required variables are present
- Restart the server

---

## Development Mode (No SMTP)

If you don't configure SMTP, the system will run in development mode:
- Emails won't actually be sent
- Email content will be logged to the console
- You can still test the API endpoints
- No errors will be thrown

This is useful for:
- Local development
- Testing email content/templates
- API testing without sending real emails

---

## Production Recommendations

For production, consider using a professional email service:

1. **SendGrid** - Free tier: 100 emails/day
   - Pro: Reliable, good deliverability, analytics
   - Con: Requires account setup

2. **Mailgun** - Free tier: 5,000 emails/month
   - Pro: Developer-friendly, good documentation
   - Con: Credit card required for verification

3. **Amazon SES** - $0.10 per 1,000 emails
   - Pro: Very cheap, scalable
   - Con: Requires AWS account, initial sandbox mode

4. **Gmail** - Use with caution in production
   - Pro: Easy setup
   - Con: Daily sending limits (~500 emails/day)

---

## Security Best Practices

1. **Never commit .env to Git**
   - Already in .gitignore
   - Double-check before pushing

2. **Use App Passwords, not your real password**
   - More secure
   - Can revoke without changing main password

3. **Rotate SMTP credentials regularly**
   - Generate new App Passwords every few months

4. **Monitor sending limits**
   - Gmail: ~500/day
   - SendGrid free: 100/day
   - Keep track to avoid hitting limits

---

## Next Steps

Once SMTP is configured and tested:

1. ✅ Review documentation files
2. ✅ Test sending to yourself
3. ✅ Create test campaigns with small user groups
4. ✅ Monitor email history endpoint
5. ✅ Plan your first real campaign

**Your Admin Email System is ready!** 🎉
