-- Admin workflow columns + audit log. Run once:
--   psql "$DATABASE_URL" -f apps/api/prisma/sql/admin_workflow.sql
-- Or: cd apps/api && npx prisma db push

DO $$ BEGIN
  ALTER TYPE "ReviewStatus" ADD VALUE IF NOT EXISTS 'FLAGGED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "ReviewStatus" ADD VALUE IF NOT EXISTS 'RESOLVED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "ReviewStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS field_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS field_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution_note TEXT,
  ADD COLUMN IF NOT EXISTS duplicate_of_id UUID;

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID,
  action TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'admin',
  reason TEXT,
  before_json TEXT,
  after_json TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_incident_id_idx ON admin_audit_logs (incident_id);
CREATE INDEX IF NOT EXISTS admin_audit_logs_created_at_idx ON admin_audit_logs (created_at);
CREATE INDEX IF NOT EXISTS incidents_duplicate_of_id_idx ON incidents (duplicate_of_id);
