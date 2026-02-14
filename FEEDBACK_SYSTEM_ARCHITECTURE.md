# 🏗️ Feedback System Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER JOURNEY                             │
└─────────────────────────────────────────────────────────────────┘

User visits /feedback
        ↓
Fills out form:
  • Category (bug, feature, tech_help, complaint, question, other)
  • Subject
  • Message
  • Email
  • Name (optional)
        ↓
Submits form
        ↓
┌───────────────────────┐
│   API Endpoint        │
│ POST /api/v1/feedback │
└───────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────────┐
│ feedbackController.submitFeedback()                            │
│   • Validates input                                            │
│   • Checks category                                            │
│   • Extracts user info                                         │
└───────────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────────┐
│ feedbackService.submitFeedback()                               │
│   • Inserts into database                                      │
│   • Triggers automatic ticket number generation                │
│   • Returns feedback object with ticket number                 │
└───────────────────────────────────────────────────────────────┘
        ↓
Database generates: MUSE-2026-00042
        ↓
        ├─────────────────────────┬──────────────────────────────┐
        ↓                         ↓                              ↓
┌───────────────────┐  ┌─────────────────────┐  ┌──────────────────────┐
│ User receives:    │  │ Email Service       │  │ Team receives:       │
│ • Ticket number   │  │ Sends two emails    │  │ • If regular:        │
│ • Success screen  │  │ asynchronously      │  │   feedback@muse      │
│ • Confirmation    │  │                     │  │ • If tech_help:      │
│   email           │  │                     │  │   feedback@muse +    │
└───────────────────┘  └─────────────────────┘  │   help@muse          │
                                                 └──────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      ADMIN JOURNEY                               │
└─────────────────────────────────────────────────────────────────┘

Admin visits /admin/feedback
        ↓
┌───────────────────────────────────────────────────────────────┐
│ Dashboard Page                                                 │
│   • Fetches statistics via getFeedbackStats()                 │
│   • Fetches all tickets via getAllFeedback(filters)           │
│   • Displays:                                                  │
│     - Total, new, in-progress, resolved counts                │
│     - Category breakdown (6 categories)                       │
│     - Filterable ticket list                                  │
└───────────────────────────────────────────────────────────────┘
        ↓
Admin clicks ticket MUSE-2026-00042
        ↓
┌───────────────────────────────────────────────────────────────┐
│ Ticket Detail Page                                             │
│   • Fetches ticket via getFeedbackByTicket(ticketNumber)     │
│   • Fetches responses via getFeedbackResponses()              │
│   • Displays:                                                  │
│     - Full submission details                                 │
│     - User information                                        │
│     - Status/priority badges                                  │
│     - Response history                                        │
│   • Admin can:                                                 │
│     - Update status (5 levels)                                │
│     - Change priority (4 levels)                              │
│     - Add admin notes (internal)                              │
│     - Add resolution notes                                    │
│     - Add public/private responses                            │
└───────────────────────────────────────────────────────────────┘
        ↓
Admin updates ticket
        ↓
┌───────────────────────────────────────────────────────────────┐
│ updateFeedback() or addFeedbackResponse()                      │
│   • Updates database                                           │
│   • Auto-timestamps (resolved_at, closed_at)                  │
│   • Returns updated ticket                                     │
└───────────────────────────────────────────────────────────────┘
```

---

## Email Routing Logic

```
┌─────────────────────────────────────────────────────────────┐
│ User submits feedback with category                         │
└─────────────────────────────────────────────────────────────┘
                           ↓
                    ┌──────────────┐
                    │ Category?    │
                    └──────────────┘
                           ↓
        ┌──────────────────┼──────────────────┐
        ↓                  ↓                  ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│ tech_help    │  │ Other        │  │                  │
│              │  │ categories   │  │                  │
└──────────────┘  └──────────────┘  └──────────────────┘
        ↓                  ↓
        ↓                  ↓
┌──────────────────────────────────────────────────────────┐
│ emailService.sendFeedbackNotificationEmail()              │
└──────────────────────────────────────────────────────────┘
        ↓                  ↓
        ↓                  ↓
┌──────────────┐  ┌──────────────┐
│ Send to:     │  │ Send to:     │
│ • feedback@  │  │ • feedback@  │
│ • help@      │  │              │
└──────────────┘  └──────────────┘
```

---

## Database Schema

```
┌─────────────────────────────────────────────────────────────┐
│ feedback_submissions                                         │
├─────────────────────────────────────────────────────────────┤
│ id (PK)                  SERIAL                             │
│ ticket_number            VARCHAR(50) UNIQUE                 │
│ user_id                  INTEGER (FK → users)               │
│ email                    VARCHAR(255) NOT NULL              │
│ full_name                VARCHAR(255)                       │
│ category                 VARCHAR(50) NOT NULL               │
│   └─ bug, feature_request, tech_help, complaint,           │
│      question, other                                        │
│ subject                  VARCHAR(255) NOT NULL              │
│ message                  TEXT NOT NULL                      │
│ status                   VARCHAR(50) DEFAULT 'new'          │
│   └─ new, in_review, in_progress, resolved, closed         │
│ priority                 VARCHAR(50) DEFAULT 'medium'       │
│   └─ low, medium, high, urgent                             │
│ assigned_to              INTEGER (FK → users)               │
│ admin_notes              TEXT                               │
│ resolution_notes         TEXT                               │
│ user_agent               TEXT                               │
│ ip_address               VARCHAR(45)                        │
│ created_at               TIMESTAMP DEFAULT NOW()            │
│ updated_at               TIMESTAMP DEFAULT NOW()            │
│ resolved_at              TIMESTAMP                          │
│ closed_at                TIMESTAMP                          │
└─────────────────────────────────────────────────────────────┘
                           ↓
        ┌──────────────────┴──────────────────┐
        ↓                                     ↓
