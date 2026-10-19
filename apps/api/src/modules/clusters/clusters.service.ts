import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { labelForCategory, severityForCategory } from "../../lib/categories.js";
import { corridorForCoordinates } from "../../lib/corridors.js";
import { wardForCoordinates } from "../../lib/wards.js";
import { env } from "../../lib/env.js";

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
  verification_status: "Community-supported (spatial corroboration)";
  first_reported: string;
  latest_report: string;
  radius_meters: number;
}

interface ClusterRow {
  cluster_id: string;
  category: string;
  lat: number;
  lng: number;
  report_count: number;
  first_reported: Date;
  latest_report: Date;
}

export async function listVerifiedClusters(options?: {
  ids?: string[];
}): Promise<SpatialCluster[]> {
  const ids = options?.ids?.filter(Boolean);

  const rows = ids && ids.length > 0
    ? await prisma.$queryRaw<ClusterRow[]>`
        SELECT
          cluster_id::text AS cluster_id,
          mode() WITHIN GROUP (ORDER BY category::text) AS category,
          AVG(ST_Y(location::geometry)) AS lat,
          AVG(ST_X(location::geometry)) AS lng,
          COUNT(*)::int AS report_count,
          MIN(created_at) AS first_reported,
          MAX(created_at) AS latest_report
        FROM incidents
        WHERE is_verified = true
          AND cluster_id IS NOT NULL
          AND cluster_id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))})
        GROUP BY cluster_id
        HAVING COUNT(*) >= ${env.clusterThreshold}
        ORDER BY COUNT(*) DESC, cluster_id
      `
    : ids && ids.length === 0
      ? []
      : await prisma.$queryRaw<ClusterRow[]>`
        SELECT
          cluster_id::text AS cluster_id,
          mode() WITHIN GROUP (ORDER BY category::text) AS category,
          AVG(ST_Y(location::geometry)) AS lat,
          AVG(ST_X(location::geometry)) AS lng,
          COUNT(*)::int AS report_count,
          MIN(created_at) AS first_reported,
          MAX(created_at) AS latest_report
        FROM incidents
        WHERE is_verified = true
          AND cluster_id IS NOT NULL
        GROUP BY cluster_id
        HAVING COUNT(*) >= ${env.clusterThreshold}
        ORDER BY COUNT(*) DESC, cluster_id
      `;

  return rows.map((row) => {
    const lat = Number(row.lat);
    const lng = Number(row.lng);
    const ward = wardForCoordinates(lat, lng);
    return {
      cluster_id: row.cluster_id,
      category: row.category,
      category_label: labelForCategory(row.category),
      severity: severityForCategory(row.category),
      lat,
      lng,
      report_count: Number(row.report_count),
      ward_id: ward.id,
      ward_name: ward.name,
      corridor: corridorForCoordinates(lat, lng),
      verification_status: "Community-supported (spatial corroboration)" as const,
      first_reported: new Date(row.first_reported).toISOString(),
      latest_report: new Date(row.latest_report).toISOString(),
      radius_meters: env.clusterRadiusMeters,
    };
  });
}
