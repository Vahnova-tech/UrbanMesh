import type { IncidentPublic } from "./api";
import { haversineMeters } from "./geo";

/** Default corroboration radius — same-category reports within this distance collapse to one card. */
export const COLLAPSE_RADIUS_METERS = 15;

export type CollapsedReport = IncidentPublic & {
  /** All report IDs represented by this card (including the primary). */
  member_ids: string[];
  member_count: number;
  /** Extra sightings beyond the primary (for “N new corroborations”). */
  corroboration_count: number;
  /** Newest member timestamp in the group. */
  latest_at: string;
  /** Members newest-first for expandable detail. */
  members: IncidentPublic[];
};

/**
 * Collapse redundant reports from different devices into one list card:
 * - Shared cluster_id → one card
 * - Same category within 15 m → one card
 * - Near-identical descriptions within 15 m → one card
 * Representative prefers photo + verified + newest; summary uses latest corroboration time.
 */
export function collapseRedundantReports(
  incidents: IncidentPublic[],
  radiusMeters = COLLAPSE_RADIUS_METERS,
): CollapsedReport[] {
  if (incidents.length === 0) return [];

  const rows = [...incidents];
  const parent = rows.map((_, i) => i);

  function find(i: number): number {
    let root = i;
    while (parent[root] !== root) root = parent[root];
    let cur = i;
    while (parent[cur] !== root) {
      const next = parent[cur];
      parent[cur] = root;
      cur = next;
    }
    return root;
  }

  function union(a: number, b: number) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  }

  const byCluster = new Map<string, number>();
  for (let i = 0; i < rows.length; i++) {
    const cid = rows[i].cluster_id;
    if (!cid) continue;
    const prev = byCluster.get(cid);
    if (prev != null) union(prev, i);
    else byCluster.set(cid, i);
  }

  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      if (find(i) === find(j)) continue;
      if (rows[i].category !== rows[j].category) continue;
      const dist = haversineMeters(
        rows[i].lat,
        rows[i].lng,
        rows[j].lat,
        rows[j].lng,
      );
      if (dist > radiusMeters) continue;
      const sameText =
        fingerprint(rows[i].description) === fingerprint(rows[j].description) &&
        fingerprint(rows[i].description).length > 0;
      // Always merge within radius for same category (corroboration window).
      // Identical text is a stronger signal but not required.
      if (sameText || dist <= radiusMeters) {
        union(i, j);
      }
    }
  }

  const buckets = new Map<number, IncidentPublic[]>();
  for (let i = 0; i < rows.length; i++) {
    const root = find(i);
    const list = buckets.get(root) ?? [];
    list.push(rows[i]);
    buckets.set(root, list);
  }

  return [...buckets.values()]
    .map((members) => toCollapsed(members))
    .sort((a, b) => b.latest_at.localeCompare(a.latest_at));
}

function fingerprint(description: string): string {
  return description
    .toLowerCase()
    .replace(/^community confirmation:\s*/i, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toCollapsed(members: IncidentPublic[]): CollapsedReport {
  const newestFirst = [...members].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
  const ranked = [...members].sort((a, b) => {
    const photoScore = (row: IncidentPublic) => (row.photo_url ? 1 : 0);
    return (
      photoScore(b) - photoScore(a) ||
      Number(b.is_verified) - Number(a.is_verified) ||
      b.created_at.localeCompare(a.created_at)
    );
  });
  const primary = ranked[0];
  const latest = newestFirst[0];
  const nearbyCount = Math.max(
    ...members.map((row) => row.nearby_count),
    members.length,
  );
  return {
    ...primary,
    is_verified: members.some((row) => row.is_verified),
    status: members.some((row) => row.is_verified) ? "verified" : "pending",
    nearby_count: nearbyCount,
    created_at: primary.created_at,
    member_ids: members.map((row) => row.id),
    member_count: members.length,
    corroboration_count: Math.max(0, members.length - 1),
    latest_at: latest.created_at,
    members: newestFirst,
  };
}
