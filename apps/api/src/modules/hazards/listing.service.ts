import { prisma } from "../../lib/prisma.js";
import { labelForCategory, severityForCategory } from "../../lib/categories.js";
import { corridorForCoordinates } from "../../lib/corridors.js";
import { haversineMeters } from "../../lib/geo.js";
import { wardForCoordinates } from "../../lib/wards.js";
import { env } from "../../lib/env.js";

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

interface IncidentRow {
  id: string;
  category: string;
  description: string;
  lat: number;
  lng: number;
  h3_index: string;
  cluster_id: string | null;
  is_verified: boolean;
  review_status: string;
  photo_url: string | null;
  created_at: Date;
}

export interface ListIncidentsQuery {
  status?: "verified" | "pending" | "all";
  category?: string;
  corridor?: string;
  limit?: number;
}

function toPublic(
  row: IncidentRow,
  nearbyCount: number,
): IncidentPublic {
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
    severity: severityForCategory(row.category),
    photo_url: row.photo_url,
    created_at: new Date(row.created_at).toISOString(),
    ward_id: ward.id,
    ward_name: ward.name,
    corridor: corridorForCoordinates(lat, lng),
    nearby_count: nearbyCount,
  };
}

async function loadIncidentRows(): Promise<IncidentRow[]> {
  const rows = await prisma.$queryRaw<IncidentRow[]>`
    SELECT
      id::text AS id,
      category::text AS category,
      description,
      ST_Y(location::geometry) AS lat,
      ST_X(location::geometry) AS lng,
      h3_index,
      cluster_id::text AS cluster_id,
      is_verified,
      COALESCE(review_status::text, 'PENDING') AS review_status,
      photo_url,
      created_at
    FROM incidents
    WHERE COALESCE(review_status::text, 'PENDING') <> 'REJECTED'
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

function withNearbyCounts(rows: IncidentRow[]): IncidentPublic[] {
  const radius = env.clusterRadiusMeters;
  return rows.map((row) => {
    const nearby = rows.filter(
      (other) =>
        other.category === row.category &&
        haversineMeters(row.lat, row.lng, other.lat, other.lng) <= radius,
    ).length;
    return toPublic(row, nearby);
  });
}

export async function listIncidents(
  query: ListIncidentsQuery = {},
): Promise<{ count: number; incidents: IncidentPublic[] }> {
  const all = withNearbyCounts(await loadIncidentRows());
  let incidents = all;

  if (query.status === "verified") {
    incidents = incidents.filter((i) => i.is_verified);
  } else if (query.status === "pending") {
    incidents = incidents.filter((i) => !i.is_verified);
  }

  if (query.category) {
    incidents = incidents.filter((i) => i.category === query.category);
  }

  if (query.corridor) {
    const needle = query.corridor.toLowerCase();
    incidents = incidents.filter((i) =>
      i.corridor.toLowerCase().includes(needle),
    );
  }

  const limit = query.limit && query.limit > 0 ? query.limit : 500;
  incidents = incidents.slice(0, limit);

  return { count: incidents.length, incidents };
}

export async function getIncidentById(
  id: string,
): Promise<IncidentPublic | null> {
  const { incidents } = await listIncidents({ limit: 5000 });
  return incidents.find((i) => i.id === id) ?? null;
}

export async function listNearbyIncidents(
  lat: number,
  lng: number,
  radiusMeters = 800,
): Promise<{ count: number; incidents: IncidentPublic[] }> {
  const { incidents } = await listIncidents({ limit: 5000 });
  const nearby = incidents
    .map((incident) => ({
      incident,
      dist: haversineMeters(lat, lng, incident.lat, incident.lng),
    }))
    .filter((row) => row.dist <= radiusMeters)
    .sort((a, b) => a.dist - b.dist)
    .map((row) => row.incident);

  return { count: nearby.length, incidents: nearby };
}

export async function getIncidentEvidence(id: string): Promise<{
  incident: IncidentPublic;
  nearby: IncidentPublic[];
  cluster_members: IncidentPublic[];
} | null> {
  const { incidents } = await listIncidents({ limit: 5000 });
  const incident = incidents.find((i) => i.id === id);
  if (!incident) return null;

  const nearby = incidents
    .filter(
      (other) =>
        other.id !== incident.id &&
        other.category === incident.category &&
        haversineMeters(
          incident.lat,
          incident.lng,
          other.lat,
          other.lng,
        ) <= env.clusterRadiusMeters,
    )
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const cluster_members = incident.cluster_id
    ? incidents
        .filter((other) => other.cluster_id === incident.cluster_id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
    : [];

  return { incident, nearby, cluster_members };
}
