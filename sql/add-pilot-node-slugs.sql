-- Add slug column to pilot_nodes for public page URLs
ALTER TABLE pilot_nodes ADD COLUMN slug TEXT UNIQUE;

-- Seed slugs for the four starting nodes
UPDATE pilot_nodes SET slug = 'kenya' WHERE name ILIKE '%kenya%';
UPDATE pilot_nodes SET slug = 'producers' WHERE name ILIKE '%producer%';
UPDATE pilot_nodes SET slug = 'carolyn-friends' WHERE name ILIKE '%carolyn%';
UPDATE pilot_nodes SET slug = 'kevin-locke' WHERE name ILIKE '%kevin locke%';
