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

type RequestKind = "load" | "lpdp";

const COPY: Record<RequestKind, { down: string; fallback: string; offline: string }> = {
  load: {
    down: import.meta.env.DEV
      ? "Couldn't load planning evidence. Start the API on port 3001, then refresh."
      : "Couldn't load Kilimani planning evidence. Check your connection and try again.",
    fallback: "Couldn't load Kilimani planning evidence. Try again.",
    offline: "You're offline. Reconnect to load county evidence.",
  },
  lpdp: {
    down: import.meta.env.DEV
      ? "Couldn't compile the LPDP brief. Start the API on port 3001, then try again."
      : "Couldn't compile the LPDP brief. Check your connection and try again.",
    fallback: "Couldn't compile the LPDP brief. Try again.",
    offline: "You're offline. Reconnect, then generate the brief.",
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
    if (res.status >= 500) {
      throw new Error(
        import.meta.env.DEV && isPublicError(server) ? server : copy.down,
      );
    }
    throw new Error(isPublicError(server) ? server : copy.fallback);
  }
  return body as T;
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  return requestJson<DashboardMetrics>(
    `${API_BASE}/api/v1/dashboard/metrics`,
    "load",
  );
}

export async function fetchReports(params: {
  status?: string;
  category?: string;
} = {}): Promise<IncidentPublic[]> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.category) query.set("category", params.category);
  query.set("limit", "500");
  const data = await requestJson<{ incidents: IncidentPublic[] }>(
    `${API_BASE}/api/v1/reports?${query.toString()}`,
    "load",
  );
  return data.incidents ?? [];
}

export async function fetchClusters(): Promise<SpatialCluster[]> {
  const data = await requestJson<{ clusters: SpatialCluster[] }>(
    `${API_BASE}/api/v1/clusters`,
    "load",
  );
  return data.clusters ?? [];
}

export async function fetchMeta(): Promise<PlatformMeta> {
  return requestJson<PlatformMeta>(`${API_BASE}/api/v1/meta`, "load");
}

export async function generateLpdpBrief(clusterIds?: string[]): Promise<{
  download_url: string;
  cluster_count: number;
  generated_at: string;
}> {
  return requestJson(`${API_BASE}/api/v1/lpdp/generate`, "lpdp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(clusterIds ? { cluster_ids: clusterIds } : {}),
  });
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
