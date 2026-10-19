import type { IncidentPublic } from "./api";
import { haversineMeters } from "./geo";
import { loadMyReportIds } from "./myReports";

export type NoticeKind = "verified" | "nearby" | "confirm";

export interface Notice {
  id: string;
  kind: NoticeKind;
  title: string;
  body: string;
  at: string;
  href: string;
}

const READ_KEY = "urbanmesh.noticeRead";
const NEARBY_M = 800;

export function loadReadNoticeIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function saveReadNoticeIds(ids: Set<string>): void {
  localStorage.setItem(READ_KEY, JSON.stringify([...ids].slice(0, 200)));
}

export function buildNotices(
  incidents: IncidentPublic[],
  coords: { lat: number; lng: number } | null,
): Notice[] {
  const myIds = new Set(loadMyReportIds().map((row) => row.id));
  const mine = incidents.filter((row) => myIds.has(row.id));
  const nearby = coords
    ? incidents.filter(
        (row) => haversineMeters(coords.lat, coords.lng, row.lat, row.lng) <= NEARBY_M,
      )
    : [];

  const notices: Notice[] = [];

  for (const row of mine) {
    if (!row.is_verified) continue;
    notices.push({
      id: `verified:${row.id}`,
      kind: "verified",
      title: "Your report is community-supported",
      body: `${row.category_label} on ${row.corridor} now meets the 15 m corroboration rule.`,
      at: row.created_at,
      href: `/reports/${row.id}`,
    });
  }

  const seenClusters = new Set<string>();
  for (const row of nearby) {
    if (!row.is_verified || myIds.has(row.id)) continue;
    const key = row.cluster_id ?? row.id;
    if (seenClusters.has(key)) continue;
    seenClusters.add(key);
    notices.push({
      id: `nearby:${key}`,
      kind: "nearby",
      title: "Community-supported cluster nearby",
      body: `${row.category_label} on ${row.corridor} · ${row.nearby_count} report${
        row.nearby_count === 1 ? "" : "s"
      } within 15 m.`,
      at: row.created_at,
      href: `/reports/${row.id}`,
    });
  }

  const pendingNearby = nearby
    .filter((row) => !row.is_verified && !myIds.has(row.id))
    .sort((a, b) => b.nearby_count - a.nearby_count || b.created_at.localeCompare(a.created_at))
    .slice(0, 8);

  for (const row of pendingNearby) {
    notices.push({
      id: `confirm:${row.id}`,
      kind: "confirm",
      title: "Nearby report needs confirmation",
      body: `${row.category_label} on ${row.corridor}. Confirm if you see the same hazard.`,
      at: row.created_at,
      href: `/reports/${row.id}`,
    });
  }

  return notices.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 24);
}
