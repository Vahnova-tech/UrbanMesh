-- Concern evidence records (P1). Safe to re-run with IF NOT EXISTS.

DO $$ BEGIN
  CREATE TYPE "ConcernEvidenceType" AS ENUM (
    'community', 'field', 'public_doc', 'derived', 'official', 'synthetic'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ConcernReviewStatus" AS ENUM (
    'under_review', 'accepted', 'rejected', 'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS concerns (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neighbourhood_id    "NeighbourhoodId" NOT NULL REFERENCES neighbourhoods(id),
  concern_type_code   TEXT NOT NULL,
  title               TEXT NOT NULL,
  description         TEXT NOT NULL,
  evidence_type       "ConcernEvidenceType" NOT NULL,
  review_status       "ConcernReviewStatus" NOT NULL DEFAULT 'under_review',
  review_note         TEXT,
  reviewed_at         TIMESTAMPTZ,
  location            geometry(Point, 4326),
  area_label          TEXT,
  observed_at         TIMESTAMPTZ,
  source_ref          TEXT,
  limitations         TEXT,
  research_questions  TEXT,
  synthetic           BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT concerns_type_fk
    FOREIGN KEY (neighbourhood_id, concern_type_code)
    REFERENCES concern_types (neighbourhood_id, code)
);

CREATE INDEX IF NOT EXISTS concerns_neighbourhood_status_idx
  ON concerns (neighbourhood_id, review_status);

CREATE INDEX IF NOT EXISTS concerns_neighbourhood_type_idx
  ON concerns (neighbourhood_id, concern_type_code);
