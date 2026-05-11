ALTER TABLE organizations ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();;
