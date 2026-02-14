# Email Service Setup Guide

## Overview

The Muse Shopping app uses **nodemailer** to send password reset emails and welcome emails to users. This guide will help you configure the email service for development and production.

---

## Quick Setup (Gmail - Recommended for Development)

### Step 1: Enable 2-Step Verification

1. Go to [Google Account Settings](https://myaccount.google.com/security)
2. Click on "2-Step Verification"
3. Follow the prompts to enable it (you'll need your phone)

### Step 2: Generate App Password

1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select app: **Mail**
3. Select device: **Other (Custom name)**
4. Enter name: **Muse Shopping App**
5. Click **Generate**
6. Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)
7. Remove spaces: `abcdefghijklmnop`

### Step 3: Update .env File

Open `/Users/hannahschlacter/Desktop/muse-shopping/.env` and update:

```bash
# Email Service Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com              # Your Gmail address
SMTP_PASS=abcdefghijklmnop                  # The 16-char app password
EMAIL_FROM=Muse Shopping <noreply@muse.shopping>
BASE_URL=http://localhost:3001              # Your frontend URL
```

### Step 4: Restart Backend Server

```bash
# Stop the server (Ctrl+C if running)
npm start

# Or if using nodemon:
npm run dev
```

### Step 5: Test Email Service

1. Go to `http://localhost:3001/auth/forgot-password`
2. Enter your email address
3. Click "Send reset link"
4. Check your email inbox (and spam folder!)
5. Click the reset link in the email
6. You should be redirected to the reset password page

---

## Development Mode (Without Email Configuration)

If you don't configure SMTP, the app will still work! It will:

1. ✅ Accept password reset requests
2. ✅ Generate secure tokens
3. ✅ Store them in the database
4. 📋 **Log the reset link to the console** for testing

**Console Output Example:**
```
[DEV] Password reset token for user@example.com: a1b2c3d4...
[DEV] Reset link: http://localhost:3001/auth/reset-password?token=a1b2c3d4...
```

Simply copy the link from the console and paste it in your browser!

---

## Production Setup

For production, use a professional email service instead of Gmail:

### Option 1: SendGrid (Recommended)

**Why SendGrid:**
- ✅ Free tier: 100 emails/day
- ✅ Better deliverability
- ✅ Email analytics
- ✅ No Gmail sending limits

**Setup:**

1. Sign up at [SendGrid](https://sendgrid.com)
2. Create an API Key
3. Update `.env`:

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key_here
EMAIL_FROM=Muse Shopping <noreply@muse.shopping>
BASE_URL=https://your-production-domain.com
```

### Option 2: AWS SES (Amazon Simple Email Service)

**Why AWS SES:**
- ✅ Very cheap ($0.10 per 1,000 emails)
- ✅ Highly reliable
- ✅ Scales automatically
- ✅ Integrated with AWS ecosystem

**Setup:**

1. Go to [AWS SES Console](https://console.aws.amazon.com/ses)
2. Verify your domain or email
3. Get SMTP credentials
4. Update `.env`:

```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com  # Your region
SMTP_PORT=587
SMTP_USER=your_aws_smtp_username
SMTP_PASS=your_aws_smtp_password
EMAIL_FROM=Muse Shopping <noreply@yourdomain.com>
BASE_URL=https://your-production-domain.com
```

### Option 3: Mailgun

**Setup:**

1. Sign up at [Mailgun](https://mailgun.com)
2. Add and verify your domain
3. Get SMTP credentials
4. Update `.env`:

```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.com
SMTP_PASS=your_mailgun_password
EMAIL_FROM=Muse Shopping <noreply@your-domain.com>
BASE_URL=https://your-production-domain.com
```

---

## Email Templates

The app includes two email templates with Muse branding:

### 1. Password Reset Email

**Subject:** Reset Your Muse Password

**Contents:**
- Muse logo
- Personalized greeting
- Reset password button (expires in 1 hour)
- Security notice
- Plain text fallback

**Example:**
```
Hi Jane,

We received a request to reset your password for your Muse account.
Click the button below to create a new password:

[Reset Password Button]

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email.
```

### 2. Welcome Email

**Subject:** Welcome to Muse!

**Contents:**
- Muse logo
- Welcome message
- Start shopping button
- Brand tagline

**Example:**
```
Hi Jane,

We're excited to have you join Muse! Your account has been created successfully.

Muse brings together all your favorite brands and products in one personalized feed.

[Start Shopping Button]

Shop all your favorites in one place,
The Muse Team
```

---

## Email Customization

### Change Email Templates

Edit `/Users/hannahschlacter/Desktop/muse-shopping/src/services/emailService.js`:

```javascript
// Customize HTML template
const htmlContent = `
  <!DOCTYPE html>
  <html>
    <body style="background: #FEFDFB;">
      <!-- Your custom HTML here -->
    </body>
  </html>
`;

// Customize text fallback
const textContent = `
Your custom plain text here
`;
```

### Change "From" Name

Update `.env`:
```bash
EMAIL_FROM=Your Company Name <noreply@yourdomain.com>
```

### Change Email Subject

Edit `emailService.js`:
```javascript
const mailOptions = {
  subject: 'Your Custom Subject',
  // ...
};
```

---

## Troubleshooting

### Issue: "Cannot send email: Email service not configured"

**Solution:** Configure SMTP settings in `.env` or check console for dev token link.

### Issue: Emails going to spam

**Solutions:**
1. Use a professional email service (SendGrid, AWS SES)
2. Add SPF and DKIM records to your domain
3. Verify your domain with the email service
4. Don't use free Gmail for production

### Issue: "Authentication failed" error

**Solutions:**
1. **Gmail:** Make sure you generated an App Password (not your regular password)
2. **Gmail:** Verify 2-Step Verification is enabled
3. **Other services:** Double-check SMTP credentials
4. Check SMTP_PORT matches the service (usually 587)

### Issue: Emails not arriving

**Solutions:**
1. Check spam/junk folder
2. Verify email address is correct
3. Check server logs for errors
4. Test with a different email provider
5. Verify SMTP service is not blocking the recipient

### Issue: Reset link doesn't work

**Solutions:**
1. Make sure `BASE_URL` in `.env` matches your frontend URL
2. Check if token has expired (1 hour limit)
3. Verify token hasn't already been used
4. Check browser console for errors

---

## Testing Email Functionality

### Manual Testing

1. **Registration Email:**
   ```bash
   # Register a new user
   curl -X POST http://localhost:3000/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "Test1234",
       "full_name": "Test User"
     }'
   ```

2. **Password Reset Email:**
   ```bash
   # Request password reset
   curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com"
     }'
   ```

### Check Logs

```bash
# Backend logs will show:
[DEV] Password reset token for test@example.com: abc123...
[DEV] Reset link: http://localhost:3001/auth/reset-password?token=abc123...
```

### Verify Database

```bash
# Check password reset tokens
psql -d muse_shopping_dev -c "SELECT * FROM password_reset_tokens ORDER BY created_at DESC LIMIT 5;"
```

---

## Security Best Practices

### 1. Never Commit SMTP Credentials

✅ **Good:** Use `.env` file (already in `.gitignore`)
❌ **Bad:** Hardcode credentials in code

### 2. Use Environment-Specific Configs

```bash
# Development
BASE_URL=http://localhost:3001

