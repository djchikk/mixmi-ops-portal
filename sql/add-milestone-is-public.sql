-- Add is_public flag to milestones for filtering what Steve sees
-- Run this in Supabase SQL Editor

ALTER TABLE milestones ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Mark existing done/in_progress milestones as public (adjust individually later)
UPDATE milestones SET is_public = true WHERE status IN ('done', 'in_progress');
