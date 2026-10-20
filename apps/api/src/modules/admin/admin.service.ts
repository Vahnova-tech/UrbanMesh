import { prisma } from "../../lib/prisma.js";
import { labelForCategory, severityForCategory } from "../../lib/categories.js";
import { corridorForCoordinates } from "../../lib/corridors.js";
import { haversineMeters } from "../../lib/geo.js";
import { wardForCoordinates } from "../../lib/wards.js";
import { env } from "../../lib/env.js";
import { HttpError } from "../../lib/httpError.js";

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface AdminIncident {
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
  review_status: ReviewStatus;
  reviewed_at: string | null;
  review_note: string | null;
  severity: "critical" | "standard";
  photo_url: string | null;
  created_at: string;
  ward_id: string;
  ward_name: string;
  corridor: string;
  nearby_count: number;
}

interface AdminRow {
  id: string;
  category: string;
  description: string;
  lat: number;
  lng: number;
  h3_index: string;
  cluster_id: string | null;
  is_verified: boolean;
  review_status: string;
  reviewed_at: Date | null;
  review_note: string | null;
  photo_url: string | null;
  created_at: Date;
}

function toReviewStatus(raw: string): ReviewStatus {
  const value = raw.toLowerCase();
  if (value === "approved" || value === "rejected" || value === "pending") {
    return value;
  }
  return "pending";
}

function toAdmin(row: AdminRow, nearbyCount: number): AdminIncident {
  const lat = Number(row.lat);
  const lng = Number(row.lng);
  const ward = wardForCoordinates(lat, lng);
  const verified = Boolean(row.is_verified);
  return {
    id: row.id,
    category: row.category,
    category_label: labelForCategory(row.category),
    description: row.description,
    lat,
    lng,
    h3_index: row.h3_index,
    cluster_id: row.cluster_id,
    is_verified: verified,
    status: verified ? "verified" : "pending",
    review_status: toReviewStatus(row.review_status),
    reviewed_at: row.reviewed_at
      ? new Date(row.reviewed_at).toISOString()
      : null,
    review_note: row.review_note,
    severity: severityForCategory(row.category),
    photo_url: row.photo_url,
    created_at: new Date(row.created_at).toISOString(),
    ward_id: ward.id,
    ward_name: ward.name,
    corridor: corridorForCoordinates(lat, lng),
    nearby_count: nearbyCount,
  };
}

async function loadAdminRows(): Promise<AdminRow[]> {
  const rows = await prisma.$queryRaw<AdminRow[]>`
    SELECT
      id::text AS id,
      category::text AS category,
      description,
      ST_Y(location::geometry) AS lat,
      ST_X(location::geometry) AS lng,
      h3_index,
      cluster_id::text AS cluster_id,
      is_verified,
      review_status::text AS review_status,
      reviewed_at,
      review_note,
      photo_url,
      created_at
    FROM incidents
    ORDER BY created_at DESC
  `;

  return rows.map((row) => ({
    ...row,
    lat: Number(row.lat),
    lng: Number(row.lng),
    is_verified: Boolean(row.is_verified),
    review_status: String(row.review_status ?? "PENDING"),
  }));
}

export async function listAdminReports(query: {
  review?: ReviewStatus | "all";
  limit?: number;
}): Promise<{ count: number; summary: Record<ReviewStatus, number>; incidents: AdminIncident[] }> {
  const rows = await loadAdminRows();
  const radius = env.clusterRadiusMeters;
  const all = rows.map((row) => {
    const nearby = rows.filter(
      (other) =>
        other.category === row.category &&
        haversineMeters(row.lat, row.lng, other.lat, other.lng) <= radius,
    ).length;
    return toAdmin(row, nearby);
  });

  const summary: Record<ReviewStatus, number> = {
    pending: all.filter((i) => i.review_status === "pending").length,
    approved: all.filter((i) => i.review_status === "approved").length,
    rejected: all.filter((i) => i.review_status === "rejected").length,
  };

  let incidents = all;
  if (query.review && query.review !== "all") {
    incidents = incidents.filter((i) => i.review_status === query.review);
  }

  const limit = query.limit && query.limit > 0 ? query.limit : 500;
  incidents = incidents.slice(0, limit);

  return { count: incidents.length, summary, incidents };
}

export async function setReviewStatus(
  id: string,
  status: "APPROVED" | "REJECTED" | "PENDING",
  note?: string | null,
): Promise<AdminIncident> {
  const trimmed = note?.trim() || null;
  const clearReviewTime = status === "PENDING";
  const updated = await prisma.$executeRaw`
    UPDATE incidents
    SET
      review_status = CAST(${status} AS "ReviewStatus"),
      reviewed_at = CASE WHEN ${clearReviewTime} THEN NULL ELSE NOW() END,
      review_note = ${trimmed}
    WHERE id = CAST(${id} AS uuid)
  `;

  if (!Number(updated)) {
    throw new HttpError(404, "This report is not on UrbanMesh.");
  }

  const rows = await prisma.$queryRaw<AdminRow[]>`
    SELECT
      id::text AS id,
      category::text AS category,
      description,
      ST_Y(location::geometry) AS lat,
      ST_X(location::geometry) AS lng,
      h3_index,
      cluster_id::text AS cluster_id,
      is_verified,
      review_status::text AS review_status,
      reviewed_at,
      review_note,
      photo_url,
      created_at
    FROM incidents
    WHERE id = CAST(${id} AS uuid)
    LIMIT 1
  `;
  const raw = rows[0];
  if (!raw) {
    throw new HttpError(404, "This report is not on UrbanMesh.");
  }
  return toAdmin(
    {
      ...raw,
      lat: Number(raw.lat),
      lng: Number(raw.lng),
      is_verified: Boolean(raw.is_verified),
      review_status: String(raw.review_status ?? "PENDING"),
    },
    1,
  );
}
