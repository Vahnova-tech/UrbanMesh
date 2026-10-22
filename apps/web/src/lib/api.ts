const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

export type HazardStatus = "verified" | "pending";

export interface IncidentPublic {
  id: string;
  category: string;
  category_label: string;
  description: string;
  lat: number;
  lng: number;
  h3_index: string;
  cluster_id: string | null;
  is_verified: boolean;
  status: HazardStatus;
  severity: "critical" | "standard";
  photo_url: string | null;
  created_at: string;
  ward_id: string;
  ward_name: string;
  corridor: string;
  nearby_count: number;
}

export interface ReportPayload {
  category: string;
  description: string;
  lat: number;
  lng: number;
  h3_index: string;
  photo_url?: string | null;
}

export interface ReportResponse {
  status: "Verified Cluster Created" | "Incident Logged - Pending Verification";
  incident_id: string;
  cluster_id: string | null;
  is_verified: boolean;
  nearby_count: number;
}

export interface EvidenceResponse {
  incident: IncidentPublic;
  nearby: IncidentPublic[];
  cluster_members: IncidentPublic[];
}

type RequestKind = "load" | "submit" | "photo" | "confirm";

const COPY: Record<RequestKind, { down: string; fallback: string; offline: string }> = {
  load: {
    down: import.meta.env.DEV
      ? "Couldn't load live reports. Start the API on port 3001, then refresh."
      : "Couldn't load live Kilimani reports. Check your connection and try again.",
    fallback: "Couldn't load Kilimani reports. Try again.",
    offline: "You're offline. Reports already on this phone remain visible.",
  },
  submit: {
    down: import.meta.env.DEV
      ? "Couldn't send the report. Start the API on port 3001, then try again."
      : "Couldn't send the report. Check your connection and try again.",
    fallback: "Couldn't send the report. Try again.",
    offline: "You're offline. Reconnect, then send the report.",
  },
  photo: {
    down: import.meta.env.DEV
      ? "Couldn't store the photo. Start the API on port 3001, then try again."
      : "Couldn't store the photo. Check your connection and try again.",
    fallback: "Couldn't store the photo. Photograph the hazard again.",
    offline: "You're offline. Reconnect, then photograph the hazard again.",
  },
  confirm: {
    down: import.meta.env.DEV
      ? "Couldn't add your confirmation. Start the API on port 3001, then try again."
      : "Couldn't add your confirmation. Check your connection and try again.",
    fallback: "Couldn't add your confirmation. Try again.",
    offline: "You're offline. Reconnect, then confirm this hazard.",
  },
};

function isPublicError(message: string): boolean {
  if (!message || message.length > 200) return false;
  return !/prisma|P\d{4}|ECONNREFUSED|EACCES|ENOENT|node_modules|at Object/i.test(
    message,
  );
}

async function requestJson<T>(
  url: string,
  kind: RequestKind,
  init?: RequestInit,
): Promise<T> {
  const copy = COPY[kind];
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error(
      typeof navigator !== "undefined" && navigator.onLine === false
        ? copy.offline
        : copy.down,
    );
  }

  const text = await res.text();
  if (/^\s*</.test(text)) {
    throw new Error(copy.down);
  }
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      throw new Error(res.status >= 500 ? copy.down : copy.fallback);
    }
  }
  if (!res.ok) {
    const server = (body as { error?: string } | null)?.error ?? "";
    if (res.status === 404) {
      throw new Error(
        isPublicError(server) ? server : "This report is not on UrbanMesh.",
      );
    }
    if (res.status >= 500) {
      throw new Error(
        import.meta.env.DEV && isPublicError(server) ? server : copy.down,
      );
    }
    throw new Error(isPublicError(server) ? server : copy.fallback);
  }
  return body as T;
}

export async function fetchReports(params: {
  status?: "verified" | "pending" | "all";
  category?: string;
  limit?: number;
} = {}): Promise<IncidentPublic[]> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.category) query.set("category", params.category);
  if (params.limit) query.set("limit", String(params.limit));
  const data = await requestJson<{ incidents: IncidentPublic[] }>(
    `${API_BASE}/api/v1/reports?${query.toString()}`,
    "load",
  );
  return data.incidents ?? [];
}

export async function fetchNearbyReports(
  lat: number,
  lng: number,
  radius = 800,
): Promise<IncidentPublic[]> {
  const query = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radius: String(radius),
  });
  const data = await requestJson<{ incidents: IncidentPublic[] }>(
    `${API_BASE}/api/v1/reports/nearby?${query.toString()}`,
    "load",
  );
  return data.incidents ?? [];
}

