import { prisma } from "../../lib/prisma.js";
import { labelForCategory, severityForCategory } from "../../lib/categories.js";
import { corridorForCoordinates } from "../../lib/corridors.js";
import { haversineMeters } from "../../lib/geo.js";
import { wardForCoordinates } from "../../lib/wards.js";
import { env } from "../../lib/env.js";
import { HttpError, isUuid } from "../../lib/httpError.js";
import { resolveDisproveReason } from "./disproveReasons.js";

export type ReviewStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "flagged"
  | "resolved"
  | "archived"
  | "disproved"
  | "under_review";

export type AdminAction =
  | "approve_field"
  | "disprove"
  | "reject"
  | "flag"
  | "under_review"
  | "resolve"
  | "reopen"
  | "archive"
  | "delete"
  | "restore"
  | "merge_duplicate"
  | "reset_queue"
  | "edit_category";

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
  /** Spatial community corroboration only — not a field inspection. */
  community_supported: boolean;
  status: "verified" | "pending";
  review_status: ReviewStatus;
  reviewed_at: string | null;
  review_note: string | null;
  field_verified: boolean;
  field_verified_at: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  duplicate_of_id: string | null;
  severity: "critical" | "standard";
  photo_url: string | null;
  created_at: string;
  ward_id: string;
  ward_name: string;
  corridor: string;
  nearby_count: number;
}

export interface AdminAuditEntry {
  id: string;
  incident_id: string | null;
  action: string;
  actor: string;
  reason: string | null;
  before_json: string | null;
  after_json: string | null;
  created_at: string;
}

export interface DashboardStats {
  total: number;
  pending_review: number;
  community_supported: number;
  field_verified: number;
  awaiting_field_inspection: number;
  disproved: number;
  resolved: number;
  flagged: number;
  rejected: number;
  archived: number;
  under_review: number;
  cluster_threshold: number;
  cluster_radius_meters: number;
  by_category: { category: string; label: string; count: number }[];
  recent_actions: AdminAuditEntry[];
  recent_reports: AdminIncident[];
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
  field_verified: boolean;
  field_verified_at: Date | null;
  resolved_at: Date | null;
  resolution_note: string | null;
  duplicate_of_id: string | null;
  photo_url: string | null;
  created_at: Date;
}

const REVIEW_STATUSES: ReviewStatus[] = [
  "pending",
  "approved",
  "rejected",
  "flagged",
  "resolved",
  "archived",
  "disproved",
  "under_review",
];

function toReviewStatus(raw: string): ReviewStatus {
  const value = raw.toLowerCase() as ReviewStatus;
  return REVIEW_STATUSES.includes(value) ? value : "pending";
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
    community_supported: verified,
    status: verified ? "verified" : "pending",
    review_status: toReviewStatus(row.review_status),
    reviewed_at: row.reviewed_at
      ? new Date(row.reviewed_at).toISOString()
      : null,
    review_note: row.review_note,
    field_verified: Boolean(row.field_verified),
    field_verified_at: row.field_verified_at
      ? new Date(row.field_verified_at).toISOString()
      : null,
    resolved_at: row.resolved_at
      ? new Date(row.resolved_at).toISOString()
      : null,
    resolution_note: row.resolution_note,
    duplicate_of_id: row.duplicate_of_id,
    severity: severityForCategory(row.category),
    photo_url: row.photo_url,
    created_at: new Date(row.created_at).toISOString(),
    ward_id: ward.id,
    ward_name: ward.name,
    corridor: corridorForCoordinates(lat, lng),
    nearby_count: nearbyCount,
  };
}

function requireReason(reason: string | null | undefined, label: string) {
  const trimmed = reason?.trim() ?? "";
  if (trimmed.length < 3) {
    throw new HttpError(400, `A reason is required to ${label}.`);
  }
  return trimmed;
}

async function writeAudit(input: {
  incidentId: string | null;
  action: string;
  reason?: string | null;
  before?: unknown;
  after?: unknown;
  actor?: string;
}) {
  await prisma.$executeRaw`
    INSERT INTO admin_audit_logs (
      id, incident_id, action, actor, reason, before_json, after_json, created_at
    ) VALUES (
      gen_random_uuid(),
      ${input.incidentId}::uuid,
      ${input.action},
      ${input.actor ?? "admin"},
      ${input.reason ?? null},
      ${input.before ? JSON.stringify(input.before) : null},
      ${input.after ? JSON.stringify(input.after) : null},
      NOW()
    )
  `;
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
      COALESCE(review_status::text, 'PENDING') AS review_status,
      reviewed_at,
      review_note,
      COALESCE(field_verified, false) AS field_verified,
      field_verified_at,
      resolved_at,
      resolution_note,
      duplicate_of_id::text AS duplicate_of_id,
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
    field_verified: Boolean(row.field_verified),
    duplicate_of_id: row.duplicate_of_id,
  }));
}

