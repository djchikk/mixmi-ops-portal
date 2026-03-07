-- Per-node public page content (narrative, media)
CREATE TABLE node_page_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pilot_node_id UUID REFERENCES pilot_nodes(id) UNIQUE,
  narrative TEXT DEFAULT '',
  image_url TEXT,
  image_caption TEXT,
  video_url TEXT,
  video_caption TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE node_page_content ENABLE ROW LEVEL SECURITY;

-- Public read (node pages are public, like Steve page)
CREATE POLICY "Public read" ON node_page_content
  FOR SELECT USING (true);

-- Only authenticated users can edit
CREATE POLICY "Authenticated write" ON node_page_content
  FOR ALL USING (auth.role() = 'authenticated');

-- Seed one empty row per node that has a slug
INSERT INTO node_page_content (pilot_node_id)
SELECT id FROM pilot_nodes WHERE slug IS NOT NULL;
