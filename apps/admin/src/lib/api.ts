import { clearAdminToken, loadAdminToken } from "./auth";

const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

export type ReviewStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "flagged"
  | "resolved"
  | "archived"
  | "disproved"
  | "under_review";

export type AdminAction =
  | "approve_field"
  | "disprove"
  | "reject"
  | "flag"
  | "under_review"
  | "resolve"
  | "reopen"
  | "archive"
  | "delete"
  | "restore"
  | "merge_duplicate"
  | "reset_queue"
  | "edit_category";

export interface AdminIncident {
  id: string;
  category: string;
  category_label: string;
  description: string;
  lat: number;
  lng: number;
  cluster_id: string | null;
  is_verified: boolean;
  community_supported: boolean;
  status: "verified" | "pending";
  review_status: ReviewStatus;
  reviewed_at: string | null;
  review_note: string | null;
  field_verified: boolean;
  field_verified_at: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  duplicate_of_id: string | null;
  severity: "critical" | "standard";
  photo_url: string | null;
  created_at: string;
  ward_name: string;
  corridor: string;
  nearby_count: number;
}

export interface AdminAuditEntry {
  id: string;
  incident_id: string | null;
  action: string;
  actor: string;
  reason: string | null;
  created_at: string;
}

export interface AdminListResponse {
  count: number;
  total_matching: number;
  offset: number;
  limit: number;
  summary: Record<ReviewStatus, number> & {
    community_supported: number;
    field_verified: number;
  };
  incidents: AdminIncident[];
}

export interface AdminDetailResponse {
  incident: AdminIncident;
  nearby: AdminIncident[];
  cluster_members: AdminIncident[];
  audit: AdminAuditEntry[];
  rules: {
    cluster_threshold: number;
    cluster_radius_meters: number;
  };
}

export interface DashboardStats {
  total: number;
  pending_review: number;
  community_supported: number;
  field_verified: number;
  awaiting_field_inspection: number;
  disproved: number;
  resolved: number;
  flagged: number;
  rejected: number;
  archived: number;
  under_review: number;
  cluster_threshold: number;
  cluster_radius_meters: number;
  by_category: { category: string; label: string; count: number }[];
  recent_actions: AdminAuditEntry[];
  recent_reports: AdminIncident[];
}

export interface DisproveReason {
  id: string;
  label: string;
  requiresNote: boolean;
}

export interface PlannerMetrics {
  generated_at: string;
  totals: {
    all: number;
    verified: number;
    unverified: number;
    clusters: number;
    affected_areas: number;
  };
  by_category: {
    category: string;
    label: string;
    count: number;
    verified: number;
    unverified: number;
  }[];
  by_ward: {
    ward_id: string;
    ward_name: string;
    total: number;
    verified: number;
    unverified: number;
  }[];
}

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = loadAdminToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (
    init.body &&
    !(init.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
  } & T;

  if (res.status === 401) {
    clearAdminToken();
    throw new Error(data.error ?? "Admin sign-in required.");
  }
  if (!res.ok) {
    throw new Error(data.error ?? "Request failed.");
  }
  return data;
}

export async function verifySession(): Promise<{
  ok: boolean;
  disprove_reasons?: DisproveReason[];
  rules?: {
    cluster_threshold: number;
    cluster_radius_meters: number;
  };
}> {
  try {
    return await requestJson("/api/v1/admin/session");
  } catch {
    return { ok: false };
  }
}

export async function fetchDashboard(): Promise<DashboardStats> {
  return requestJson<DashboardStats>("/api/v1/admin/dashboard");
}