/** Eligible nearby for corroboration — excludes disproved/archived/rejected. */
function eligibleForCorroboration(row: AdminRow): boolean {
  const status = toReviewStatus(row.review_status);
  return (
    status !== "disproved" &&
    status !== "archived" &&
    status !== "rejected"
  );
}

function withNearby(rows: AdminRow[]): AdminIncident[] {
  const radius = env.clusterRadiusMeters;
  return rows.map((row) => {
    if (!eligibleForCorroboration(row)) {
      return toAdmin(row, 0);
    }
    const nearby = rows.filter(
      (other) =>
        other.id !== row.id &&
        other.category === row.category &&
        eligibleForCorroboration(other) &&
        haversineMeters(row.lat, row.lng, other.lat, other.lng) <= radius,
    ).length;
    return toAdmin(row, nearby + 1);
  });
}

async function getRow(id: string): Promise<AdminIncident> {
  if (!isUuid(id)) throw new HttpError(404, "This report is not on UrbanMesh.");
  const rows = await loadAdminRows();
  const all = withNearby(rows);
  const row = all.find((i) => i.id === id);
  if (!row) throw new HttpError(404, "This report is not on UrbanMesh.");
  return row;
}

/**
 * After disprove/delete: drop this report from community corroboration and
 * loosen any cluster that falls below threshold.
 */
