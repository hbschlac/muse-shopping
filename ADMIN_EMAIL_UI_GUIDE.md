# Admin Email Web Interface - User Guide

You now have a beautiful, user-friendly web interface for managing emails to shoppers!

## 🌐 Access the Admin Interface

### URL
```
http://localhost:3000/api/v1/admin/email-ui/login
```

For production:
```
https://yourdomain.com/api/v1/admin/email-ui/login
```

---

## 🔐 Login

1. Navigate to the login URL
2. Enter your admin credentials:
   - **Email**: Your admin email (e.g., `admin@muse.shopping`)
   - **Password**: Your admin password
3. Click **Sign In**

**Security Notes:**
- The login page is the only public page
- All other pages require authentication
- Your session is stored securely in the browser
- Use the "Sign Out" button to log out

---

## 📧 Interface Overview

The admin interface has **3 main tabs**:

### 1. **Compose Email** (Main Tab)
Where you compose and send emails to shoppers

### 2. **Email History**
View all emails sent, with success/failure status

### 3. **Campaigns**
Track bulk email campaigns and their performance

---

## ✉️ Sending Emails

### Choose Your Send Type

The interface offers 3 sending options:

#### Option 1: **Single User**
- Send to one specific shopper
- Enter the User ID
- Perfect for: personalized messages, customer service

#### Option 2: **Multiple Users**
- Send to multiple shoppers at once
- Enter comma-separated User IDs (e.g., `123, 456, 789`)
- Perfect for: small groups, beta testers, VIP customers

#### Option 3: **Target by Criteria**
- Automatically target shoppers matching specific criteria
- Options:
  - **Min Spent**: Target customers who spent at least X dollars
  - **Max Spent**: Target customers who spent up to X dollars
  - **Signed Up After**: Target users who joined after a specific date
  - **Signed Up Before**: Target users who joined before a specific date
  - **Brand IDs**: Target users who purchased from specific brands
- Perfect for: segmented campaigns, re-engagement, VIP programs

---

## 📝 Composing Your Email

### Required Fields

1. **Email Type**
   - **Marketing**: Includes unsubscribe link, best for promotions
   - **Transactional**: For important account updates

2. **Subject Line**
   - Keep it under 50 characters for best mobile display
   - Example: "Your Weekly Style Picks"

3. **Email Heading**
   - The main heading in the email
   - Example: "Curated Just for You"

4. **Email Body**
   - Supports HTML for rich formatting
   - Use simple HTML: `<p>`, `<strong>`, `<ul>`, `<li>`
   - Example:
     ```html
     <p>Based on your recent activity, we think you'll love these new arrivals!</p>
     <p>Shop now and get free shipping on orders over $50.</p>
     ```

### Optional Fields

5. **Preview Text** (Marketing emails only)
   - Shows in inbox preview
   - Example: "New arrivals selected just for you"

6. **Button Text**
   - Call-to-action button text
   - Example: "Shop Now"

7. **Button URL**
   - Where the button links to
   - Example: `https://muse.shopping/new-arrivals`

---

## 👀 Preview Before Sending

1. Fill in your email content
2. Click **"Preview Email"**
3. Review how the email will look to shoppers
4. Make any needed adjustments
5. When satisfied, click **"Send Email"**

---

## 📊 Targeting Examples

### Example 1: VIP Customers (Spent $500+)
```
Send Type: Target by Criteria
Min Spent: 500
Subject: Exclusive VIP Preview
Heading: You're Invited
Body: Thank you for being a valued customer! Enjoy 25% off our new collection.
```

### Example 2: Win-Back Campaign (Inactive Users)
```
Send Type: Target by Criteria
Max Spent: 100
Signed Up Before: 2023-08-01
Subject: We Miss You! 20% Off Inside
Heading: Come Back to Muse
Body: We've added tons of new brands! Use code WELCOME20 for 20% off.
```

### Example 3: New Customer Welcome
```
Send Type: Target by Criteria
Signed Up After: 2024-02-01
Subject: Welcome to Muse!
Heading: Thanks for Joining
Body: We're excited to have you! Here's 15% off your first purchase.
```

### Example 4: Brand Fans
```
Send Type: Target by Criteria
Brand IDs: 5, 12, 23
Subject: New Drops from Your Favorite Brands
Heading: Fresh Styles Just Arrived
Body: The brands you love just restocked. Shop before they sell out!
```

---

## 📈 Viewing Email History

Click the **"Email History"** tab to see:

- **Date & Time**: When each email was sent
- **Recipient**: Email address and User ID
- **Subject**: What you sent
- **Type**: Marketing or Transactional
- **Status**: Sent successfully or Failed

### Filter Options
- **All Status**: See everything
- **Sent**: Only successful sends
- **Failed**: Only failed sends (to investigate issues)

### Statistics Dashboard
Shows at the top of the history tab:
- **Total Sent**: All emails sent
- **Successful**: Emails delivered successfully
- **Failed**: Emails that failed (with error details)

---

## 🚀 Tracking Campaigns

Click the **"Campaigns"** tab to see bulk email campaigns:

- **Date**: When campaign started
- **Subject**: Campaign subject line
- **Recipients**: How many users targeted
- **Sent**: How many emails successfully sent
- **Failed**: How many failed
- **Status**: Completed or In Progress

---

## 💡 Pro Tips

### 1. Always Preview First
Use the preview button to see how your email will look before sending

### 2. Test with Yourself
Send to your own User ID first to test the email

### 3. Start Small
For criteria-based sends, start with restrictive criteria to test before scaling up

### 4. Use Simple HTML
Keep email HTML simple for best compatibility across email clients

### 5. Monitor History
Regularly check the history tab to catch and fix any failed sends

### 6. Clear Subject Lines
Write clear, compelling subject lines under 50 characters

### 7. Strong CTAs
Always include a clear call-to-action button

### 8. Mobile-First
Remember most emails are read on mobile - keep it concise

---

## 🎨 Email Template Features

Every email you send automatically includes:

✅ **Muse Branding**
- Muse logo at the top
- Brand colors (#F4C4B0 accent)
- Professional typography

✅ **Personalization**
- Greeting with user's name: "Hi {Name},"
- Automatic fallback if name not available

✅ **Mobile Responsive**
- Looks great on all devices
- Optimized for mobile screens

✅ **Professional Footer**
- "Shop all your favorites in one place, The Muse Team"
- Unsubscribe link (marketing emails)
- Privacy policy link

✅ **Plain Text Version**
- Automatically generated for email clients that don't support HTML

---

## 🔧 Troubleshooting

### "Invalid credentials" on login
- Check your admin email and password
- Ensure you have admin permissions
- Contact system administrator if issues persist

### Email not sending
- Check if SMTP is configured (see `SMTP_SETUP_GUIDE.md`)
- In development mode without SMTP, emails are logged to console
- Verify User ID exists in the system

### "No users match criteria"
- Your targeting criteria are too restrictive
- Try broader criteria or check database for matching users
- Use the Email History to verify user data

### Preview not showing
- Ensure you've filled in Heading and Body fields
- Check for JavaScript errors in browser console

---

## 🔒 Security Best Practices

1. **Never share login credentials**
   - Each admin should have their own account

2. **Use strong passwords**
   - At least 12 characters with mixed case, numbers, symbols

3. **Log out when done**
   - Always use the "Sign Out" button

4. **Limited access**
   - Only give admin access to authorized team members

5. **Review before sending**
   - Always preview and double-check before bulk sends

6. **Monitor activity**
   - Regularly review Email History for any unusual activity

---

## 📱 Mobile Access

The admin interface is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones

For best experience on mobile:
- Use landscape mode on phones
- Tablets work great in any orientation
- Desktop recommended for bulk operations

---

## 🆘 Need Help?

### Common Questions

**Q: How do I find a user's ID?**
A: Check your user database or customer records

**Q: Can I schedule emails for later?**
A: Not currently - emails send immediately

**Q: How many emails can I send at once?**
A: Up to 1000 recipients per bulk send

**Q: Can I use images in emails?**
A: Images are supported in the HTML body, but use sparingly

**Q: What if an email fails?**
A: Check the Email History tab for error details

### Additional Resources

- **Full API Documentation**: `ADMIN_EMAIL_GUIDE.md`
- **SMTP Setup**: `SMTP_SETUP_GUIDE.md`
- **Quick Reference**: `ADMIN_EMAIL_QUICK_REFERENCE.md`
- **Examples**: `ADMIN_EMAIL_EXAMPLES.md`

---

## 🎉 You're Ready!

The Admin Email Interface makes it easy to:
- ✅ Compose beautiful emails
- ✅ Target the right customers
- ✅ Track performance
- ✅ Manage campaigns

**Start sending engaging emails to your Muse Shopping customers!**

---

*Last Updated: February 8, 2024*
*Interface Version: 1.0.0*