export interface AdminAnalytics {
  generated_at: string;
  rules: {
    cluster_threshold: number;
    cluster_radius_meters: number;
  };
  overview: {
    total: number;
    open: number;
    pending_review: number;
    under_review: number;
    flagged: number;
    community_supported: number;
    field_verified: number;
    awaiting_field_inspection: number;
    resolved: number;
    disproved: number;
    archived: number;
    with_photo: number;
    without_photo: number;
    photo_coverage_pct: number;
    community_rate_pct: number;
    field_rate_pct: number;
  };
  age_buckets: {
    under_24h: number;
    days_1_7: number;
    days_7_30: number;
    over_30d: number;
  };
  resolution: {
    resolved_count: number;
    avg_hours_to_resolve: number | null;
    median_hours_to_resolve: number | null;
    avg_hours_to_field_verify: number | null;
    median_hours_to_field_verify: number | null;
  };
  by_category: Array<{
    category: string;
    label: string;
    count: number;
    community_supported: number;
    field_verified: number;
    resolved: number;
    disproved: number;
    open: number;
  }>;
  hotspots_corridor: Array<{
    corridor: string;
    count: number;
    community_supported: number;
    open: number;
  }>;
  hotspots_ward: Array<{
    ward_id: string;
    ward_name: string;
    count: number;
    community_supported: number;
    open: number;
  }>;
  trend_14d: Array<{
    date: string;
    submitted: number;
    resolved: number;
    disproved: number;
    field_verified: number;
  }>;
  admin_actions_30d: Array<{ action: string; count: number }>;
  severity: { critical: number; standard: number };
}

export async function fetchAdminAnalytics(): Promise<AdminAnalytics> {
  return requestJson<AdminAnalytics>("/api/v1/admin/analytics");
}

export async function fetchAdminReports(params: {
  review?: ReviewStatus | "all" | "queue";
  category?: string;
  q?: string;
  field?: "any" | "verified" | "unverified";
  community?: "any" | "supported" | "pending";
  sort?: "created_desc" | "created_asc" | "updated_desc";
  limit?: number;
  offset?: number;
}): Promise<AdminListResponse> {
  const qs = new URLSearchParams();
  qs.set("review", params.review ?? "all");
  qs.set("limit", String(params.limit ?? 50));
  qs.set("offset", String(params.offset ?? 0));
  qs.set("sort", params.sort ?? "created_desc");
  if (params.category && params.category !== "all") {
    qs.set("category", params.category);
  }
  if (params.q?.trim()) qs.set("q", params.q.trim());
  if (params.field && params.field !== "any") qs.set("field", params.field);
  if (params.community && params.community !== "any") {
    qs.set("community", params.community);
  }
  return requestJson<AdminListResponse>(`/api/v1/admin/reports?${qs}`);
}

export async function fetchAdminDetail(id: string): Promise<AdminDetailResponse> {
  return requestJson<AdminDetailResponse>(`/api/v1/admin/reports/${id}`);
}

export async function fetchGlobalAudit(limit = 100) {
  return requestJson<{ count: number; audit: AdminAuditEntry[] }>(
    `/api/v1/admin/audit?limit=${limit}`,
  );
}

export async function fetchDisproveReasons(): Promise<DisproveReason[]> {
  const data = await requestJson<{ reasons: DisproveReason[] }>(
    "/api/v1/admin/disprove-reasons",
  );
  return data.reasons;
}

export async function fetchPlannerMetrics(): Promise<PlannerMetrics> {
  return requestJson<PlannerMetrics>("/api/v1/dashboard/metrics");
}

export interface NeighbourhoodInfo {
  id: "kilimani" | "kileleshwa";
  display_name: string;
  short_label: string;
  center: [number, number];
  bbox: [number, number, number, number];
  boundary_status: string;
  boundary_source: string;
  boundary_note: string;
  reporting_mode: string;
  description: string;
}

export interface CatalogueDataset {
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
  file_format?: string | null;
}

export interface AdminDataset extends CatalogueDataset {
  published: boolean;
  archived: boolean;
  original_filename: string | null;
  has_file: boolean;
  replace_of_id: string | null;
  validation: {
    ok: boolean;
    format: string | null;
    checks: string[];
    errors: string[];
    archived?: boolean;
  } | null;
}

export interface DataQualityCounts {
  generated_at: string;
  datasets: {
    total: number;
    by_category: { category: string; count: number }[];
    by_tier: { tier: string; count: number }[];
    missing_metadata: number;
    unpublished: number;
    archived: number;
    with_file: number;
    synthetic: number;
  };
  concerns: {
    awaiting_review: number;
    accepted: number;
    rejected: number;
    archived: number;
    synthetic: number;
  };
  packs: {
    total: number;
    by_status: { status: string; count: number }[];
    versions: { neighbourhood_id: string; version: string; status: string }[];
  };
  layers: {
    total: number;
    published: number;
    stale_or_never_refreshed: number;
    by_neighbourhood: {
      neighbourhood_id: string;
      count: number;
      refreshed_at_latest: string | null;
    }[];
  };
}

