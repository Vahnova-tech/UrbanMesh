import type { IncidentPublic } from "./api";
import { haversineMeters } from "./geo";

/** Default corroboration radius — same-category reports within this distance collapse to one card. */
export const COLLAPSE_RADIUS_METERS = 15;

export type CollapsedReport = IncidentPublic & {
  /** All report IDs represented by this card (including the primary). */
  member_ids: string[];
  member_count: number;
};

/**
 * Collapse redundant reports from different devices into one list card:
 * - Shared cluster_id → one card
 * - Same category within 15 m → one card (pending or mixed)
 * Representative is the newest row with a photo when possible.
 */
export function collapseRedundantReports(
  incidents: IncidentPublic[],
  radiusMeters = COLLAPSE_RADIUS_METERS,
): CollapsedReport[] {
  if (incidents.length === 0) return [];

  const byCluster = new Map<string, IncidentPublic[]>();
  const unclustered: IncidentPublic[] = [];

  for (const row of incidents) {
    if (row.cluster_id) {
      const list = byCluster.get(row.cluster_id) ?? [];
      list.push(row);
      byCluster.set(row.cluster_id, list);
    } else {
      unclustered.push(row);
    }
  }

  const groups: IncidentPublic[][] = [...byCluster.values()];
  const used = new Set<string>();

  const sorted = [...unclustered].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );

  for (const seed of sorted) {
    if (used.has(seed.id)) continue;
    const group = [seed];
    used.add(seed.id);
    for (const other of sorted) {
      if (used.has(other.id)) continue;
      if (other.category !== seed.category) continue;
      const within = group.some(
        (member) =>
          haversineMeters(member.lat, member.lng, other.lat, other.lng) <=
          radiusMeters,
      );
      if (!within) continue;
      group.push(other);
      used.add(other.id);
    }
    groups.push(group);
  }

  return groups
    .map((members) => toCollapsed(members))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function toCollapsed(members: IncidentPublic[]): CollapsedReport {
  const ranked = [...members].sort((a, b) => {
    const photoScore = (row: IncidentPublic) => (row.photo_url ? 1 : 0);
    return (
      photoScore(b) - photoScore(a) ||
      Number(b.is_verified) - Number(a.is_verified) ||
      b.created_at.localeCompare(a.created_at)
    );
  });
  const primary = ranked[0];
  const nearbyCount = Math.max(
    ...members.map((row) => row.nearby_count),
    members.length,
  );
  return {
    ...primary,
    is_verified: members.some((row) => row.is_verified),
    status: members.some((row) => row.is_verified) ? "verified" : "pending",
    nearby_count: nearbyCount,
    member_ids: members.map((row) => row.id),
    member_count: members.length,
  };
}
