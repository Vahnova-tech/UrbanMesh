import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { env } from "../../lib/env.js";
import { prisma } from "../../lib/prisma.js";
import type {
  HazardReportInput,
  IngestionResult,
} from "../../types/reports.js";

const HAZARD_CATEGORIES = [
  "MOBILITY_SURFACE_DAMAGE",
  "NMT_PEDESTRIAN_HAZARD",
  "DRAINAGE_STORMWATER",
  "SEWER_SANITATION",
  "LIGHTING_SECURITY",
  "ILLEGAL_WASTE_DUMP",
] as const;

export type HazardCategoryValue = (typeof HAZARD_CATEGORIES)[number];

interface NearbyRow {
  id: string;
}

/**
 * Ingest a geotagged hazard report, then run a same-category spatial check
 * (radius / threshold from env — see CLUSTER_* in .env.example / roadmap Wk 6).
 */
export async function ingestHazardReport(
  input: HazardReportInput,
): Promise<IngestionResult> {
  const incidentId = randomUUID();
  const photoUrl = input.photo_url ?? null;

  // Geometry-aware insert — Prisma can't express PostGIS constructors natively.
  await prisma.$queryRaw`
    INSERT INTO incidents (
      id,
      category,
      description,
      location,
      h3_index,
      is_verified,
      cluster_id,
      photo_url,
      created_at
    )
    VALUES (
      ${incidentId}::uuid,
      ${input.category}::"HazardCategory",
      ${input.description},
      ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326),
      ${input.h3_index},
      false,
      NULL,
      ${photoUrl},
      NOW()
    )
  `;

  // Same-category incidents within 15 m (geography → metres).
  // Rejected field reviews must not count toward community corroboration.
  const nearby = await prisma.$queryRaw<NearbyRow[]>`
    SELECT id::text AS id
    FROM incidents
    WHERE category = ${input.category}::"HazardCategory"
      AND COALESCE(review_status::text, 'PENDING') NOT IN ('REJECTED', 'ARCHIVED', 'DISPROVED')
      AND ST_DWithin(
        location::geography,
        ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography,
        ${env.clusterRadiusMeters}
      )
  `;

  const nearbyCount = nearby.length;
  const nearbyIds = nearby.map((row) => row.id);

  if (nearbyCount >= env.clusterThreshold) {
    // Anchor cluster on the newly inserted incident; flip is_verified for all matches.
    const idList = Prisma.join(
      nearbyIds.map((id) => Prisma.sql`${id}::uuid`),
    );

    await prisma.$executeRaw`
      UPDATE incidents
      SET
        is_verified = true,
        cluster_id = ${incidentId}::uuid
      WHERE id IN (${idList})
    `;

    return {
      status: "Verified Cluster Created",
      incident_id: incidentId,
      cluster_id: incidentId,
      is_verified: true,
      nearby_count: nearbyCount,
    };
  }

  return {
    status: "Incident Logged - Pending Verification",
    incident_id: incidentId,
    cluster_id: null,
    is_verified: false,
    nearby_count: nearbyCount,
  };
}

export function isHazardCategory(value: unknown): value is HazardCategoryValue {
  return (
    typeof value === "string" &&
    (HAZARD_CATEGORIES as readonly string[]).includes(value)
  );
}
