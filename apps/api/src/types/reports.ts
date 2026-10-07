/** Geotagged hazard report submitted by the citizen PWA. */
export interface HazardReportInput {
  category:
    | "MOBILITY_SURFACE_DAMAGE"
    | "NMT_PEDESTRIAN_HAZARD"
    | "DRAINAGE_STORMWATER"
    | "SEWER_SANITATION"
    | "LIGHTING_SECURITY"
    | "ILLEGAL_WASTE_DUMP";
  description: string;
  lat: number;
  lng: number;
  /** Uber H3 cell computed on the client (or server) for the report location. */
  h3_index: string;
  /** Path returned by POST /api/v1/uploads/photos (`/uploads/photos/{uuid}.jpg`). */
  photo_url?: string | null;
}

export type IngestionStatus =
  | "Verified Cluster Created"
  | "Incident Logged - Pending Verification";

export interface IngestionResult {
  status: IngestionStatus;
  incident_id: string;
  cluster_id: string | null;
  is_verified: boolean;
  nearby_count: number;
}