async function stripFromCorroboration(id: string, previousClusterId: string | null) {
  await prisma.$executeRaw`
    UPDATE incidents SET
      is_verified = false,
      cluster_id = NULL
    WHERE id = CAST(${id} AS uuid)
  `;

  if (!previousClusterId) return;

  const remaining = await prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM incidents
    WHERE cluster_id = CAST(${previousClusterId} AS uuid)
      AND COALESCE(review_status::text, 'PENDING') NOT IN ('REJECTED', 'ARCHIVED', 'DISPROVED')
  `;
  const count = Number(remaining[0]?.count ?? 0);
  if (count < env.clusterThreshold) {
    await prisma.$executeRaw`
      UPDATE incidents SET
        is_verified = false,
        cluster_id = NULL
      WHERE cluster_id = CAST(${previousClusterId} AS uuid)
        AND COALESCE(review_status::text, 'PENDING') NOT IN ('REJECTED', 'ARCHIVED', 'DISPROVED')
    `;
  }
}

export async function listAdminReports(query: {
  review?: ReviewStatus | "all" | "queue";
  category?: string;
  q?: string;
  field?: "any" | "verified" | "unverified";
  community?: "any" | "supported" | "pending";
  sort?: "created_desc" | "created_asc" | "updated_desc";
  limit?: number;
  offset?: number;
}): Promise<{
  count: number;
  total_matching: number;
  offset: number;
  limit: number;
  summary: Record<ReviewStatus, number> & {
    community_supported: number;
    field_verified: number;
  };
  incidents: AdminIncident[];
}> {
  const all = withNearby(await loadAdminRows());

  const summary = {
    pending: all.filter((i) => i.review_status === "pending").length,
    approved: all.filter((i) => i.review_status === "approved").length,
    rejected: all.filter((i) => i.review_status === "rejected").length,
    flagged: all.filter((i) => i.review_status === "flagged").length,
    resolved: all.filter((i) => i.review_status === "resolved").length,
    archived: all.filter((i) => i.review_status === "archived").length,
    disproved: all.filter((i) => i.review_status === "disproved").length,
    under_review: all.filter((i) => i.review_status === "under_review").length,
    community_supported: all.filter((i) => i.community_supported).length,
    field_verified: all.filter((i) => i.field_verified).length,
  };

  let incidents = all;
  if (query.review === "queue") {
    incidents = incidents.filter(
      (i) =>
        i.review_status === "pending" ||
        i.review_status === "flagged" ||
        i.review_status === "under_review",
    );
  } else if (query.review && query.review !== "all") {
    incidents = incidents.filter((i) => i.review_status === query.review);
  }
  if (query.category && query.category !== "all") {
    incidents = incidents.filter((i) => i.category === query.category);
  }
  if (query.field === "verified") {
    incidents = incidents.filter((i) => i.field_verified);
  } else if (query.field === "unverified") {
    incidents = incidents.filter((i) => !i.field_verified);
  }
  if (query.community === "supported") {
    incidents = incidents.filter((i) => i.community_supported);
  } else if (query.community === "pending") {
    incidents = incidents.filter((i) => !i.community_supported);
  }
  if (query.q?.trim()) {
    const needle = query.q.trim().toLowerCase();
    incidents = incidents.filter((i) =>
      [i.id, i.category_label, i.corridor, i.ward_name, i.description]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }

  if (query.sort === "created_asc") {
    incidents = [...incidents].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
  } else if (query.sort === "updated_desc") {
    incidents = [...incidents].sort((a, b) => {
      const aT = a.reviewed_at ?? a.created_at;
      const bT = b.reviewed_at ?? b.created_at;
      return bT.localeCompare(aT);
    });
  }

  const total_matching = incidents.length;
  const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 500) : 100;
  const offset = query.offset && query.offset > 0 ? query.offset : 0;

  return {
    count: Math.min(limit, Math.max(0, total_matching - offset)),
    total_matching,
    offset,
    limit,
    summary,
    incidents: incidents.slice(offset, offset + limit),
  };
}

export async function getAdminReportDetail(id: string): Promise<{
  incident: AdminIncident;
  nearby: AdminIncident[];
  cluster_members: AdminIncident[];
  audit: AdminAuditEntry[];
  rules: {
    cluster_threshold: number;
    cluster_radius_meters: number;
  };
}> {
  const all = withNearby(await loadAdminRows());
  const incident = all.find((i) => i.id === id);
  if (!incident) throw new HttpError(404, "This report is not on UrbanMesh.");

  const nearby = all
    .filter(
      (other) =>
        other.id !== incident.id &&
        other.category === incident.category &&
        other.review_status !== "disproved" &&
        other.review_status !== "archived" &&
        other.review_status !== "rejected" &&
        haversineMeters(
          incident.lat,
          incident.lng,
          other.lat,
          other.lng,
        ) <= env.clusterRadiusMeters,
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const cluster_members = incident.cluster_id
    ? all
        .filter((other) => other.cluster_id === incident.cluster_id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
    : [];

  const audit = await listAuditForIncident(id);
  return {
    incident,
    nearby,
    cluster_members,
    audit,
    rules: {
      cluster_threshold: env.clusterThreshold,
      cluster_radius_meters: env.clusterRadiusMeters,
    },
  };
}

export async function listAuditForIncident(
  incidentId: string,
): Promise<AdminAuditEntry[]> {
  const rows = await prisma.$queryRaw<
    {
      id: string;
      incident_id: string | null;
      action: string;
      actor: string;
      reason: string | null;
      before_json: string | null;
      after_json: string | null;
      created_at: Date;
    }[]
  >`
    SELECT
      id::text AS id,
      incident_id::text AS incident_id,
      action,
      actor,
      reason,
      before_json,
      after_json,
      created_at
    FROM admin_audit_logs
    WHERE incident_id = CAST(${incidentId} AS uuid)
    ORDER BY created_at DESC
    LIMIT 100
  `;
  return rows.map(mapAudit);
}

export async function listGlobalAudit(limit = 100): Promise<AdminAuditEntry[]> {
  const rows = await prisma.$queryRaw<
    {
      id: string;
      incident_id: string | null;
      action: string;
      actor: string;
      reason: string | null;
      before_json: string | null;
      after_json: string | null;
      created_at: Date;
    }[]
  >`
    SELECT
      id::text AS id,
      incident_id::text AS incident_id,
      action,
      actor,
      reason,
      before_json,
      after_json,
      created_at
    FROM admin_audit_logs
    ORDER BY created_at DESC
    LIMIT ${Math.min(Math.max(limit, 1), 500)}
  `;
  return rows.map(mapAudit);
}

function mapAudit(row: {
  id: string;
  incident_id: string | null;
  action: string;
  actor: string;
  reason: string | null;
  before_json: string | null;
  after_json: string | null;
  created_at: Date;
}): AdminAuditEntry {
  return {
    id: row.id,
    incident_id: row.incident_id,
    action: row.action,
    actor: row.actor,
    reason: row.reason,
    before_json: row.before_json,
    after_json: row.after_json,
    created_at: new Date(row.created_at).toISOString(),
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { summary, incidents } = await listAdminReports({
    review: "all",
    limit: 5000,
  });
  const byCat = new Map<string, number>();
  for (const row of incidents) {
    byCat.set(row.category, (byCat.get(row.category) ?? 0) + 1);
  }
  const recent = await listGlobalAudit(12);

  const awaiting_field_inspection = incidents.filter(
    (i) =>
      !i.field_verified &&
      i.review_status !== "disproved" &&
      i.review_status !== "archived" &&
      i.review_status !== "rejected" &&
      i.review_status !== "resolved",
  ).length;

  return {
    total: incidents.length,
    pending_review:
      summary.pending + summary.flagged + summary.under_review,
    community_supported: summary.community_supported,
    field_verified: summary.field_verified,
    awaiting_field_inspection,
    disproved: summary.disproved + summary.rejected,
    resolved: summary.resolved,
    flagged: summary.flagged,
    rejected: summary.rejected,
    archived: summary.archived,
    under_review: summary.under_review,
    cluster_threshold: env.clusterThreshold,
    cluster_radius_meters: env.clusterRadiusMeters,
    by_category: [...byCat.entries()].map(([category, count]) => ({
      category,
      label: labelForCategory(category),
      count,
    })),
    recent_actions: recent,
    recent_reports: incidents.slice(0, 8),
  };
}

export async function applyAdminAction(
  id: string,
  action: AdminAction,
  input: {
    reason?: string | null;
    note?: string | null;
    reasonCode?: string | null;
    category?: string;
    duplicateOfId?: string;
  } = {},
): Promise<AdminIncident> {
  const before = await getRow(id);
  let after: AdminIncident;

  switch (action) {
    case "approve_field": {
      const note = input.note?.trim() || input.reason?.trim() || null;
      await prisma.$executeRaw`
        UPDATE incidents SET
          review_status = CAST('APPROVED' AS "ReviewStatus"),
          field_verified = true,
          field_verified_at = NOW(),
          reviewed_at = NOW(),
          review_note = ${note}
        WHERE id = CAST(${id} AS uuid)
      `;
      after = await getRow(id);
      await writeAudit({
        incidentId: id,
        action: "approve_field",
        reason: note,
        before,
        after,
      });
      break;
    }
    case "disprove":
    case "reject": {
      let auditReason: string;
      try {
        if (input.reasonCode || action === "disprove") {
          const resolved = resolveDisproveReason(
            input.reasonCode ?? input.reason,
            input.note,
          );
          auditReason = resolved.auditReason;
        } else {
          auditReason = requireReason(
            input.reason ?? input.note,
            "disprove this report",
          );
        }
      } catch (err) {
        throw new HttpError(
          400,
          err instanceof Error ? err.message : "Invalid disprove reason.",
        );
      }

      await prisma.$executeRaw`
        UPDATE incidents SET
          review_status = CAST('DISPROVED' AS "ReviewStatus"),
          reviewed_at = NOW(),
          review_note = ${auditReason},
          field_verified = false,
          field_verified_at = NULL
        WHERE id = CAST(${id} AS uuid)
      `;
      await stripFromCorroboration(id, before.cluster_id);
      after = await getRow(id);
      await writeAudit({
        incidentId: id,
        action: "disprove",
        reason: auditReason,
        before,
        after,
      });
      break;
    }
    case "under_review": {
      const note = input.note?.trim() || input.reason?.trim() || "Marked under review";
      await prisma.$executeRaw`
        UPDATE incidents SET
          review_status = CAST('UNDER_REVIEW' AS "ReviewStatus"),
          reviewed_at = NOW(),
          review_note = ${note}
        WHERE id = CAST(${id} AS uuid)
      `;
      after = await getRow(id);
      await writeAudit({
        incidentId: id,
        action: "under_review",
        reason: note,
        before,
        after,
      });
      break;
    }
    case "flag": {
      const reason = requireReason(input.reason ?? input.note, "flag this report");
      await prisma.$executeRaw`
        UPDATE incidents SET
          review_status = CAST('FLAGGED' AS "ReviewStatus"),
          reviewed_at = NOW(),
          review_note = ${reason}
        WHERE id = CAST(${id} AS uuid)
      `;
      after = await getRow(id);
      await writeAudit({
        incidentId: id,
        action: "flag",
        reason,
        before,
        after,
      });
      break;
    }
    case "resolve": {
      const reason = requireReason(
        input.reason ?? input.note,
        "mark this report resolved",
      );
      await prisma.$executeRaw`
        UPDATE incidents SET
          review_status = CAST('RESOLVED' AS "ReviewStatus"),
          resolved_at = NOW(),
          resolution_note = ${reason},
          reviewed_at = NOW(),
          review_note = ${reason}
        WHERE id = CAST(${id} AS uuid)
      `;
      after = await getRow(id);
      await writeAudit({
        incidentId: id,
        action: "resolve",
        reason,
        before,
        after,
      });
      break;
    }
    case "reopen": {
      const reason = input.reason?.trim() || "Reopened by admin";
      await prisma.$executeRaw`
        UPDATE incidents SET
          review_status = CAST('PENDING' AS "ReviewStatus"),
          resolved_at = NULL,
          resolution_note = NULL,
          reviewed_at = NOW(),
          review_note = ${reason}
        WHERE id = CAST(${id} AS uuid)
      `;
      after = await getRow(id);
      await writeAudit({
        incidentId: id,
        action: "reopen",
        reason,
        before,
        after,
      });
      break;
    }
    case "archive":
    case "delete": {
      const reason = requireReason(
        input.reason ?? input.note,
        action === "delete" ? "delete this report" : "archive this report",
      );
      await prisma.$executeRaw`
        UPDATE incidents SET
          review_status = CAST('ARCHIVED' AS "ReviewStatus"),
          reviewed_at = NOW(),
          review_note = ${reason}
        WHERE id = CAST(${id} AS uuid)
      `;
      await stripFromCorroboration(id, before.cluster_id);
      after = await getRow(id);
      await writeAudit({
        incidentId: id,
        action: action === "delete" ? "delete" : "archive",
        reason,
        before,
        after,
      });
      break;
    }
    case "restore": {
      const reason = input.reason?.trim() || "Restored to review queue";
      await prisma.$executeRaw`
        UPDATE incidents SET
          review_status = CAST('PENDING' AS "ReviewStatus"),
          reviewed_at = NOW(),
          review_note = ${reason},
          duplicate_of_id = NULL
        WHERE id = CAST(${id} AS uuid)
      `;
      after = await getRow(id);
      await writeAudit({
        incidentId: id,
        action: "restore",
        reason,
        before,
        after,
      });
      break;
    }
    case "reset_queue": {
      await prisma.$executeRaw`
        UPDATE incidents SET
          review_status = CAST('PENDING' AS "ReviewStatus"),
          reviewed_at = NULL,
          review_note = NULL,
          field_verified = false,
          field_verified_at = NULL,
          resolved_at = NULL,
          resolution_note = NULL
        WHERE id = CAST(${id} AS uuid)
      `;
      after = await getRow(id);
      await writeAudit({
        incidentId: id,
        action: "reset_queue",
        reason: input.reason ?? "Reset to pending queue",
        before,
        after,
      });
      break;
    }
    case "merge_duplicate": {
      const primaryId = input.duplicateOfId?.trim() ?? "";
      if (!isUuid(primaryId) || primaryId === id) {
        throw new HttpError(400, "Pick a valid primary report to merge into.");
      }
      const reason = requireReason(
        input.reason ?? input.note,
        "merge this duplicate",
      );
      await getRow(primaryId);
      await prisma.$executeRaw`
        UPDATE incidents SET
          review_status = CAST('ARCHIVED' AS "ReviewStatus"),
          duplicate_of_id = CAST(${primaryId} AS uuid),
          reviewed_at = NOW(),
          review_note = ${reason}
        WHERE id = CAST(${id} AS uuid)
      `;
      await stripFromCorroboration(id, before.cluster_id);
      after = await getRow(id);
      await writeAudit({
        incidentId: id,
        action: "merge_duplicate",
        reason: `${reason} → primary ${primaryId}`,
        before,
        after,
      });
      break;
    }
    case "edit_category": {
      const category = input.category?.trim() ?? "";
      if (!category) throw new HttpError(400, "Category is required.");
      const reason = requireReason(
        input.reason ?? input.note,
        "change the category",
      );
      await prisma.$executeRaw`
        UPDATE incidents SET
          category = CAST(${category} AS "HazardCategory"),
          reviewed_at = NOW(),
          review_note = ${reason}
        WHERE id = CAST(${id} AS uuid)
      `;
      after = await getRow(id);
      await writeAudit({
        incidentId: id,
        action: "edit_category",
        reason,
        before,
        after,
      });
      break;
    }
    default:
      throw new HttpError(400, "Unknown admin action.");
  }

  return after;
}

/** @deprecated Prefer applyAdminAction */
export async function setReviewStatus(
  id: string,
  status: "APPROVED" | "REJECTED" | "PENDING",
  note?: string | null,
): Promise<AdminIncident> {
  if (status === "APPROVED") {
    return applyAdminAction(id, "approve_field", { note });
  }
  if (status === "REJECTED") {
    return applyAdminAction(id, "disprove", {
      reasonCode: "other",
      note: note ?? "Rejected via legacy endpoint",
    });
  }
  return applyAdminAction(id, "reset_queue", { reason: note });
}