export async function fetchEvidence(id: string): Promise<EvidenceResponse> {
  return requestJson<EvidenceResponse>(`${API_BASE}/api/v1/reports/${id}`, "load");
}

export async function submitHazardReport(
  payload: ReportPayload,
): Promise<ReportResponse> {
  return requestJson<ReportResponse>(`${API_BASE}/api/v1/reports`, "submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function confirmHazard(id: string): Promise<ReportResponse> {
  return requestJson<ReportResponse>(
    `${API_BASE}/api/v1/reports/${id}/confirm`,
    "confirm",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
  );
}

const PHOTO_PATH =
  /^\/uploads\/photos\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$/i;

export async function uploadPhoto(dataUrl: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  const form = new FormData();
  form.append("photo", blob, "hazard.jpg");
  const data = await requestJson<{ url: string }>(
    `${API_BASE}/api/v1/uploads/photos`,
    "photo",
    { method: "POST", body: form },
  );
  return data.url;
}

export function photoSrc(url: string | null): string | null {
  if (!url) return null;
  let pathName = url;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      pathName = new URL(url).pathname;
    } catch {
      return null;
    }
  }
  if (!PHOTO_PATH.test(pathName.split("?")[0])) return null;
  return `${API_BASE}${pathName.split("?")[0]}`;
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

export interface DataPackDataset {
  id: string;
  neighbourhood_id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  geographic_coverage: string;
  source_organization: string;
  source_url: string | null;
  license: string;
  access_tier: "open" | "restricted" | "synthetic";
  privacy_classification: string;
  quality_notes: string;
  methodology: string | null;
  download_available: boolean;
  data_kind: string;
  related_layers: string[];
}

export interface DataPackResponse {
  neighbourhood_id: string;
  title: string;
  subtitle: string;
  version: string;
  status: string;
  published_at: string | null;
  introduction: string;
  process_steps: string[];
  limitations: string[];
  privacy_guidance: string[];
  recommended_use: string[];
  glance: GlanceIndicator[];
  concern_taxonomy: { code: string; label: string; description: string }[];
  datasets: DataPackDataset[];
}

export async function fetchDataPack(
  neighbourhood: "kilimani" | "kileleshwa",
): Promise<DataPackResponse> {
  return requestJson<DataPackResponse>(
    `${API_BASE}/api/v1/catalogue/data-packs/${neighbourhood}`,
    "load",
  );
}

export type ConcernEvidenceType =
  | "community"
  | "field"
  | "public_doc"
  | "derived"
  | "official"
  | "synthetic";

export interface ConcernPublic {
  id: string;
  neighbourhood_id: string;
  concern_type_code: string;
  concern_type_label: string;
  title: string;
  description: string;
  evidence_type: ConcernEvidenceType | string;
  review_status: string;
  lat: number | null;
  lng: number | null;
  area_label: string | null;
  observed_at: string | null;
  source_ref: string | null;
  limitations: string | null;
  research_questions: string | null;
  synthetic: boolean;
  created_at: string;
  reviewed_at: string | null;
}

export interface ConcernSubmitPayload {
  neighbourhood_id: "kilimani" | "kileleshwa";
  concern_type_code: string;
  title: string;
  description: string;
  evidence_type?: ConcernEvidenceType;
  lat?: number | null;
  lng?: number | null;
  area_label?: string | null;
}

export interface ConcernSubmitResponse {
  concern_id: string;
  review_status: string;
  message?: string;
}

