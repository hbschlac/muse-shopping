-- Migration: Create manual order queue for ops team fulfillment
-- When automated order placement fails, create manual task

CREATE TABLE IF NOT EXISTS manual_order_tasks (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  -- Task details
  task_status VARCHAR(50) DEFAULT 'pending', -- pending, claimed, in_progress, completed, failed
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent

  -- Assignment
  assigned_to INTEGER REFERENCES users(id), -- Ops team member
  claimed_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  -- Task context
  failure_reason TEXT, -- Why automated placement failed
  instructions TEXT, -- Special instructions for ops
  notes TEXT, -- Ops team notes

  -- Retry tracking
  automated_attempts INTEGER DEFAULT 0,
  last_automated_attempt_at TIMESTAMP,

  -- Notification tracking
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMP,

  -- Metadata
  task_metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for queue management
CREATE INDEX IF NOT EXISTS idx_manual_order_tasks_status ON manual_order_tasks(task_status) WHERE task_status IN ('pending', 'claimed');
CREATE INDEX IF NOT EXISTS idx_manual_order_tasks_priority ON manual_order_tasks(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_manual_order_tasks_assigned ON manual_order_tasks(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_manual_order_tasks_order ON manual_order_tasks(order_id);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_manual_order_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_manual_order_tasks_updated_at
BEFORE UPDATE ON manual_order_tasks
FOR EACH ROW
EXECUTE FUNCTION update_manual_order_tasks_updated_at();

-- Comments
COMMENT ON TABLE manual_order_tasks IS 'Queue for manual order fulfillment when automated placement fails';
COMMENT ON COLUMN manual_order_tasks.task_status IS 'Task workflow status: pending -> claimed -> in_progress -> completed/failed';
COMMENT ON COLUMN manual_order_tasks.priority IS 'Task priority for ops queue sorting';
COMMENT ON COLUMN manual_order_tasks.failure_reason IS 'Reason why automated placement failed (for ops context)';
