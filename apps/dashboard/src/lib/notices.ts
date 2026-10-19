import type { IncidentPublic, SpatialCluster } from "./api";

export type PlannerNoticeKind = "cluster" | "pending";

export interface PlannerNotice {
  id: string;
  kind: PlannerNoticeKind;
  title: string;
  body: string;
  at: string;
  href: string;
}

const READ_KEY = "urbanmesh.plannerNoticeRead";

export function loadReadPlannerNoticeIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function saveReadPlannerNoticeIds(ids: Set<string>): void {
  localStorage.setItem(READ_KEY, JSON.stringify([...ids].slice(0, 200)));
}

export function buildPlannerNotices(
  clusters: SpatialCluster[],
  reports: IncidentPublic[],
): PlannerNotice[] {
  const notices: PlannerNotice[] = [];

  for (const cluster of clusters) {
    notices.push({
      id: `cluster:${cluster.cluster_id}`,
      kind: "cluster",
      title: "Community-supported cluster",
      body: `${cluster.category_label} on ${cluster.corridor} · ${cluster.report_count} reports within 15 m.`,
      at: cluster.latest_report || cluster.first_reported,
      href: `/clusters?id=${encodeURIComponent(cluster.cluster_id)}`,
    });
  }

  const pending = reports
    .filter((row) => !row.is_verified)
    .sort((a, b) => b.nearby_count - a.nearby_count || b.created_at.localeCompare(a.created_at))
    .slice(0, 10);

  for (const row of pending) {
    notices.push({
      id: `pending:${row.id}`,
      kind: "pending",
      title: row.nearby_count >= 2 ? "Approaching community support" : "Pending report",
      body: `${row.category_label} in ${row.ward_name} · ${row.nearby_count} nearby report${
        row.nearby_count === 1 ? "" : "s"
      }.`,
      at: row.created_at,
      href: "/reports",
    });
  }

  return notices.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 24);
}
