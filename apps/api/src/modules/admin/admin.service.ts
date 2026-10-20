import { prisma } from "../../lib/prisma.js";
import { labelForCategory, severityForCategory } from "../../lib/categories.js";
import { corridorForCoordinates } from "../../lib/corridors.js";
import { haversineMeters } from "../../lib/geo.js";
import { wardForCoordinates } from "../../lib/wards.js";
import { env } from "../../lib/env.js";
import { HttpError, isUuid } from "../../lib/httpError.js";

export type ReviewStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "flagged"
  | "resolved"
  | "archived";

export type AdminAction =
  | "approve_field"
  | "reject"
  | "flag"
  | "resolve"
  | "reopen"
  | "archive"
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
  resolved: number;
  flagged: number;
  rejected: number;
  archived: number;
  by_category: { category: string; label: string; count: number }[];
  recent_actions: AdminAuditEntry[];
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

function withNearby(rows: AdminRow[]): AdminIncident[] {
  const radius = env.clusterRadiusMeters;
  return rows.map((row) => {
    const nearby = rows.filter(
      (other) =>
        other.id !== row.id &&
        other.category === row.category &&
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

export async function listAdminReports(query: {
  review?: ReviewStatus | "all" | "queue";
  category?: string;
  q?: string;
  limit?: number;
}): Promise<{
  count: number;
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
    community_supported: all.filter((i) => i.community_supported).length,
    field_verified: all.filter((i) => i.field_verified).length,
  };

  let incidents = all;
  if (query.review === "queue") {
    incidents = incidents.filter(
      (i) => i.review_status === "pending" || i.review_status === "flagged",
    );
  } else if (query.review && query.review !== "all") {
    incidents = incidents.filter((i) => i.review_status === query.review);
  }
  if (query.category && query.category !== "all") {
    incidents = incidents.filter((i) => i.category === query.category);
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

  const limit = query.limit && query.limit > 0 ? query.limit : 500;
  return { count: incidents.length, summary, incidents: incidents.slice(0, limit) };
}

export async function getAdminReportDetail(id: string): Promise<{
  incident: AdminIncident;
  nearby: AdminIncident[];
  cluster_members: AdminIncident[];
  audit: AdminAuditEntry[];
}> {
  const all = withNearby(await loadAdminRows());
  const incident = all.find((i) => i.id === id);
  if (!incident) throw new HttpError(404, "This report is not on UrbanMesh.");

  const nearby = all
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
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const cluster_members = incident.cluster_id
    ? all
        .filter((other) => other.cluster_id === incident.cluster_id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
    : [];

  const audit = await listAuditForIncident(id);
  return { incident, nearby, cluster_members, audit };
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
  return rows.map((row) => ({
    id: row.id,
    incident_id: row.incident_id,
    action: row.action,
    actor: row.actor,
    reason: row.reason,
    before_json: row.before_json,
    after_json: row.after_json,
    created_at: new Date(row.created_at).toISOString(),
  }));
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
  const recent = await prisma.$queryRaw<
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
    LIMIT 12
  `;

  return {
    total: incidents.length,
    pending_review: summary.pending + summary.flagged,
    community_supported: summary.community_supported,
    field_verified: summary.field_verified,
    resolved: summary.resolved,
    flagged: summary.flagged,
    rejected: summary.rejected,
    archived: summary.archived,
    by_category: [...byCat.entries()].map(([category, count]) => ({
      category,
      label: labelForCategory(category),
      count,
    })),
    recent_actions: recent.map((row) => ({
      id: row.id,
      incident_id: row.incident_id,
      action: row.action,
      actor: row.actor,
      reason: row.reason,
      before_json: row.before_json,
      after_json: row.after_json,
      created_at: new Date(row.created_at).toISOString(),
    })),
  };
}

export async function applyAdminAction(
  id: string,
  action: AdminAction,
  input: {
    reason?: string | null;
    note?: string | null;
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
    case "reject": {
      const reason = requireReason(input.reason ?? input.note, "reject this report");
      await prisma.$executeRaw`
        UPDATE incidents SET
          review_status = CAST('REJECTED' AS "ReviewStatus"),
          reviewed_at = NOW(),
          review_note = ${reason},
          field_verified = false,
          field_verified_at = NULL
        WHERE id = CAST(${id} AS uuid)
      `;
      after = await getRow(id);
      await writeAudit({
        incidentId: id,
        action: "reject",
        reason,
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
    case "archive": {
      const reason = requireReason(input.reason ?? input.note, "archive this report");
      await prisma.$executeRaw`
        UPDATE incidents SET
          review_status = CAST('ARCHIVED' AS "ReviewStatus"),
          reviewed_at = NOW(),
          review_note = ${reason}
        WHERE id = CAST(${id} AS uuid)
      `;
      after = await getRow(id);
      await writeAudit({
        incidentId: id,
        action: "archive",
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
    return applyAdminAction(id, "reject", { reason: note });
  }
  return applyAdminAction(id, "reset_queue", { reason: note });
}
