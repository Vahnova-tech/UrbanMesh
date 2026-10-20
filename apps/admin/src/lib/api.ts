import { clearAdminToken, loadAdminToken } from "./auth";

const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

export type ReviewStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "flagged"
  | "resolved"
  | "archived";

export type AdminAction =
  | "approve_field"
  | "reject"
  | "flag"
  | "resolve"
  | "reopen"
  | "archive"
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
}

export interface DashboardStats {
  total: number;
  pending_review: number;
  community_supported: number;
  field_verified: number;
  resolved: number;
  flagged: number;
  rejected: number;
  archived: number;
  by_category: { category: string; label: string; count: number }[];
  recent_actions: AdminAuditEntry[];
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

export async function verifySession(): Promise<boolean> {
  try {
    await requestJson<{ ok: boolean }>("/api/v1/admin/session");
    return true;
  } catch {
    return false;
  }
}

export async function fetchDashboard(): Promise<DashboardStats> {
  return requestJson<DashboardStats>("/api/v1/admin/dashboard");
}

export async function fetchAdminReports(params: {
  review?: ReviewStatus | "all" | "queue";
  category?: string;
  q?: string;
}): Promise<AdminListResponse> {
  const qs = new URLSearchParams();
  qs.set("review", params.review ?? "queue");
  qs.set("limit", "400");
  if (params.category && params.category !== "all") {
    qs.set("category", params.category);
  }
  if (params.q?.trim()) qs.set("q", params.q.trim());
  return requestJson<AdminListResponse>(`/api/v1/admin/reports?${qs}`);
}

export async function fetchAdminDetail(id: string): Promise<AdminDetailResponse> {
  return requestJson<AdminDetailResponse>(`/api/v1/admin/reports/${id}`);
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

export function photoSrc(url: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE}${url.startsWith("/") ? url : `/${url}`}`;
}
