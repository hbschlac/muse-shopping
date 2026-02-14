# 🚀 Feedback System Launch Checklist

Use this checklist before launching the feedback system to production.

---

## ✅ Pre-Launch Checklist

### Database

- [ ] **Run migrations**
  ```bash
  psql -U muse_admin -d muse_shopping_dev -f migrations/066_create_feedback_system.sql
  psql -U muse_admin -d muse_shopping_dev -f migrations/067_add_tech_help_category.sql
  ```

- [ ] **Verify tables exist**
  ```sql
  \dt feedback*
  -- Should show: feedback_submissions, feedback_attachments,
  --              feedback_responses, feedback_ticket_counter
  ```

- [ ] **Test ticket generation**
  ```sql
  SELECT generate_ticket_number();
  -- Should return: MUSE-2026-00001
  ```

---

### Backend Configuration

- [ ] **Check .env has all required variables**
  ```bash
  # Email configuration
  EMAIL_FEEDBACK=feedback@muse.shopping
  EMAIL_HELP=help@muse.shopping

  # SMTP settings
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=your-email@gmail.com
  SMTP_PASS=your-app-password

  # Base URL
  BASE_URL=https://your-domain.com
  ```

- [ ] **Feedback routes are enabled**
  - Check `src/routes/index.js`
  - Should have: `const feedbackRoutes = require('./feedbackRoutes');`
  - Should have: `router.use('/feedback', feedbackRoutes);`

- [ ] **Backend server starts without errors**
  ```bash
  npm start
  # Should see no errors related to feedback routes
  ```

---

### Email Setup

- [ ] **SMTP credentials configured**
  - Gmail app password generated
  - SMTP settings in `.env`
  - Test email sending

- [ ] **Email addresses set up**
  - [ ] `feedback@muse.shopping` inbox ready
  - [ ] `help@muse.shopping` inbox ready
  - [ ] Both can receive emails

- [ ] **Test email delivery**
  - Submit test feedback
  - Check both inboxes receive emails
  - Verify email formatting looks good

---

### Frontend

- [ ] **Feedback form accessible**
  ```
  http://localhost:3001/feedback
  ```

- [ ] **Admin dashboard accessible**
  ```
  http://localhost:3001/admin/feedback
  ```

- [ ] **Navigation links added** (if needed)
  - Add link to `/feedback` in main navigation
  - Add link to `/admin/feedback` in admin menu

- [ ] **Mobile responsive**
  - Test on phone/tablet
  - Check form is usable
  - Check dashboard works

---

### Testing

- [ ] **Run complete test suite**
  ```bash
  ./test-complete-feedback-system.sh
  ```

- [ ] **Submit test tickets for all categories**
  - [ ] 🐛 Bug Report
  - [ ] 💡 Feature Request
  - [ ] 🛠️ Tech Help
  - [ ] 😔 Complaint
  - [ ] ❓ Question
  - [ ] 💬 Other

- [ ] **Verify tech help dual email routing**
  - Submit tech_help ticket
  - Confirm email sent to feedback@
  - Confirm email sent to help@

- [ ] **Test admin dashboard**
  - [ ] View statistics
  - [ ] Filter by status
  - [ ] Filter by category
  - [ ] Filter by priority
  - [ ] Click ticket to view details

- [ ] **Test ticket management**
  - [ ] Update status
  - [ ] Change priority
  - [ ] Add admin notes
  - [ ] Add resolution notes
  - [ ] Add public response
  - [ ] Add internal note

- [ ] **Verify database updates**
  - Check ticket status updated
  - Check timestamps set correctly
  - Check responses saved

---

### Security

- [ ] **Authentication working**
  - Admin endpoints require auth
  - Users can only see own tickets
  - Admins can see all tickets

- [ ] **Input validation**
  - Try invalid email → should reject
  - Try short message → should reject
  - Try invalid category → should reject

- [ ] **SQL injection protection**
  - All queries use parameterized statements
  - No raw string concatenation

- [ ] **Rate limiting** (if configured)
  - Test multiple rapid submissions
  - Should limit to prevent spam

---

### Performance

- [ ] **Database indexes exist**
  ```sql
  \di feedback*
  -- Should show indexes on ticket_number, user_id,
  -- status, category, created_at
  ```

- [ ] **Page load times acceptable**
  - Dashboard loads < 2 seconds
  - Ticket detail loads < 1 second

- [ ] **Email sending is async**
  - Feedback submission returns immediately
  - Emails sent in background

---

### Documentation

