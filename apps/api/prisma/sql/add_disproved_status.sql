-- Add DISPROVED / UNDER_REVIEW and migrate legacy REJECTED rows.
--   psql "$DATABASE_URL" -f apps/api/prisma/sql/add_disproved_status.sql

DO $$ BEGIN
  ALTER TYPE "ReviewStatus" ADD VALUE IF NOT EXISTS 'DISPROVED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "ReviewStatus" ADD VALUE IF NOT EXISTS 'UNDER_REVIEW';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

UPDATE incidents
SET review_status = 'DISPROVED'
WHERE review_status::text = 'REJECTED';
