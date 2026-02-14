-- Add tech_help category to feedback system
-- This allows users to submit technical support requests

-- Drop existing check constraint
ALTER TABLE feedback_submissions
  DROP CONSTRAINT IF EXISTS feedback_submissions_category_check;

-- Add new check constraint with tech_help category
ALTER TABLE feedback_submissions
  ADD CONSTRAINT feedback_submissions_category_check
  CHECK (category IN ('bug', 'feature_request', 'tech_help', 'complaint', 'question', 'other'));

-- Comment
COMMENT ON COLUMN feedback_submissions.category IS 'Type of feedback: bug, feature_request, tech_help, complaint, question, other';
