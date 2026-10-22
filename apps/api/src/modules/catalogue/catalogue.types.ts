import type { NeighbourhoodId } from "../../lib/neighbourhoods.js";

export type AccessTier = "open" | "restricted" | "synthetic";
export type DataKind = "real" | "derived" | "synthetic" | "reference";

export interface CatalogueDataset {
  id: string;
  neighbourhood_id: NeighbourhoodId;
  slug: string;
  title: string;
  description: string;
  category: string;
  geographic_coverage: string;
  source_organization: string;
  source_url: string | null;
  published_at: string | null;
  acquired_at: string | null;
  observation_period: string | null;
  last_updated: string | null;
  file_format: string | null;
  license: string;
  access_tier: AccessTier;
  privacy_classification: "public" | "anonymized" | "sensitive";
  quality_notes: string;
  methodology: string | null;
  download_available: boolean;
  data_kind: DataKind;
  related_layers: string[];
}

export interface GlanceIndicator {
  id: string;
  label: string;
  value: string | null;
  unit: string | null;
  status: "available" | "tbd" | "unavailable";
  source_organization: string | null;
  reference_year: string | null;
  geographic_scope: string;
  last_updated: string | null;
  confidence: "high" | "medium" | "low" | "unknown";
  source_url: string | null;
  methodology: string | null;
}

export interface ConcernCategory {
  code: string;
  label: string;
  description: string;
}

export interface DataPackMeta {
  neighbourhood_id: NeighbourhoodId;
  title: string;
  subtitle: string;
  version: string;
  status: "draft" | "published";
  published_at: string | null;
  introduction: string;
  process_steps: string[];
  limitations: string[];
  privacy_guidance: string[];
  recommended_use: string[];
  glance: GlanceIndicator[];
  concern_taxonomy: ConcernCategory[];
  datasets: CatalogueDataset[];
}