┌────────────────────────┐      ┌────────────────────────┐
│ feedback_attachments   │      │ feedback_responses     │
├────────────────────────┤      ├────────────────────────┤
│ id (PK)                │      │ id (PK)                │
│ feedback_id (FK)       │      │ feedback_id (FK)       │
│ file_name              │      │ admin_id (FK → users)  │
│ file_path              │      │ message                │
│ file_type              │      │ is_public              │
│ file_size              │      │ created_at             │
│ created_at             │      └────────────────────────┘
└────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ feedback_ticket_counter                                     │
├────────────────────────────────────────────────────────────┤
│ id (PK) = 1  (only one row)                                │
│ year         INTEGER (current year)                        │
│ counter      INTEGER (increments per ticket)               │
└────────────────────────────────────────────────────────────┘
        ↓
   Used by generate_ticket_number() function
        ↓
   Returns: MUSE-YYYY-NNNNN
```

---

## API Endpoints

```
┌─────────────────────────────────────────────────────────────┐
│ PUBLIC ENDPOINTS                                             │
└─────────────────────────────────────────────────────────────┘

POST /api/v1/feedback
  • Submit new feedback
  • Body: { category, subject, message, email, fullName }
  • Returns: { ticketNumber, status, createdAt }

┌─────────────────────────────────────────────────────────────┐
│ AUTHENTICATED USER ENDPOINTS                                 │
└─────────────────────────────────────────────────────────────┘

GET /api/v1/feedback/:ticketNumber
  • View specific ticket
  • Access: Owner or Admin
  • Returns: { feedback, responses }

GET /api/v1/feedback/my-submissions
  • View user's own tickets
  • Params: ?limit=50&offset=0
  • Returns: Array of feedback objects

┌─────────────────────────────────────────────────────────────┐
│ ADMIN ENDPOINTS                                              │
└─────────────────────────────────────────────────────────────┘

GET /api/v1/feedback
  • List all feedback
  • Params: ?status=new&category=bug&priority=high
  • Returns: Array of feedback objects

GET /api/v1/feedback/stats
  • Get statistics
  • Returns: {
      total_submissions,
      new_count, in_review_count, in_progress_count,
      resolved_count, closed_count,
      bug_count, feature_request_count, tech_help_count,
      complaint_count, question_count,
      urgent_count, high_count,
      avg_resolution_hours
    }

PATCH /api/v1/feedback/:ticketNumber
  • Update ticket
  • Body: { status, priority, adminNotes, resolutionNotes }
  • Returns: Updated feedback object

POST /api/v1/feedback/:ticketNumber/responses
  • Add response
  • Body: { message, isPublic }
  • Returns: Response object
```

---

## Frontend Components

```
┌─────────────────────────────────────────────────────────────┐
│ PUBLIC PAGES                                                 │
└─────────────────────────────────────────────────────────────┘

app/feedback/page.tsx
  ├─ Category selection (6 options with icons)
  ├─ Subject input
  ├─ Message textarea
  ├─ Email input
  ├─ Full name input (optional)
  ├─ Submit button
  └─ Success screen with ticket number

┌─────────────────────────────────────────────────────────────┐
│ ADMIN PAGES                                                  │
└─────────────────────────────────────────────────────────────┘

app/admin/feedback/page.tsx (Dashboard)
  ├─ Statistics cards
  │   ├─ Total submissions
  │   ├─ New count
  │   ├─ In progress count
  │   └─ Resolved count
  ├─ Category breakdown (6 categories)
  ├─ Filters
  │   ├─ Status dropdown
  │   ├─ Category dropdown
  │   └─ Priority dropdown
  └─ Ticket list
      └─ Clickable ticket cards

app/admin/feedback/[ticketNumber]/page.tsx (Ticket Detail)
  ├─ Ticket header
  │   ├─ Category icon + label
  │   ├─ Ticket number
  │   ├─ Status badge
  │   └─ Priority badge
  ├─ Full message display
  ├─ User information
  ├─ Update ticket form
  │   ├─ Status selector
  │   ├─ Priority selector
  │   ├─ Admin notes textarea
  │   ├─ Resolution notes textarea
  │   └─ Update button
  ├─ Add response form
  │   ├─ Message textarea
  │   ├─ Public/private toggle
  │   └─ Add response button
  └─ Response history
      └─ List of responses (public + internal)
