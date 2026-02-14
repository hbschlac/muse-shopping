-- Migration 064: Add my_referral_code column
-- This stores the unique referral code that THIS user can share with others
-- Different from referral_code which stores the code they used to sign up

ALTER TABLE waitlist_signups
ADD COLUMN IF NOT EXISTS my_referral_code VARCHAR(50);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'waitlist_signups_my_referral_code_key'
  ) THEN
    ALTER TABLE waitlist_signups
    ADD CONSTRAINT waitlist_signups_my_referral_code_key UNIQUE (my_referral_code);
  END IF;
END $$;

-- Create index for lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_signups_my_referral_code ON waitlist_signups(my_referral_code);

-- Add comment
COMMENT ON COLUMN waitlist_signups.my_referral_code IS 'Unique referral code this user can share to refer others';
