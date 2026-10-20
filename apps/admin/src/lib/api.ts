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
  if (init.body && !headers.has("Content-Type")) {
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
