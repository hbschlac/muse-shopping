# 📋 Feedback & Tech Help Quick Reference

## 🚀 Quick Access

| What | URL |
|------|-----|
| **Submit Feedback** | http://localhost:3001/feedback |
| **Admin Dashboard** | http://localhost:3001/admin/feedback |
| **View Ticket** | http://localhost:3001/admin/feedback/MUSE-2026-00001 |

## 📧 Email Routing

| Category | Emails Sent To |
|----------|----------------|
| Bug Report | feedback@muse.shopping |
| Feature Request | feedback@muse.shopping |
| **Tech Help** | **feedback@muse.shopping + help@muse.shopping** |
| Complaint | feedback@muse.shopping |
| Question | feedback@muse.shopping |
| Other | feedback@muse.shopping |

## 🏷️ Categories

| Icon | Category | Use For |
|------|----------|---------|
| 🐛 | Bug Report | Software bugs, errors, broken features |
| 💡 | Feature Request | New feature ideas, enhancements |
| 🛠️ | **Tech Help** | Technical support, how-to questions |
| 😔 | Complaint | User complaints, dissatisfaction |
| ❓ | Question | General questions |
| 💬 | Other | Everything else |

## 📊 Status Flow

```
NEW → IN_REVIEW → IN_PROGRESS → RESOLVED → CLOSED
🔵      🟡          🟣            🟢        ⚫
```

## ⚡ Priority Levels

| Level | Use When | Color |
|-------|----------|-------|
| 🔴 **Urgent** | Critical issues, immediate action needed | Red |
| 🟠 **High** | Important, handle soon | Orange |
| 🔵 **Medium** | Normal priority | Blue |
| ⚪ **Low** | Can wait | Gray |

## 💬 Response Types

| Type | Visible To | Use For |
|------|------------|---------|
| **Public** | User + Admins | User communication, answers |
| **Internal** | Admins only | Team notes, coordination |

## 🎯 Common Admin Actions

### Triage New Tickets:
1. Go to `/admin/feedback`
2. Filter: Status = "New"
3. Review each ticket
4. Set priority
5. Change status to "In Review"
6. Add admin notes if needed

### Respond to User:
1. Open ticket detail
2. Scroll to "Add Response"
3. Write response
4. ✅ Check "Make this response visible to the user"
5. Click "Add Response"
6. Update status to "Resolved"

### Close Ticket:
1. Open ticket
2. Add resolution notes
3. Change status to "Closed"
4. Click "Update Ticket"

## 📝 Ticket Number Format

```
MUSE-YYYY-NNNNN
     ↓    ↓
   Year  Sequential

Examples:
MUSE-2026-00001
MUSE-2026-00002
MUSE-2027-00001 (resets each year)
```

## 🔍 Filtering Shortcuts

| View | Filters To Set |
|------|----------------|
| **New tickets** | Status: New |
| **My work** | Status: In Progress |
| **Needs attention** | Priority: High or Urgent |
| **Tech support** | Category: Tech Help |
| **Resolved this week** | Status: Resolved |

## 🎨 Badge Colors Reference

### Status:
- 🔵 New
- 🟡 In Review
- 🟣 In Progress
- 🟢 Resolved
- ⚫ Closed

### Priority:
- ⚪ Low
- 🔵 Medium
- 🟠 High
- 🔴 Urgent

## 📊 Dashboard Stats Meaning

| Stat | What It Shows |
|------|---------------|
| **Total Submissions** | All tickets ever created |
| **New Count** | Unreviewed tickets (Status: New) |
| **In Progress** | Currently being worked on |
| **Resolved** | Fixed/answered but not closed |
| **Bug/Feature/Help Counts** | Breakdown by category |
| **High Priority** | Urgent + High combined |

## ⌨️ Quick Workflow

### Handle Tech Help Request:
```
1. New tech help ticket arrives
2. Emails → feedback@ AND help@
3. Admin opens from dashboard
4. Reviews issue
5. Updates status to "In Progress"
6. Adds public response with solution
7. Updates status to "Resolved"
8. User receives email with solution
```

### Escalate Bug:
```
1. Bug report arrives
2. Admin reviews
3. Sets priority to "Urgent"
4. Adds admin notes with technical details
5. Status → "In Progress"
6. Fixes bug
7. Adds resolution notes
8. Status → "Resolved"
9. User notified
```

## 🛠️ Troubleshooting

### Not receiving emails?
Check `.env`:
```bash
EMAIL_FEEDBACK=feedback@muse.shopping
EMAIL_HELP=help@muse.shopping
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Dashboard not loading?
1. Check backend is running: `npm start`
2. Check authentication (admin required)
3. Check browser console for errors

### Can't update ticket?
- Admin authentication required
- Check network tab for API errors
- Verify permissions in database

## 📱 Mobile Access

Dashboard is fully responsive:
- View tickets on mobile
- Filter and search
- Read ticket details
- ✅ Update status
- ✅ Add responses
- ❌ Best to use desktop for long responses

## 🔗 API Endpoints (for reference)

```
GET    /api/v1/feedback              List all (admin)
GET    /api/v1/feedback/stats        Statistics (admin)
GET    /api/v1/feedback/:ticket      View ticket
POST   /api/v1/feedback              Submit new
PATCH  /api/v1/feedback/:ticket      Update (admin)
POST   /api/v1/feedback/:ticket/responses  Add response (admin)
```

## ✨ Pro Tips

1. **Use filters** - Don't scroll through everything
2. **Add admin notes** - Help your team understand context
3. **Set priority early** - Helps everyone prioritize
4. **Public responses are friendly** - Users see these
5. **Internal notes are detailed** - Technical details here
6. **Update status frequently** - Shows progress
7. **Close resolved tickets** - Keeps dashboard clean

## 📞 Need Help?

- Check `ADMIN_FEEDBACK_DASHBOARD_COMPLETE.md` for full docs
- Check `FEEDBACK_SYSTEM_COMPLETE.md` for system overview
- Test with `./test-feedback-api.sh`

---

**Quick Start:** Just go to `/admin/feedback` and start managing tickets! 🎉