async function requestForm<T>(path: string, form: FormData): Promise<T> {
  const token = loadAdminToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: form,
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
  } & T;
  if (res.status === 401) {
    clearAdminToken();
    throw new Error(data.error ?? "Admin sign-in required.");
  }
  if (!res.ok) {
    throw new Error(data.error ?? "Request failed.");
  }
  return data;
}

export async function fetchNeighbourhoods() {
  return requestJson<{ count: number; neighbourhoods: NeighbourhoodInfo[] }>(
    "/api/v1/catalogue/neighbourhoods",
  );
}

export async function fetchCatalogue(
  neighbourhood: "kilimani" | "kileleshwa",
) {
  return requestJson<{
    neighbourhood_id: string;
    count: number;
    datasets: CatalogueDataset[];
  }>(`/api/v1/catalogue/catalogue?neighbourhood=${neighbourhood}&tier=all`);
}

export async function fetchAdminDatasets(
  neighbourhood?: "kilimani" | "kileleshwa",
) {
  const qs = neighbourhood ? `?neighbourhood=${neighbourhood}` : "";
  return requestJson<{ count: number; datasets: AdminDataset[] }>(
    `/api/v1/admin/datasets${qs}`,
  );
}

export async function uploadAdminDataset(form: FormData) {
  return requestForm<{ ok: boolean; dataset: AdminDataset }>(
    "/api/v1/admin/datasets",
    form,
  );
}

export async function patchAdminDataset(
  id: string,
  body: Record<string, unknown>,
) {
  return requestJson<{ ok: boolean; dataset: AdminDataset }>(
    `/api/v1/admin/datasets/${id}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

export async function publishAdminDataset(id: string) {
  return requestJson<{ ok: boolean; dataset: AdminDataset }>(
    `/api/v1/admin/datasets/${id}/publish`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function unpublishAdminDataset(id: string) {
  return requestJson<{ ok: boolean; dataset: AdminDataset }>(
    `/api/v1/admin/datasets/${id}/unpublish`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function archiveAdminDataset(id: string) {
  return requestJson<{ ok: boolean; dataset: AdminDataset }>(
    `/api/v1/admin/datasets/${id}/archive`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function restoreAdminDataset(id: string) {
  return requestJson<{ ok: boolean; dataset: AdminDataset }>(
    `/api/v1/admin/datasets/${id}/restore`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

/** Authenticated download — never use a public /uploads/datasets URL. */
export async function downloadAdminDataset(id: string, fallbackName: string) {
  const token = loadAdminToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_BASE}/api/v1/admin/datasets/${id}/download`, {
    headers,
  });
  if (res.status === 401) {
    clearAdminToken();
    throw new Error("Admin sign-in required.");
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Download failed.");
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="([^"]+)"/i.exec(disposition);
  const filename = match?.[1] || fallbackName || "dataset";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function uploadNeighbourhoodBoundary(
  id: "kilimani" | "kileleshwa",
  form: FormData,
) {
  return requestForm<{
    ok: boolean;
    neighbourhood_id: string;
    status: string;
    source: string;
    version: string;
  }>(`/api/v1/admin/neighbourhoods/${id}/boundary`, form);
}

