import { clearAdminToken, loadAdminToken } from "./auth";

const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface AdminIncident {
  id: string;
  category: string;
  category_label: string;
  description: string;
  lat: number;
  lng: number;
  cluster_id: string | null;
  is_verified: boolean;
  status: "verified" | "pending";
  review_status: ReviewStatus;
  reviewed_at: string | null;
  review_note: string | null;
  severity: "critical" | "standard";
  photo_url: string | null;
  created_at: string;
  ward_name: string;
  corridor: string;
  nearby_count: number;
}

export interface AdminListResponse {
  count: number;
  summary: Record<ReviewStatus, number>;
  incidents: AdminIncident[];
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

export async function fetchAdminReports(
  review: ReviewStatus | "all" = "pending",
): Promise<AdminListResponse> {
  return requestJson<AdminListResponse>(
    `/api/v1/admin/reports?review=${encodeURIComponent(review)}&limit=300`,
  );
}

export async function approveReport(id: string, note?: string) {
  return requestJson<{ ok: boolean; incident: AdminIncident }>(
    `/api/v1/admin/reports/${id}/approve`,
    {
      method: "POST",
      body: JSON.stringify({ note: note ?? "" }),
    },
  );
}

export async function rejectReport(id: string, note?: string) {
  return requestJson<{ ok: boolean; incident: AdminIncident }>(
    `/api/v1/admin/reports/${id}/reject`,
    {
      method: "POST",
      body: JSON.stringify({ note: note ?? "" }),
    },
  );
}

export async function resetReport(id: string) {
  return requestJson<{ ok: boolean; incident: AdminIncident }>(
    `/api/v1/admin/reports/${id}/reset`,
    { method: "POST", body: "{}" },
  );
}

export function photoSrc(url: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE}${url.startsWith("/") ? url : `/${url}`}`;
}
