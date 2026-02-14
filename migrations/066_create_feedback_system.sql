-- Create feedback_submissions table
-- Stores user feedback with ticket tracking and status management

CREATE TABLE IF NOT EXISTS feedback_submissions (
  id SERIAL PRIMARY KEY,
  ticket_number VARCHAR(50) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  category VARCHAR(50) NOT NULL CHECK (category IN ('bug', 'feature_request', 'complaint', 'question', 'other')),
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'in_progress', 'resolved', 'closed')),
  priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  admin_notes TEXT,
  resolution_notes TEXT,
  user_agent TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  closed_at TIMESTAMP
);

-- Create index on ticket_number for fast lookups
CREATE INDEX idx_feedback_ticket_number ON feedback_submissions(ticket_number);

-- Create index on user_id for user feedback history
CREATE INDEX idx_feedback_user_id ON feedback_submissions(user_id);

-- Create index on status for filtering
CREATE INDEX idx_feedback_status ON feedback_submissions(status);

-- Create index on created_at for sorting
CREATE INDEX idx_feedback_created_at ON feedback_submissions(created_at DESC);

-- Create index on category for filtering
CREATE INDEX idx_feedback_category ON feedback_submissions(category);

-- Create feedback_attachments table
CREATE TABLE IF NOT EXISTS feedback_attachments (
  id SERIAL PRIMARY KEY,
  feedback_id INTEGER NOT NULL REFERENCES feedback_submissions(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on feedback_id for attachments
CREATE INDEX idx_feedback_attachments_feedback_id ON feedback_attachments(feedback_id);

-- Create feedback_responses table for admin responses
CREATE TABLE IF NOT EXISTS feedback_responses (
  id SERIAL PRIMARY KEY,
  feedback_id INTEGER NOT NULL REFERENCES feedback_submissions(id) ON DELETE CASCADE,
  admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on feedback_id for responses
CREATE INDEX idx_feedback_responses_feedback_id ON feedback_responses(feedback_id);

-- Create feedback_ticket_counter table for generating sequential ticket numbers
CREATE TABLE IF NOT EXISTS feedback_ticket_counter (
  id INTEGER PRIMARY KEY DEFAULT 1,
  year INTEGER NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT single_row_check CHECK (id = 1)
);

-- Insert initial counter row
INSERT INTO feedback_ticket_counter (id, year, counter)
VALUES (1, EXTRACT(YEAR FROM CURRENT_TIMESTAMP)::INTEGER, 0)
ON CONFLICT (id) DO NOTHING;

-- Function to generate ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  current_year INTEGER;
  ticket_counter INTEGER;
  ticket_number VARCHAR(50);
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_TIMESTAMP)::INTEGER;

  -- Lock the counter row for update
  SELECT counter INTO ticket_counter
  FROM feedback_ticket_counter
  WHERE id = 1
  FOR UPDATE;

  -- Reset counter if year changed
  IF (SELECT year FROM feedback_ticket_counter WHERE id = 1) != current_year THEN
    UPDATE feedback_ticket_counter
    SET year = current_year, counter = 1
    WHERE id = 1;
    ticket_counter := 1;
  ELSE
    -- Increment counter
    UPDATE feedback_ticket_counter
    SET counter = counter + 1
    WHERE id = 1;
    ticket_counter := ticket_counter + 1;
  END IF;

  -- Generate ticket number format: MUSE-YYYY-NNNNN
  ticket_number := 'MUSE-' || current_year || '-' || LPAD(ticket_counter::TEXT, 5, '0');

  RETURN ticket_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate ticket number on insert
CREATE OR REPLACE FUNCTION set_feedback_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feedback_ticket_number_trigger
BEFORE INSERT ON feedback_submissions
FOR EACH ROW
EXECUTE FUNCTION set_feedback_ticket_number();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feedback_updated_at_trigger
BEFORE UPDATE ON feedback_submissions
FOR EACH ROW
EXECUTE FUNCTION update_feedback_updated_at();

-- Comments for documentation
COMMENT ON TABLE feedback_submissions IS 'Stores user feedback submissions with ticket tracking';
COMMENT ON COLUMN feedback_submissions.ticket_number IS 'Unique ticket number format: MUSE-YYYY-NNNNN';
COMMENT ON COLUMN feedback_submissions.category IS 'Type of feedback: bug, feature_request, complaint, question, other';
COMMENT ON COLUMN feedback_submissions.status IS 'Current status: new, in_review, in_progress, resolved, closed';
COMMENT ON COLUMN feedback_submissions.priority IS 'Priority level: low, medium, high, urgent';
