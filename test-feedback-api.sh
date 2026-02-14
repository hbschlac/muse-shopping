#!/bin/bash

echo "🧪 Testing Feedback System API..."
echo ""

# Test 1: Submit feedback
echo "📝 Test 1: Submitting feedback..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "category": "bug",
    "subject": "Test feedback from API test script",
    "message": "This is a test message to verify the feedback system is working correctly. It needs to be at least 20 characters long.",
    "email": "test@muse.shopping",
    "fullName": "Test User"
  }')

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Extract ticket number
TICKET=$(echo "$RESPONSE" | jq -r '.data.ticketNumber' 2>/dev/null)

if [ "$TICKET" != "null" ] && [ ! -z "$TICKET" ]; then
    echo "✅ Feedback submitted successfully!"
    echo "🎟️  Ticket Number: $TICKET"
    echo ""
    
    echo "📊 Checking database..."
    psql -U muse_admin -d muse_shopping_dev -c "
        SELECT ticket_number, category, subject, status, email 
        FROM feedback_submissions 
        WHERE ticket_number = '$TICKET';
    " 2>&1
else
    echo "❌ Failed to submit feedback"
    echo "Make sure the backend server is running: npm start"
fi

echo ""
echo "✅ Test Complete!"
