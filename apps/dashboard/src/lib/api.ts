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

async function readError(res: Response, fallback: string): Promise<string> {
  const err = (await res.json().catch(() => null)) as { error?: string } | null;
  return err?.error ?? fallback;
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const res = await fetch(`${API_BASE}/api/v1/dashboard/metrics`);
  if (!res.ok) throw new Error(await readError(res, `Metrics failed (${res.status})`));
  return res.json() as Promise<DashboardMetrics>;
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
  if (!res.ok) throw new Error(await readError(res, `Reports failed (${res.status})`));
  const data = (await res.json()) as { incidents: IncidentPublic[] };
  return data.incidents ?? [];
}

export async function fetchClusters(): Promise<SpatialCluster[]> {
  const res = await fetch(`${API_BASE}/api/v1/clusters`);
  if (!res.ok) throw new Error(await readError(res, `Clusters failed (${res.status})`));
  const data = (await res.json()) as { clusters: SpatialCluster[] };
  return data.clusters ?? [];
}

export async function fetchMeta(): Promise<PlatformMeta> {
  const res = await fetch(`${API_BASE}/api/v1/meta`);
  if (!res.ok) throw new Error(await readError(res, `Meta failed (${res.status})`));
  return res.json() as Promise<PlatformMeta>;
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
  if (!res.ok) throw new Error(await readError(res, `LPDP generation failed (${res.status})`));
  return res.json();
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
