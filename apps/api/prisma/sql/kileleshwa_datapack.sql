-- Kileleshwa Data Package foundation tables (P0).
-- Apply after existing schema. Safe to re-run with IF NOT EXISTS.

DO $$ BEGIN
  CREATE TYPE "NeighbourhoodId" AS ENUM ('kilimani', 'kileleshwa');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DatasetAccessTier" AS ENUM ('open', 'restricted', 'synthetic');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DatasetDataKind" AS ENUM ('real', 'derived', 'synthetic', 'reference');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS neighbourhoods (
  id              "NeighbourhoodId" PRIMARY KEY,
  display_name    TEXT NOT NULL,
  center_lat      DOUBLE PRECISION NOT NULL,
  center_lng      DOUBLE PRECISION NOT NULL,
  bbox_json       TEXT NOT NULL,
  boundary_status TEXT NOT NULL,
  boundary_source TEXT NOT NULL,
  boundary_note   TEXT NOT NULL,
  reporting_mode  TEXT NOT NULL,
  description     TEXT NOT NULL,
  active          BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS datasets (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neighbourhood_id        "NeighbourhoodId" NOT NULL REFERENCES neighbourhoods(id),
  slug                    TEXT NOT NULL,
  title                   TEXT NOT NULL,
  description             TEXT NOT NULL,
  category                TEXT NOT NULL,
  geographic_coverage     TEXT NOT NULL,
  source_organization     TEXT NOT NULL,
  source_url              TEXT,
  published_at            TIMESTAMPTZ,
  acquired_at             TIMESTAMPTZ,
  observation_period      TEXT,
  last_updated            TIMESTAMPTZ,
  file_format             TEXT,
  license                 TEXT NOT NULL,
  access_tier             "DatasetAccessTier" NOT NULL,
  privacy_classification  TEXT NOT NULL,
  quality_notes           TEXT NOT NULL,
  methodology             TEXT,
  download_available      BOOLEAN NOT NULL DEFAULT false,
  data_kind               "DatasetDataKind" NOT NULL,
  published               BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (neighbourhood_id, slug)
);

CREATE INDEX IF NOT EXISTS datasets_neighbourhood_tier_idx
  ON datasets (neighbourhood_id, access_tier);

CREATE TABLE IF NOT EXISTS data_packs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neighbourhood_id "NeighbourhoodId" NOT NULL REFERENCES neighbourhoods(id),
  version          TEXT NOT NULL,
  title            TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'draft',
  published_at     TIMESTAMPTZ,
  summary          TEXT,
  methodology      TEXT,
  UNIQUE (neighbourhood_id, version)
);

CREATE TABLE IF NOT EXISTS concern_types (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neighbourhood_id "NeighbourhoodId" NOT NULL REFERENCES neighbourhoods(id),
  code             TEXT NOT NULL,
  label            TEXT NOT NULL,
  description      TEXT NOT NULL,
  sort_order       INT NOT NULL DEFAULT 0,
  UNIQUE (neighbourhood_id, code)
);

-- Seed neighbourhood metadata (provisional boundaries — not authoritative polygons).
INSERT INTO neighbourhoods (
  id, display_name, center_lat, center_lng, bbox_json,
  boundary_status, boundary_source, boundary_note, reporting_mode, description
) VALUES
(
  'kilimani',
  'Kilimani',
  -1.2921,
  36.785,
  '[-1.32,-1.27,36.76,36.81]',
  'provisional_mvp',
  'UrbanMesh MVP framing boxes (not IEBC polygons)',
  'Pilot corridors and ward boxes used for Kilimani hazard reporting. Replace with authoritative polygons before publishing boundary-derived area statistics.',
  'infrastructure_hazards',
  'Community infrastructure hazard reporting with spatial corroboration for LPDP evidence.'
),
(
  'kileleshwa',
  'Kileleshwa',
  -1.2835,
  36.778,
  '[-1.295,-1.272,36.765,36.792]',
  'provisional_mvp',
  'UrbanMesh MVP framing box — pending authoritative ward boundary',
  'Provisional framing only. Neighbourhood name and administrative ward are not interchangeable until an authoritative boundary is validated.',
  'community_planning',
  'Community-led planning data pack: neighbourhood evidence, development patterns, and service-delivery concerns.'
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  center_lat = EXCLUDED.center_lat,
  center_lng = EXCLUDED.center_lng,
  bbox_json = EXCLUDED.bbox_json,
  boundary_status = EXCLUDED.boundary_status,
  boundary_source = EXCLUDED.boundary_source,
  boundary_note = EXCLUDED.boundary_note,
  reporting_mode = EXCLUDED.reporting_mode,
  description = EXCLUDED.description;

-- Draft data pack version (metadata only; catalogue content still served from code until DB-backed publish lands).
INSERT INTO data_packs (neighbourhood_id, version, title, status, summary, methodology)
VALUES (
  'kileleshwa',
  '0.1.0-draft',
  'Growing Better: Community-Led Planning for Kileleshwa',
  'draft',
  'Structured evidence resource. Statistics appear only when sourced.',
  'Missing indicators are TBD. Provisional bbox is not used for published area stats.'
)
ON CONFLICT (neighbourhood_id, version) DO NOTHING;

-- Kileleshwa concern taxonomy (structural labels only — no submissions).
INSERT INTO concern_types (neighbourhood_id, code, label, description, sort_order)
VALUES
  ('kileleshwa', 'water', 'Water', 'Water supply reliability, quality, and access concerns.', 1),
  ('kileleshwa', 'sewerage_drainage', 'Sewerage and drainage', 'Sewerage, stormwater, and drainage performance.', 2),
  ('kileleshwa', 'waste_sanitation', 'Waste and sanitation', 'Solid waste collection and sanitation conditions.', 3),
  ('kileleshwa', 'roads_mobility', 'Roads, mobility, and walkability', 'Roads, paths, and mobility barriers.', 4),
  ('kileleshwa', 'street_lighting', 'Street lighting', 'Public lighting adequacy and coverage.', 5),
  ('kileleshwa', 'environment_green', 'Environment and green space', 'Trees, open space, and environmental quality.', 6),
  ('kileleshwa', 'development_planning', 'Development and planning', 'Land-use change, density, and planning compliance concerns.', 7),
  ('kileleshwa', 'safety_security', 'Safety and security', 'Personal safety perceptions and related public-realm issues.', 8),
  ('kileleshwa', 'governance_services', 'Governance and service delivery', 'Institutional response and service delivery performance.', 9)
ON CONFLICT (neighbourhood_id, code) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;
