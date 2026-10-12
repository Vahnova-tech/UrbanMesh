const API_BASE = import.meta.env.VITE_API_BASE ?? "";

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

const API_DOWN = import.meta.env.DEV
  ? "Can't reach the UrbanMesh API on port 3001. In apps/api run npm run dev."
  : "Can't load Kilimani reports. The UrbanMesh API is not connected to this site.";

async function readJson<T>(res: Response, fallback: string): Promise<T> {
  const text = await res.text();
  if (/^\s*</.test(text)) {
    throw new Error(API_DOWN);
  }
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      throw new Error(res.status >= 500 ? API_DOWN : fallback);
    }
  }
  if (!res.ok) {
    const err = body as { error?: string } | null;
    throw new Error(err?.error || (res.status >= 500 ? API_DOWN : fallback));
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
  const res = await fetch(`${API_BASE}/api/v1/reports?${query.toString()}`);
  const data = await readJson<{ incidents: IncidentPublic[] }>(
    res,
    `Reports failed (${res.status})`,
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
  const res = await fetch(`${API_BASE}/api/v1/reports/nearby?${query.toString()}`);
  const data = await readJson<{ incidents: IncidentPublic[] }>(
    res,
    `Nearby reports failed (${res.status})`,
  );
  return data.incidents ?? [];
}

export async function fetchEvidence(id: string): Promise<EvidenceResponse> {
  const res = await fetch(`${API_BASE}/api/v1/reports/${id}`);
  return readJson<EvidenceResponse>(res, `Report not found (${res.status})`);
}

export async function submitHazardReport(
  payload: ReportPayload,
): Promise<ReportResponse> {
  const res = await fetch(`${API_BASE}/api/v1/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return readJson<ReportResponse>(res, `Report failed (${res.status})`);
}

export async function confirmHazard(id: string): Promise<ReportResponse> {
  const res = await fetch(`${API_BASE}/api/v1/reports/${id}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  return readJson<ReportResponse>(res, `Confirm failed (${res.status})`);
}

const PHOTO_PATH =
  /^\/uploads\/photos\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$/i;

export async function uploadPhoto(dataUrl: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  const form = new FormData();
  form.append("photo", blob, "hazard.jpg");
  const res = await fetch(`${API_BASE}/api/v1/uploads/photos`, {
    method: "POST",
    body: form,
  });
  const data = await readJson<{ url: string }>(
    res,
    `Photo upload failed (${res.status})`,
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