# Production
BASE_URL=https://muse.shopping
```

### 3. Rotate SMTP Passwords Regularly

- Change Gmail App Passwords every 3-6 months
- Use different credentials for dev/staging/prod

### 4. Monitor Email Sending

- Set up alerts for failed emails
- Monitor sending limits
- Track deliverability rates

### 5. Rate Limiting

The app already includes rate limiting for password reset:
- 100 requests per 15 minutes per IP
- Prevents abuse

---

## Email Service Comparison

| Service | Free Tier | Cost | Deliverability | Ease of Setup |
|---------|-----------|------|----------------|---------------|
| Gmail (Dev) | 500/day | Free | Medium | ⭐⭐⭐⭐⭐ Easy |
| SendGrid | 100/day | $0.10/1k | High | ⭐⭐⭐⭐ Easy |
| AWS SES | 62k/month* | $0.10/1k | High | ⭐⭐⭐ Medium |
| Mailgun | 5k/month | $0.80/1k | High | ⭐⭐⭐⭐ Easy |
| Postmark | 100/month | $1.25/1k | Very High | ⭐⭐⭐⭐ Easy |

*When hosted on EC2

---

## Next Steps

1. ✅ Choose an email service (Gmail for dev, SendGrid/AWS SES for prod)
2. ✅ Configure SMTP settings in `.env`
3. ✅ Restart backend server
4. ✅ Test password reset flow
5. ✅ Test welcome email on user registration
6. ✅ Monitor logs for any errors
7. ✅ Configure SPF/DKIM for production domain

---

## Support

If you encounter issues:
1. Check server logs for detailed error messages
2. Verify `.env` configuration
3. Test with a different email address
4. Review the troubleshooting section above

For production deployments, consider using the auto-monitoring service:
```bash
npm run monitor:watch
```

This will detect and alert on email service issues automatically!