- [ ] **Team has access to documentation**
  - [ ] `FEEDBACK_SYSTEM_COMPLETE.md`
  - [ ] `ADMIN_FEEDBACK_DASHBOARD_COMPLETE.md`
  - [ ] `FEEDBACK_ADMIN_QUICK_REF.md`
  - [ ] `FEEDBACK_SYSTEM_FINAL_SUMMARY.md`

- [ ] **Support team trained**
  - How to access dashboard
  - How to update tickets
  - How to respond to users
  - How to prioritize

- [ ] **Response templates prepared** (optional)
  - Common bug responses
  - Feature request acknowledgments
  - Tech help solutions

---

### Monitoring

- [ ] **Logging configured**
  - Feedback submissions logged
  - Email sending logged
  - Errors logged

- [ ] **Error tracking** (optional)
  - Sentry or similar configured
  - Email errors reported

- [ ] **Metrics tracked** (optional)
  - Submission count
  - Response time
  - Resolution rate

---

### User Communication

- [ ] **Announcement prepared**
  - Inform users about feedback form
  - Explain how to submit feedback
  - Mention expected response time

- [ ] **Help documentation updated**
  - Add "Contact Us" or "Feedback" section
  - Explain feedback categories
  - Link to `/feedback` page

---

## 🧪 Final Testing Checklist

### End-to-End Test: Regular Feedback

- [ ] User submits bug report
- [ ] Receives ticket number on screen
- [ ] Receives confirmation email
- [ ] Team receives notification at feedback@
- [ ] Admin can view in dashboard
- [ ] Admin can update and respond
- [ ] Database reflects all changes

### End-to-End Test: Tech Help

- [ ] User submits tech help request
- [ ] Receives ticket number on screen
- [ ] Receives confirmation email
- [ ] Team receives notification at feedback@
- [ ] **Support team receives at help@** ⭐
- [ ] Admin can view in dashboard
- [ ] Admin can respond
- [ ] Database reflects all changes

### Stress Test

- [ ] Submit 10 tickets rapidly
- [ ] All tickets have unique numbers
- [ ] All emails sent successfully
- [ ] Dashboard shows all tickets
- [ ] No database errors

---

## 📋 Production Deployment

### Pre-Deployment

- [ ] **Environment variables updated**
  - Production SMTP credentials
  - Production email addresses
  - Production base URL

- [ ] **Database backup created**
  ```bash
  pg_dump -U muse_admin muse_shopping_dev > backup_before_feedback.sql
  ```

- [ ] **Migrations ready**
  - All SQL files in `migrations/` folder
  - Migration runner tested

### Deployment Steps

1. [ ] **Deploy backend**
   - Run migrations on production DB
   - Deploy backend code
   - Verify server starts

2. [ ] **Deploy frontend**
   - Build frontend
   - Deploy static files
   - Verify pages load

3. [ ] **Test production**
   - Submit test ticket
   - Check emails arrive
   - Check dashboard works

4. [ ] **Monitor for errors**
   - Check logs for errors
   - Monitor email delivery
   - Watch for user issues

### Post-Deployment

- [ ] **Submit first real ticket** (from your account)
  - Test the complete flow
  - Verify everything works

- [ ] **Announce to team**
  - Feedback system is live
  - How to access dashboard
  - Training materials available

- [ ] **Announce to users** (optional)
  - New feedback form available
  - How to submit feedback
  - Expected response time

---

## 🎯 Success Metrics

Track these after launch:

### Week 1
- [ ] Number of submissions
- [ ] Email delivery rate
- [ ] Admin response time
- [ ] Any errors or issues

### Month 1
- [ ] Total submissions
- [ ] Category breakdown
- [ ] Average resolution time
- [ ] User feedback on the system

---

## 🆘 Rollback Plan

If issues occur:

1. **Disable routes**
   ```javascript
   // In src/routes/index.js
   // Comment out:
   // router.use('/feedback', feedbackRoutes);
   ```

2. **Notify team**
   - Feedback system temporarily disabled
   - Use alternative contact method

3. **Investigate**
   - Check logs for errors
   - Review database queries
   - Test email delivery

4. **Fix and redeploy**
   - Fix identified issues
   - Test thoroughly
   - Re-enable routes

---

## ✅ Final Sign-Off

Before going live, confirm:

- [ ] All tests passing
- [ ] All team members trained
- [ ] Documentation complete
- [ ] Email delivery working
- [ ] Mobile responsive
- [ ] Security verified
- [ ] Performance acceptable

**Signed off by:** _________________

**Date:** _________________

---

## 🎉 You're Ready to Launch!

Once all items are checked, your feedback system is ready for production!

**Good luck!** 🚀
