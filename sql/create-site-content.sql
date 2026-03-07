-- Key-value store for editable site content (Steve page narrative, media, etc.)
-- Run this in Supabase SQL Editor

CREATE TABLE site_content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

-- Anyone can read (Steve page is public)
CREATE POLICY "Public read" ON site_content
  FOR SELECT USING (true);

-- Only authenticated users can edit
CREATE POLICY "Authenticated write" ON site_content
  FOR ALL USING (auth.role() = 'authenticated');

-- Seed with defaults
INSERT INTO site_content (key, value) VALUES
  ('steve_narrative', 'We''re in the first weeks of activating four pilot communities across Kenya, the US, and beyond. The ops infrastructure is live, the team is coordinating through AI-powered tools, and our first content uploads are on the horizon.'),
  ('steve_image_url', ''),
  ('steve_image_caption', ''),
  ('steve_video_url', ''),
  ('steve_video_caption', '');

-- ALSO: Create a Storage bucket in Supabase Dashboard:
-- 1. Go to Storage in the Supabase dashboard
-- 2. Create a new bucket called "public-media"
-- 3. Set it to PUBLIC (so /steve can display images without auth)
