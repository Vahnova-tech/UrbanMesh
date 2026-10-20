-- Field moderation columns for admin approve / reject.
-- Run once against the UrbanMesh database, e.g.:
--   psql "$DATABASE_URL" -f apps/api/prisma/sql/add_review_status.sql

DO $$ BEGIN
  CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS review_status "ReviewStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_note TEXT;

CREATE INDEX IF NOT EXISTS incidents_review_status_idx ON incidents (review_status);
