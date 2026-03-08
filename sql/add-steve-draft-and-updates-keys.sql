INSERT INTO site_content (key, value) VALUES
  ('steve_draft_narrative', ''),
  ('steve_draft_image_url', ''),
  ('steve_draft_image_caption', ''),
  ('steve_draft_video_url', ''),
  ('steve_draft_video_caption', ''),
  ('steve_updates', '[]')
ON CONFLICT (key) DO NOTHING;