```

---

## State Management Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Feedback Submission (User)                                   │
└─────────────────────────────────────────────────────────────┘

1. formData state (React)
   ↓
2. handleSubmit() → submitFeedback(formData)
   ↓
3. API call → POST /api/v1/feedback
   ↓
4. Backend → feedbackController → feedbackService
   ↓
5. Database INSERT → Auto-generate ticket number
   ↓
6. Send emails (async)
   ↓
7. Return ticket number to frontend
   ↓
8. Update UI state:
   - setSubmitted(true)
   - setTicketNumber(response.ticketNumber)
   ↓
9. Show success screen

┌─────────────────────────────────────────────────────────────┐
│ Admin Dashboard                                              │
└─────────────────────────────────────────────────────────────┘

1. useEffect() on mount
   ↓
2. loadData() → Promise.all([
     getAllFeedback(filters),
     getFeedbackStats()
   ])
   ↓
3. API calls → GET /api/v1/feedback + /stats
   ↓
4. Update state:
   - setFeedback(data)
   - setStats(statsData)
   ↓
5. Render dashboard
   ↓
6. User changes filters
   ↓
7. setFilters() → triggers useEffect
   ↓
8. loadData() again with new filters

┌─────────────────────────────────────────────────────────────┐
│ Ticket Detail + Updates                                      │
└─────────────────────────────────────────────────────────────┘

1. Load ticket: getFeedbackByTicket(ticketNumber)
   ↓
2. Initialize form states:
   - setStatus(feedback.status)
   - setPriority(feedback.priority)
   - setAdminNotes(feedback.admin_notes)
   ↓
3. Admin modifies values
   ↓
4. handleUpdateTicket() →
   updateFeedback(ticketNumber, { status, priority, ... })
   ↓
5. Backend updates database
   ↓
6. Reload ticket: loadTicket()
   ↓
7. UI refreshes with new data
```

---

## Security Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Authentication & Authorization                               │
└─────────────────────────────────────────────────────────────┘

Public Submission
  └─ No auth required
  └─ Rate limiting (via middleware)
  └─ Input validation (Joi schema)

View Own Submissions
  ├─ authenticate middleware
  ├─ Check req.user exists
  └─ Filter by user_id

View Specific Ticket
  ├─ authenticate middleware
  ├─ Check ownership:
  │   └─ req.user.id === feedback.user_id
  │   └─ OR req.user.email === feedback.email
  │   └─ OR req.user.is_admin === true
  └─ Return 403 if unauthorized

Admin Endpoints
  ├─ authenticate middleware
  ├─ Check req.user.is_admin === true
  └─ Return 403 if not admin

Input Validation
  ├─ Category: enum validation
  ├─ Email: format validation
  ├─ Subject: 5-255 chars
  └─ Message: 20-5000 chars
```

---

## Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│ BACKEND                                                      │
└─────────────────────────────────────────────────────────────┘

Database:     PostgreSQL
  └─ Tables: feedback_submissions, feedback_responses,
             feedback_attachments, feedback_ticket_counter
  └─ Functions: generate_ticket_number()
  └─ Triggers: Auto-generate ticket, auto-update timestamps

API:          Node.js + Express
  └─ Routes: /api/v1/feedback
  └─ Middleware: Authentication, validation, rate limiting

Services:
  └─ feedbackService.js: CRUD operations
  └─ emailService.js: Email notifications

Email:        Nodemailer + SMTP
  └─ Templates: HTML + plain text
  └─ Routing: Smart routing for tech_help

┌─────────────────────────────────────────────────────────────┐
│ FRONTEND                                                     │
└─────────────────────────────────────────────────────────────┘

Framework:    Next.js 14 (App Router)
UI:           React + TypeScript
Styling:      Tailwind CSS (Muse brand colors)
State:        React useState + useEffect
API Client:   Custom API wrapper with TypeScript types
Forms:        Controlled components with validation
```

---

## Performance Considerations

```
Database Indexes:
  ✅ idx_feedback_ticket_number (unique lookups)
  ✅ idx_feedback_user_id (user history)
  ✅ idx_feedback_status (filtering)
  ✅ idx_feedback_category (filtering)
  ✅ idx_feedback_created_at (sorting)

API Optimizations:
  ✅ Async email sending (non-blocking)
  ✅ Parameterized queries (SQL injection prevention)
  ✅ Connection pooling (pg pool)
  ✅ Pagination support (limit/offset)

Frontend Optimizations:
  ✅ Client-side filtering (reduces API calls)
  ✅ Debounced search (future enhancement)
  ✅ Lazy loading (Next.js code splitting)
  ✅ Responsive images (mobile optimization)
```

---

This architecture supports:
- ✅ High volume submissions
- ✅ Fast ticket lookups
- ✅ Scalable admin workflows
- ✅ Smart email routing
- ✅ Secure access control
- ✅ Real-time statistics

**System is production-ready!** 🚀
