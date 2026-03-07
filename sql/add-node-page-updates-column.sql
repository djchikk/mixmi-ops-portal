ALTER TABLE node_page_content ADD COLUMN updates JSONB DEFAULT '[]'::jsonb;
