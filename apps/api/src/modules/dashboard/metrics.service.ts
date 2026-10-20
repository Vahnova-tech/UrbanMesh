import { prisma } from "../../lib/prisma.js";
import { labelForCategory } from "../../lib/categories.js";
import { corridorForCoordinates } from "../../lib/corridors.js";
import { wardForCoordinates } from "../../lib/wards.js";

export interface IncidentMetricRow {
  id: string;
  category: string;
  is_verified: boolean;
  cluster_id: string | null;
  lat: number;
  lng: number;
  created_at: Date;
}

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

async function loadIncidentRows(): Promise<IncidentMetricRow[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      category: string;
      is_verified: boolean;
      cluster_id: string | null;
      lat: number;
      lng: number;
      created_at: Date;
    }>
  >`
    SELECT
      id::text AS id,
      category::text AS category,
      is_verified,
      cluster_id::text AS cluster_id,
      ST_Y(location::geometry) AS lat,
      ST_X(location::geometry) AS lng,
      created_at
    FROM incidents
    WHERE COALESCE(review_status::text, 'PENDING') NOT IN ('REJECTED', 'ARCHIVED', 'DISPROVED')
    ORDER BY created_at ASC
  `;

  return rows.map((r) => ({
    ...r,
    lat: Number(r.lat),
    lng: Number(r.lng),
    is_verified: Boolean(r.is_verified),
  }));
}

/** Aggregate ward / category / verification metrics for the county dashboard. */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const rows = await loadIncidentRows();

  const categoryMap = new Map<
    string,
    { count: number; verified: number; unverified: number }
  >();
  const wardMap = new Map<
    string,
    { name: string; total: number; verified: number; unverified: number }
  >();
  const dayMap = new Map<
    string,
    { total: number; verified: number; unverified: number }
  >();
  const corridorMap = new Map<
    string,
    { total: number; verified: number; unverified: number }
  >();
  const clusterIds = new Set<string>();

  let verified = 0;
  let unverified = 0;

  for (const row of rows) {
    if (row.is_verified) verified += 1;
    else unverified += 1;

    const cat = categoryMap.get(row.category) ?? {
      count: 0,
      verified: 0,
      unverified: 0,
    };
    cat.count += 1;
    if (row.is_verified) cat.verified += 1;
    else cat.unverified += 1;
    categoryMap.set(row.category, cat);

    const ward = wardForCoordinates(row.lat, row.lng);
    const w = wardMap.get(ward.id) ?? {
      name: ward.name,
      total: 0,
      verified: 0,
      unverified: 0,
    };
    w.total += 1;
    if (row.is_verified) w.verified += 1;
    else w.unverified += 1;
    wardMap.set(ward.id, w);

    const day = new Date(row.created_at).toISOString().slice(0, 10);
    const d = dayMap.get(day) ?? { total: 0, verified: 0, unverified: 0 };
    d.total += 1;
    if (row.is_verified) d.verified += 1;
    else d.unverified += 1;
    dayMap.set(day, d);

    const corridor = corridorForCoordinates(row.lat, row.lng);
    const c = corridorMap.get(corridor) ?? {
      total: 0,
      verified: 0,
      unverified: 0,
    };
    c.total += 1;
    if (row.is_verified) c.verified += 1;
    else c.unverified += 1;
    corridorMap.set(corridor, c);

    if (row.is_verified && row.cluster_id) clusterIds.add(row.cluster_id);
  }

  const affectedAreas = [...wardMap.values()].filter((w) => w.verified > 0)
    .length;

  return {
    generated_at: new Date().toISOString(),
    totals: {
      all: rows.length,
      verified,
      unverified,
      clusters: clusterIds.size,
      affected_areas: affectedAreas,
    },
    by_category: [...categoryMap.entries()]
      .map(([category, stats]) => ({
        category,
        label: labelForCategory(category),
        ...stats,
      }))
      .sort((a, b) => b.count - a.count),
    by_ward: [...wardMap.entries()]
      .map(([ward_id, stats]) => ({
        ward_id,
        ward_name: stats.name,
        total: stats.total,
        verified: stats.verified,
        unverified: stats.unverified,
      }))
      .sort((a, b) => b.total - a.total),
    trend: [...dayMap.entries()]
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    by_corridor: [...corridorMap.entries()]
      .map(([corridor, stats]) => ({ corridor, ...stats }))
      .sort((a, b) => b.verified - a.verified || b.total - a.total),
  };
}

export { loadIncidentRows };
