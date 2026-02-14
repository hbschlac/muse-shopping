# ✅ Admin Account Created Successfully!

## 🎉 Your Admin Account

**Login URL:**
```
http://localhost:3000/api/v1/admin/email-ui/login
```

**Your Credentials:**
```
Email: hannah@muse.shopping
Password: MuseAdmin2024!
```

**User ID:** 96

---

## 🚀 Quick Start

### 1. Make Sure Server is Running
```bash
npm run dev
```

### 2. Open Browser
```
http://localhost:3000/api/v1/admin/email-ui/login
```

### 3. Login
- Email: `hannah@muse.shopping`
- Password: `MuseAdmin2024!`

### 4. Start Managing Emails!
- Compose emails
- Send to individuals or groups
- Target by criteria
- Track performance

---

## 🆕 New Features Added

### 1. **Request Access Button**
- Added "Request Admin Access" link on login page
- Anyone can submit a request for admin access
- Requests need to be approved by an existing admin

### 2. **Admin Signup System**
- Database table: `admin_signup_requests`
- API endpoints for managing requests
- Approval/rejection workflow

### 3. **Easy Admin Creation**
- Script: `create-admin-simple.js`
- Edit the script and run: `node create-admin-simple.js`
- Creates admin accounts with hashed passwords

---

## 📝 Request Access Workflow

### How It Works

1. **Someone Requests Access:**
   - Clicks "Request Admin Access" on login page
   - Fills in:
     - Full Name
     - Email
     - Reason for access
   - Submits request

2. **Request is Pending:**
   - Stored in database with "pending" status
   - Waits for admin approval

3. **Admin Approves/Rejects:**
   - Use API endpoints to approve or reject
   - On approval: admin account is created automatically
   - On rejection: request is marked as rejected

---

## 🔧 Managing Signup Requests (API)

### Get Pending Requests
```bash
curl http://localhost:3000/api/v1/admin/signup-requests/pending \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Get All Requests
```bash
curl http://localhost:3000/api/v1/admin/signup-requests \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Approve Request
```bash
curl -X POST http://localhost:3000/api/v1/admin/signup-requests/REQUEST_ID/approve \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"password": "NewAdminPassword123!"}'
```

### Reject Request
```bash
curl -X POST http://localhost:3000/api/v1/admin/signup-requests/REQUEST_ID/reject \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rejection_reason": "Not authorized"}'
```

---

## 🎨 What Was Added

### Files Created

1. **Migration:** `migrations/057_create_admin_signup_requests.sql`
   - Creates `admin_signup_requests` table

2. **Migration:** `migrations/058_add_is_admin_to_users.sql`
   - Adds `is_admin` column to `users` table

3. **Controller:** `src/controllers/adminSignupController.js`
   - Handles signup requests and approvals

4. **Routes:** `src/routes/admin/signupRequests.js`
   - API endpoints for signup requests

5. **Scripts:**
   - `create-admin.js` - Interactive version
   - `create-admin-simple.js` - Simple version (edit and run)

### Files Modified

1. **Login Page:** `src/routes/admin/email-admin-login.html`
   - Added "Request Admin Access" button
   - Added modal for request form
   - Added JavaScript for form submission

2. **Main Routes:** `src/routes/index.js`
   - Registered signup request routes

---

## 👥 Creating More Admin Accounts

### Method 1: Edit and Run Script
```bash
# 1. Edit create-admin-simple.js
# 2. Change the values:
const adminDetails = {
  fullName: 'John Doe',
  email: 'john@muse.shopping',
  password: 'SecurePassword123!'
};

# 3. Run the script
node create-admin-simple.js
```

### Method 2: Approve Signup Requests
1. User requests access via login page
2. You approve the request via API
3. Account is created automatically

---

## 🔒 Security Notes

### Password Requirements
- Minimum 8 characters
- Stored as bcrypt hash
- Never stored in plain text

### Admin Permissions
- `is_admin` column in users table
- Only admins can approve requests
- Only admins can access email management

### Request System
- Public can submit requests
- Only admins can approve/reject
- Email uniqueness enforced
- No duplicate pending requests

---

## 📊 Database Tables

### `users` table
- Added `is_admin` column (BOOLEAN)
- Identifies admin users

### `admin_signup_requests` table
- `id` - Request ID
- `email` - Requester's email
- `full_name` - Requester's name
- `reason` - Why they need access
- `status` - pending/approved/rejected
- `approved_by` - Admin who processed it
- `approved_at` - When processed
- `rejection_reason` - If rejected, why
- `created_at` - When requested

---

## 🎯 Next Steps

1. ✅ **Login with your admin account**
   - URL: http://localhost:3000/api/v1/admin/email-ui/login
   - Email: hannah@muse.shopping
   - Password: MuseAdmin2024!

2. ✅ **Test the email interface**
   - Compose an email
   - Preview it
   - Send to yourself

3. ✅ **Test the request system**
   - Click "Request Admin Access"
   - Submit a test request
   - Approve it via API (practice)

4. ✅ **Create more admins if needed**
   - Use the script or approval system

---

## 🆘 Troubleshooting

### Can't Login?
- Check email and password are correct
- Make sure server is running
- Check browser console for errors

### Request Button Not Showing?
- Refresh the page
- Clear browser cache
- Check that login page loaded completely

### Script Errors?
- Make sure .env is configured
- Check database connection
- Verify all migrations ran

---

## 🎊 Success!

You now have:
- ✅ Admin account created (hannah@muse.shopping)
- ✅ Request Access feature on login page
- ✅ Signup request management system
- ✅ Easy admin creation script
- ✅ Complete API for managing requests

**Start using your admin interface now!**

🌐 **Login:** http://localhost:3000/api/v1/admin/email-ui/login

📧 **Email:** hannah@muse.shopping
🔑 **Password:** MuseAdmin2024!
