
-- Allow global (shared) RSS feeds with no specific org owner
ALTER TABLE sources ALTER COLUMN organization_id DROP NOT NULL;

-- Migrate the hardcoded sentinel org feeds to null (truly global)
UPDATE sources
SET organization_id = NULL
WHERE type = 'rss'
  AND organization_id = '00000000-0000-4000-8000-000000000001';
;