export async function refreshNeighbourhoodLayers(
  id: "kilimani" | "kileleshwa",
) {
  return requestJson<{
    ok: boolean;
    neighbourhood_id: string;
    refreshed: string[];
    skipped: string[];
    layers?: unknown[];
  }>(`/api/v1/admin/neighbourhoods/${id}/layers/refresh`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function fetchDataQuality() {
  return requestJson<DataQualityCounts>("/api/v1/admin/data-quality");
}

export async function runAdminAction(
  id: string,
  action: AdminAction,
  body: Record<string, string> = {},
) {
  return requestJson<{ ok: boolean; incident: AdminIncident }>(
    `/api/v1/admin/reports/${id}/actions/${action}`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export type ConcernReviewStatus =
  | "under_review"
  | "accepted"
  | "rejected"
  | "archived";

export type ConcernAdminAction =
  | "accept_for_publication"
  | "reject"
  | "archive"
  | "under_review";

export interface AdminConcern {
  id: string;
  neighbourhood_id: string;
  concern_type_code: string;
  concern_type_label: string;
  title: string;
  description: string;
  evidence_type: string;
  review_status: ConcernReviewStatus | string;
  review_note: string | null;
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

export interface AdminConcernListResponse {
  count: number;
  total_matching: number;
  offset: number;
  limit: number;
  summary: Record<ConcernReviewStatus, number> & { synthetic: number };
  concerns: AdminConcern[];
}

export async function fetchAdminConcerns(params: {
  status?: ConcernReviewStatus | "all" | "queue";
  neighbourhood?: "kilimani" | "kileleshwa" | "all";
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminConcernListResponse> {
  const qs = new URLSearchParams();
  qs.set("status", params.status ?? "under_review");
  qs.set("limit", String(params.limit ?? 100));
  qs.set("offset", String(params.offset ?? 0));
  if (params.neighbourhood && params.neighbourhood !== "all") {
    qs.set("neighbourhood", params.neighbourhood);
  }
  if (params.q?.trim()) qs.set("q", params.q.trim());
  return requestJson<AdminConcernListResponse>(
    `/api/v1/admin/concerns?${qs}`,
  );
}

export async function runConcernAction(
  id: string,
  action: ConcernAdminAction,
  reason?: string,
) {
  return requestJson<{ ok: boolean; action: string; concern: AdminConcern }>(
    `/api/v1/admin/concerns/${id}/action`,
    {
      method: "POST",
      body: JSON.stringify({ action, reason }),
    },
  );
}

export async function downloadDatasetBlob(id: string): Promise<{
  blob: Blob;
  filename: string;
}> {
  const token = loadAdminToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_BASE}/api/v1/admin/datasets/${id}/download`, {
    headers,
  });
  if (res.status === 401) {
    clearAdminToken();
    throw new Error("Admin sign-in required.");
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Download failed.");
  }
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  const filename = match?.[1] ?? `dataset-${id.slice(0, 8)}`;
  return { blob: await res.blob(), filename };
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

export async function fetchCatalogueLayers(
  neighbourhood: "kilimani" | "kileleshwa",
) {
  return requestJson<{
    neighbourhood_id: string;
    count: number;
    layers: CatalogueLayerMeta[];
    attribution: string;
  }>(`/api/v1/catalogue/layers?neighbourhood=${neighbourhood}`);
}

export async function publishDataPack(body: {
  neighbourhood_id: "kilimani" | "kileleshwa";
  version: string;
  title: string;
  dataset_ids: string[];
  layer_keys: string[];
  methodology?: string;
  summary?: string;
}) {
  return requestJson<{
    ok: boolean;
    pack: {
      id: string;
      neighbourhood_id: string;
      version: string;
      title: string;
      status: string;
      published_at: string | null;
    };
  }>("/api/v1/admin/data-packs", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Aliases for pages that use shorter names */
export const uploadDataset = uploadAdminDataset;
export const patchDataset = patchAdminDataset;
export const publishDataset = publishAdminDataset;
export const unpublishDataset = unpublishAdminDataset;
export const archiveDataset = archiveAdminDataset;
export const uploadBoundary = uploadNeighbourhoodBoundary;
export const refreshOsmLayers = refreshNeighbourhoodLayers;

const PHOTO_PATH =
  /^\/uploads\/photos\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$/i;

/**
 * Resolve a stored photo_url to a browser src.
 * Always uses a same-origin `/uploads/photos/…` path when possible so Vercel
 * rewrites (or Vite proxy) hit the API — never open a bare filename.
 */
export function photoSrc(url: string | null): string | null {
  if (!url) return null;
  let pathName = url.trim();
  if (/^https?:\/\//i.test(pathName)) {
    try {
      pathName = new URL(pathName).pathname;
    } catch {
      return null;
    }
  }
  // Bare uuid.ext from bad clients / older rows
  if (/^[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/i.test(pathName)) {
    pathName = `/uploads/photos/${pathName}`;
  }
  if (!pathName.startsWith("/")) pathName = `/${pathName}`;
  const clean = pathName.split("?")[0];
  if (!PHOTO_PATH.test(clean)) return null;
  return `${API_BASE}${clean}`;
}

/** Path only — useful for admin diagnostics when the file 404s. */
export function photoPath(url: string | null): string | null {
  const src = photoSrc(url);
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) {
    try {
      return new URL(src).pathname;
    } catch {
      return null;
    }
  }
  return src.split("?")[0];
}