export async function submitConcern(
  payload: ConcernSubmitPayload,
): Promise<ConcernSubmitResponse> {
  return requestJson<ConcernSubmitResponse>(
    `${API_BASE}/api/v1/concerns`,
    "submit",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchConcern(id: string): Promise<ConcernPublic> {
  const data = await requestJson<{ concern: ConcernPublic }>(
    `${API_BASE}/api/v1/concerns/${id}`,
    "load",
  );
  return data.concern;
}

export async function fetchPublicConcerns(params: {
  neighbourhood?: "kilimani" | "kileleshwa";
  includeSynthetic?: boolean;
  limit?: number;
} = {}): Promise<{
  count: number;
  non_synthetic_count: number;
  concerns: ConcernPublic[];
}> {
  const query = new URLSearchParams();
  if (params.neighbourhood) query.set("neighbourhood", params.neighbourhood);
  if (params.includeSynthetic) query.set("include_synthetic", "1");
  if (params.limit) query.set("limit", String(params.limit));
  return requestJson(
    `${API_BASE}/api/v1/concerns?${query.toString()}`,
    "load",
  );
}

export async function fetchBoundary(
  neighbourhood: "kilimani" | "kileleshwa",
) {
  return requestJson<{
    neighbourhood_id: string;
    status: string;
    source: string;
    version: string | null;
    area_km2: number | null;
    feature: {
      type: "Feature";
      properties?: Record<string, unknown> | null;
      geometry: { type: string; coordinates: unknown };
    };
  }>(
    `${API_BASE}/api/v1/catalogue/neighbourhoods/${neighbourhood}/boundary`,
    "load",
  );
}

export interface CatalogueLayerMeta {
  id: string;
  neighbourhood_id: string;
  layer_key: string;
  title: string;
  category: string;
  source: string;
  attribution: string;
  observation_period: string | null;
  access_tier: string;
  published: boolean;
  feature_count: number;
  refreshed_at: string | null;
}

export interface LayerGeoJsonResponse {
  layer_key: string;
  title: string;
  attribution: string;
  feature_count: number;
  collection: GeoJSON.FeatureCollection;
}

export async function fetchLayers(
  neighbourhood: "kilimani" | "kileleshwa",
): Promise<{
  neighbourhood_id: string;
  count: number;
  layers: CatalogueLayerMeta[];
  attribution: string;
}> {
  return requestJson(
    `${API_BASE}/api/v1/catalogue/layers?neighbourhood=${neighbourhood}`,
    "load",
  );
}

export async function fetchLayerGeoJson(
  neighbourhood: "kilimani" | "kileleshwa",
  layerKey: string,
): Promise<LayerGeoJsonResponse> {
  return requestJson(
    `${API_BASE}/api/v1/catalogue/layers/${neighbourhood}/${encodeURIComponent(layerKey)}`,
    "load",
  );
}

export interface CatalogueSearchHit {
  kind: "dataset" | "concern" | "layer" | "planning_doc" | "proposal" | "hazard";
  id: string;
  neighbourhood_id: string;
  title: string;
  subtitle: string | null;
  category: string | null;
  href: string;
}

export async function searchCatalogue(params: {
  q: string;
  neighbourhood?: "kilimani" | "kileleshwa";
  category?: string;
  tier?: string;
}): Promise<{ count: number; results: CatalogueSearchHit[] }> {
  const query = new URLSearchParams();
  query.set("q", params.q);
  if (params.neighbourhood) query.set("neighbourhood", params.neighbourhood);
  if (params.category) query.set("category", params.category);
  if (params.tier) query.set("tier", params.tier);
  return requestJson(
    `${API_BASE}/api/v1/catalogue/search?${query.toString()}`,
    "load",
  );
}

export interface PlanningTimelineItem {
  id: string;
  title: string;
  observed_at: string | null;
  source_url: string | null;
  notes: string | null;
  before_after_available: boolean;
  before_image_ref: string | null;
  after_image_ref: string | null;
}

export interface PlanningProposal {
  id: string;
  title: string;
  problem_statement: string;
  interpretation: string;
  created_at: string;
  label: string;
}

export async function fetchPlanningTimeline(
  neighbourhood: "kilimani" | "kileleshwa",
): Promise<{
  neighbourhood_id: string;
  count: number;
  items: PlanningTimelineItem[];
  note: string;
}> {
  return requestJson(
    `${API_BASE}/api/v1/planning/timeline?neighbourhood=${neighbourhood}`,
    "load",
  );
}

export async function fetchPlanningProposals(
  neighbourhood: "kilimani" | "kileleshwa",
): Promise<{
  neighbourhood_id: string;
  count: number;
  proposals: PlanningProposal[];
}> {
  return requestJson(
    `${API_BASE}/api/v1/planning/proposals?neighbourhood=${neighbourhood}`,
    "load",
  );
}

export async function submitPlanningProposal(payload: {
  neighbourhood_id: "kilimani" | "kileleshwa";
  title: string;
  problem_statement: string;
  interpretation?: string;
}): Promise<{ id: string; title: string; label: string }> {
  return requestJson(`${API_BASE}/api/v1/planning/proposals`, "submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export const fetchCatalogueLayers = fetchLayers;
export const fetchProposals = fetchPlanningProposals;
export const submitProposal = submitPlanningProposal;
