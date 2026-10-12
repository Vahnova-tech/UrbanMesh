const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export interface DashboardMetrics {
  generated_at: string;
  totals: {
    all: number;
    verified: number;
    unverified: number;
    clusters: number;
    affected_areas: number;
  };
  by_category: Array<{
    category: string;
    label: string;
    count: number;
    verified: number;
    unverified: number;
  }>;
  by_ward: Array<{
    ward_id: string;
    ward_name: string;
    total: number;
    verified: number;
    unverified: number;
  }>;
  trend: Array<{
    date: string;
    total: number;
    verified: number;
    unverified: number;
  }>;
  by_corridor: Array<{
    corridor: string;
    total: number;
    verified: number;
    unverified: number;
  }>;
}

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
  status: "verified" | "pending";
  severity: "critical" | "standard";
  photo_url: string | null;
  created_at: string;
  ward_id: string;
  ward_name: string;
  corridor: string;
  nearby_count: number;
}

export interface SpatialCluster {
  cluster_id: string;
  category: string;
  category_label: string;
  severity: "critical" | "standard";
  lat: number;
  lng: number;
  report_count: number;
  ward_id: string;
  ward_name: string;
  corridor: string;
  verification_status: string;
  first_reported: string;
  latest_report: string;
  radius_meters: number;
}

export interface PlatformMeta {
  planning_area: string;
  city: string;
  county: string;
  cluster_threshold: number;
  cluster_radius_meters: number;
  h3_resolution: number;
  corridors: Array<{
    id: string;
    name: string;
    focus: string;
    path: Array<[number, number]>;
  }>;
  wards: Array<{
    id: string;
    name: string;
    bbox: [number, number, number, number];
  }>;
}

const API_DOWN = import.meta.env.DEV
  ? "Couldn't load live reports. Start the API on port 3001, then refresh."
  : "Couldn't load Kilimani planning evidence. Check your connection and try again.";

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

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const res = await fetch(`${API_BASE}/api/v1/dashboard/metrics`);
  return readJson<DashboardMetrics>(res, `Metrics failed (${res.status})`);
}

export async function fetchReports(params: {
  status?: string;
  category?: string;
} = {}): Promise<IncidentPublic[]> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.category) query.set("category", params.category);
  query.set("limit", "500");
  const res = await fetch(`${API_BASE}/api/v1/reports?${query.toString()}`);
  const data = await readJson<{ incidents: IncidentPublic[] }>(
    res,
    `Reports failed (${res.status})`,
  );
  return data.incidents ?? [];
}

export async function fetchClusters(): Promise<SpatialCluster[]> {
  const res = await fetch(`${API_BASE}/api/v1/clusters`);
  const data = await readJson<{ clusters: SpatialCluster[] }>(
    res,
    `Clusters failed (${res.status})`,
  );
  return data.clusters ?? [];
}

export async function fetchMeta(): Promise<PlatformMeta> {
  const res = await fetch(`${API_BASE}/api/v1/meta`);
  return readJson<PlatformMeta>(res, `Meta failed (${res.status})`);
}

export async function generateLpdpBrief(clusterIds?: string[]): Promise<{
  download_url: string;
  cluster_count: number;
  generated_at: string;
}> {
  const res = await fetch(`${API_BASE}/api/v1/lpdp/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(clusterIds ? { cluster_ids: clusterIds } : {}),
  });
  return readJson(res, `LPDP generation failed (${res.status})`);
}

export const LPDP_DOWNLOAD_HREF = `${API_BASE}/api/v1/lpdp/latest.pdf`;

const PHOTO_PATH =
  /^\/uploads\/photos\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$/i;

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
  const clean = pathName.split("?")[0];
  if (!PHOTO_PATH.test(clean)) return null;
  return `${API_BASE}${clean}`;
}
