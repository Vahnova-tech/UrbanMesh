import { prisma } from "../../lib/prisma.js";

export interface VerifiedIncident {
  id: string;
  category: string;
  description: string;
  lat: number;
  lng: number;
  h3_index: string;
  cluster_id: string | null;
  is_verified: boolean;
}

interface VerifiedIncidentRow {
  id: string;
  category: string;
  description: string;
  lat: number;
  lng: number;
  h3_index: string;
  cluster_id: string | null;
  is_verified: boolean;
}

/** Fetch verified incidents with coordinates for heatmap rendering. */
export async function listVerifiedIncidents(): Promise<VerifiedIncident[]> {
  const rows = await prisma.$queryRaw<VerifiedIncidentRow[]>`
    SELECT
      id::text AS id,
      category::text AS category,
      description,
      ST_Y(location::geometry) AS lat,
      ST_X(location::geometry) AS lng,
      h3_index,
      cluster_id::text AS cluster_id,
      is_verified
    FROM incidents
    WHERE is_verified = true
      AND COALESCE(review_status::text, 'PENDING') NOT IN ('REJECTED', 'ARCHIVED', 'DISPROVED')
    ORDER BY created_at DESC
    LIMIT 2000
  `;

  return rows.map((row) => ({
    ...row,
    lat: Number(row.lat),
    lng: Number(row.lng),
  }));
}
