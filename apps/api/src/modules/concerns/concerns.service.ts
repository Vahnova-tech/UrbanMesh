import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { HttpError } from "../../lib/httpError.js";
import {
  isNeighbourhoodId,
  type NeighbourhoodId,
} from "../../lib/neighbourhoods.js";
import { prisma } from "../../lib/prisma.js";

export const EVIDENCE_TYPES = [
  "community",
  "field",
  "public_doc",
  "derived",
  "official",
  "synthetic",
] as const;

export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export const REVIEW_STATUSES = [
  "under_review",
  "accepted",
  "rejected",
  "archived",
] as const;

export type ConcernReviewStatusValue = (typeof REVIEW_STATUSES)[number];

export type ConcernAdminAction =
  | "accept_for_publication"
  | "reject"
  | "archive"
  | "under_review";

export interface SubmitConcernInput {
  neighbourhood_id: NeighbourhoodId;
  concern_type_code: string;
  title: string;
  description: string;
  evidence_type?: EvidenceType;
  lat?: number | null;
  lng?: number | null;
  area_label?: string | null;
  observed_at?: string | null;
  source_ref?: string | null;
}

export interface ConcernPublic {
  id: string;
  neighbourhood_id: string;
  concern_type_code: string;
  concern_type_label: string;
  title: string;
  description: string;
  evidence_type: string;
  review_status: string;
  lat: number | null;
  lng: number | null;
  area_label: string | null;
  observed_at: string | null;
  source_ref: string | null;
  limitations: string | null;
  research_questions: string | null;
  synthetic: boolean;
  created_at: string;
  reviewed_at: string | null;
}

export interface ConcernAdmin extends ConcernPublic {
  review_note: string | null;
}

interface ConcernRow {
  id: string;
  neighbourhood_id: string;
  concern_type_code: string;
  concern_type_label: string | null;
  title: string;
  description: string;
  evidence_type: string;
  review_status: string;
  review_note: string | null;
  lat: number | null;
  lng: number | null;
  area_label: string | null;
  observed_at: Date | null;
  source_ref: string | null;
  limitations: string | null;
  research_questions: string | null;
  synthetic: boolean;
  created_at: Date;
  reviewed_at: Date | null;
}

/** ~100 m grid: 0.001° ≈ 111 m at the equator. */
export function generalizeCoord(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Phone / national-ID style patterns. Reject rather than silently store.
 * Intentionally broad for Kenyan mobile (+254 / 07xx) and 7–8 digit IDs.
 */
const PII_PATTERNS: RegExp[] = [
  /(?:\+?254|0)\s*[17]\d[\s-]?\d{3}[\s-]?\d{3}\b/,
  /\b0[17]\d{8}\b/,
  /\b(?:id|national\s*id|passport|nida)\s*[:#]?\s*\d{5,}\b/i,
  /\b\d{7,8}\b/,
];

export function containsPii(text: string): boolean {
  const normalized = text.replace(/[\u200b-\u200d\ufeff]/g, "");
  return PII_PATTERNS.some((re) => re.test(normalized));
}

function assertNoPii(title: string, description: string): void {
  if (containsPii(title) || containsPii(description)) {
    throw new HttpError(
      400,
      "Remove phone numbers and ID-like numbers from the title and description. Location is generalized; do not include personal identifiers.",
    );
  }
}

function toPublic(row: ConcernRow): ConcernPublic {
  return {
    id: row.id,
    neighbourhood_id: row.neighbourhood_id,
    concern_type_code: row.concern_type_code,
    concern_type_label: row.concern_type_label ?? row.concern_type_code,
    title: row.title,
    description: row.description,
    evidence_type: row.evidence_type,
    review_status: row.review_status,
    lat: row.lat == null ? null : Number(row.lat),
    lng: row.lng == null ? null : Number(row.lng),
    area_label: row.area_label,
    observed_at: row.observed_at
      ? new Date(row.observed_at).toISOString()
      : null,
    source_ref: row.source_ref,
    limitations: row.limitations,
    research_questions: row.research_questions,
    synthetic: Boolean(row.synthetic),
    created_at: new Date(row.created_at).toISOString(),
    reviewed_at: row.reviewed_at
      ? new Date(row.reviewed_at).toISOString()
      : null,
  };
}

function toAdmin(row: ConcernRow): ConcernAdmin {
  return {
    ...toPublic(row),
    review_note: row.review_note,
  };
}

const SELECT_CONCERN = Prisma.sql`
  c.id::text AS id,
  c.neighbourhood_id::text AS neighbourhood_id,
  c.concern_type_code,
  ct.label AS concern_type_label,
  c.title,
  c.description,
  c.evidence_type::text AS evidence_type,
  c.review_status::text AS review_status,
  c.review_note,
  CASE WHEN c.location IS NULL THEN NULL ELSE ST_Y(c.location::geometry) END AS lat,
  CASE WHEN c.location IS NULL THEN NULL ELSE ST_X(c.location::geometry) END AS lng,
  c.area_label,
  c.observed_at,
  c.source_ref,
  c.limitations,
  c.research_questions,
  c.synthetic,
  c.created_at,
  c.reviewed_at
`;

async function loadConcernById(id: string): Promise<ConcernRow | null> {
  const rows = await prisma.$queryRaw<ConcernRow[]>`
    SELECT ${SELECT_CONCERN}
    FROM concerns c
    LEFT JOIN concern_types ct
      ON ct.neighbourhood_id = c.neighbourhood_id
     AND ct.code = c.concern_type_code
    WHERE c.id = ${id}::uuid
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function submitConcern(
  input: SubmitConcernInput,
): Promise<{ concern_id: string; review_status: string }> {
  if (!isNeighbourhoodId(input.neighbourhood_id)) {
    throw new HttpError(400, "Choose a neighbourhood.");
  }

  const title = input.title.trim();
  const description = input.description.trim();
  if (title.length < 3 || title.length > 160) {
    throw new HttpError(400, "Title must be between 3 and 160 characters.");
  }
  if (description.length < 10 || description.length > 4000) {
    throw new HttpError(
      400,
      "Description must be between 10 and 4000 characters.",
    );
  }
  assertNoPii(title, description);

  const typeCode = input.concern_type_code.trim();
  const typeRows = await prisma.$queryRaw<{ code: string }[]>`
    SELECT code
    FROM concern_types
    WHERE neighbourhood_id = ${input.neighbourhood_id}::"NeighbourhoodId"
      AND code = ${typeCode}
    LIMIT 1
  `;
  if (!typeRows[0]) {
    throw new HttpError(400, "Choose a concern type from the taxonomy.");
  }

  const evidenceType: EvidenceType =
    input.evidence_type &&
    (EVIDENCE_TYPES as readonly string[]).includes(input.evidence_type)
      ? input.evidence_type
      : "community";

  if (evidenceType === "synthetic") {
    throw new HttpError(
      400,
      "Synthetic evidence cannot be submitted through the public form.",
    );
  }

  let lat: number | null = null;
  let lng: number | null = null;
  if (
    input.lat != null &&
    input.lng != null &&
    Number.isFinite(input.lat) &&
    Number.isFinite(input.lng)
  ) {
    if (
      input.lat < -90 ||
      input.lat > 90 ||
      input.lng < -180 ||
      input.lng > 180
    ) {
      throw new HttpError(400, "That location is outside the valid map range.");
    }
    lat = generalizeCoord(input.lat);
    lng = generalizeCoord(input.lng);
  }

  const areaLabel =
    typeof input.area_label === "string" && input.area_label.trim()
      ? input.area_label.trim().slice(0, 120)
      : null;

  let observedAt: Date | null = null;
  if (typeof input.observed_at === "string" && input.observed_at.trim()) {
    const parsed = new Date(input.observed_at);
    if (!Number.isNaN(parsed.getTime())) observedAt = parsed;
  }

  const sourceRef =
    typeof input.source_ref === "string" && input.source_ref.trim()
      ? input.source_ref.trim().slice(0, 500)
      : null;

  const concernId = randomUUID();

  if (lat != null && lng != null) {
    await prisma.$executeRaw`
      INSERT INTO concerns (
        id, neighbourhood_id, concern_type_code, title, description,
        evidence_type, review_status, location, area_label, observed_at,
        source_ref, synthetic, created_at
      ) VALUES (
        ${concernId}::uuid,
        ${input.neighbourhood_id}::"NeighbourhoodId",
        ${typeCode},
        ${title},
        ${description},
        ${evidenceType}::"ConcernEvidenceType",
        'under_review'::"ConcernReviewStatus",
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
        ${areaLabel},
        ${observedAt},
        ${sourceRef},
        false,
        NOW()
      )
    `;
  } else {
    await prisma.$executeRaw`
      INSERT INTO concerns (
        id, neighbourhood_id, concern_type_code, title, description,
        evidence_type, review_status, location, area_label, observed_at,
        source_ref, synthetic, created_at
      ) VALUES (
        ${concernId}::uuid,
        ${input.neighbourhood_id}::"NeighbourhoodId",
        ${typeCode},
        ${title},
        ${description},
        ${evidenceType}::"ConcernEvidenceType",
        'under_review'::"ConcernReviewStatus",
        NULL,
        ${areaLabel},
        ${observedAt},
        ${sourceRef},
        false,
        NOW()
      )
    `;
  }

  return { concern_id: concernId, review_status: "under_review" };
}

export async function listPublicConcerns(opts: {
  neighbourhood?: NeighbourhoodId;
  includeSynthetic?: boolean;
  limit?: number;
}): Promise<{
  count: number;
  non_synthetic_count: number;
  concerns: ConcernPublic[];
}> {
  const limit = Math.min(Math.max(opts.limit ?? 200, 1), 500);
  const neighbourhoodFilter = opts.neighbourhood
    ? Prisma.sql`AND c.neighbourhood_id = ${opts.neighbourhood}::"NeighbourhoodId"`
    : Prisma.empty;
  const syntheticFilter = opts.includeSynthetic
    ? Prisma.empty
    : Prisma.sql`AND c.synthetic = false`;

  const rows = await prisma.$queryRaw<ConcernRow[]>`
    SELECT ${SELECT_CONCERN}
    FROM concerns c
    LEFT JOIN concern_types ct
      ON ct.neighbourhood_id = c.neighbourhood_id
     AND ct.code = c.concern_type_code
    WHERE c.review_status = 'accepted'::"ConcernReviewStatus"
      ${neighbourhoodFilter}
      ${syntheticFilter}
    ORDER BY c.created_at DESC
    LIMIT ${limit}
  `;

  const countRow = await prisma.$queryRaw<{ total: number; non_synthetic: number }[]>`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE synthetic = false)::int AS non_synthetic
    FROM concerns c
    WHERE c.review_status = 'accepted'::"ConcernReviewStatus"
      ${neighbourhoodFilter}
  `;

  return {
    count: opts.includeSynthetic
      ? Number(countRow[0]?.total ?? rows.length)
      : Number(countRow[0]?.non_synthetic ?? rows.length),
    non_synthetic_count: Number(countRow[0]?.non_synthetic ?? 0),
    concerns: rows.map(toPublic),
  };
}

export async function getConcernDetail(
  id: string,
): Promise<ConcernPublic | null> {
  const row = await loadConcernById(id);
  if (!row) return null;
  if (row.review_status !== "accepted") return null;
  return toPublic(row);
}

export async function listAdminConcerns(opts: {
  status?: ConcernReviewStatusValue | "all" | "queue";
  neighbourhood?: NeighbourhoodId;
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  count: number;
  total_matching: number;
  offset: number;
  limit: number;
  summary: Record<ConcernReviewStatusValue, number> & {
    synthetic: number;
  };
  concerns: ConcernAdmin[];
}> {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  const offset = Math.max(opts.offset ?? 0, 0);
  const status = opts.status ?? "queue";

  const statusFilter =
    status === "all"
      ? Prisma.empty
      : status === "queue"
        ? Prisma.sql`AND c.review_status IN ('under_review'::"ConcernReviewStatus")`
        : Prisma.sql`AND c.review_status = ${status}::"ConcernReviewStatus"`;

  const neighbourhoodFilter = opts.neighbourhood
    ? Prisma.sql`AND c.neighbourhood_id = ${opts.neighbourhood}::"NeighbourhoodId"`
    : Prisma.empty;

  const q = opts.q?.trim();
  const qFilter = q
    ? Prisma.sql`AND (
        c.title ILIKE ${"%" + q + "%"}
        OR c.description ILIKE ${"%" + q + "%"}
        OR c.concern_type_code ILIKE ${"%" + q + "%"}
      )`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<ConcernRow[]>`
    SELECT ${SELECT_CONCERN}
    FROM concerns c
    LEFT JOIN concern_types ct
      ON ct.neighbourhood_id = c.neighbourhood_id
     AND ct.code = c.concern_type_code
    WHERE 1=1
      ${statusFilter}
      ${neighbourhoodFilter}
      ${qFilter}
    ORDER BY c.created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const totalRows = await prisma.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*)::int AS n
    FROM concerns c
    WHERE 1=1
      ${statusFilter}
      ${neighbourhoodFilter}
      ${qFilter}
  `;

  const summaryRows = await prisma.$queryRaw<
    { review_status: string; n: number; synthetic_n: number }[]
  >`
    SELECT
      review_status::text AS review_status,
      COUNT(*)::int AS n,
      COUNT(*) FILTER (WHERE synthetic)::int AS synthetic_n
    FROM concerns
    GROUP BY review_status
  `;

  const summary: Record<ConcernReviewStatusValue, number> & {
    synthetic: number;
  } = {
    under_review: 0,
    accepted: 0,
    rejected: 0,
    archived: 0,
    synthetic: 0,
  };
  for (const row of summaryRows) {
    if ((REVIEW_STATUSES as readonly string[]).includes(row.review_status)) {
      summary[row.review_status as ConcernReviewStatusValue] = Number(row.n);
    }
    summary.synthetic += Number(row.synthetic_n);
  }

  return {
    count: rows.length,
    total_matching: Number(totalRows[0]?.n ?? 0),
    offset,
    limit,
    summary,
    concerns: rows.map(toAdmin),
  };
}

async function writeConcernAudit(input: {
  concernId: string;
  action: string;
  reason?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  await prisma.$executeRaw`
    INSERT INTO admin_audit_logs (
      id, incident_id, action, actor, reason, before_json, after_json, created_at
    ) VALUES (
      gen_random_uuid(),
      NULL,
      ${input.action},
      'admin',
      ${input.reason ?? null},
      ${input.before ? JSON.stringify(input.before) : null},
      ${JSON.stringify({
        concern_id: input.concernId,
        ...(input.after && typeof input.after === "object"
          ? (input.after as object)
          : { after: input.after }),
      })},
      NOW()
    )
  `;
}

function mapActionToStatus(
  action: ConcernAdminAction,
): ConcernReviewStatusValue {
  switch (action) {
    case "accept_for_publication":
      return "accepted";
    case "reject":
      return "rejected";
    case "archive":
      return "archived";
    case "under_review":
      return "under_review";
  }
}

export async function applyConcernAction(
  id: string,
  action: ConcernAdminAction,
  opts: { reason?: string } = {},
): Promise<ConcernAdmin> {
  const existing = await loadConcernById(id);
  if (!existing) {
    throw new HttpError(404, "This concern is not on UrbanMesh.");
  }

  const nextStatus = mapActionToStatus(action);
  const reason =
    typeof opts.reason === "string" && opts.reason.trim()
      ? opts.reason.trim().slice(0, 1000)
      : null;

  if (
    (action === "reject" || action === "archive") &&
    (!reason || reason.length < 3)
  ) {
    throw new HttpError(
      400,
      action === "reject"
        ? "A reason is required to reject a concern."
        : "A reason is required to archive a concern.",
    );
  }

  const before = {
    review_status: existing.review_status,
    review_note: existing.review_note,
  };

  await prisma.$executeRaw`
    UPDATE concerns
    SET
      review_status = ${nextStatus}::"ConcernReviewStatus",
      review_note = ${reason},
      reviewed_at = NOW()
    WHERE id = ${id}::uuid
  `;

  const after = await loadConcernById(id);
  if (!after) {
    throw new HttpError(500, "Concern update did not persist.");
  }

  await writeConcernAudit({
    concernId: id,
    action: `concern.${action}`,
    reason,
    before,
    after: {
      review_status: after.review_status,
      review_note: after.review_note,
    },
  });

  return toAdmin(after);
}

export function isEvidenceType(value: unknown): value is EvidenceType {
  return (
    typeof value === "string" &&
    (EVIDENCE_TYPES as readonly string[]).includes(value)
  );
}

export function isConcernAdminAction(
  value: unknown,
): value is ConcernAdminAction {
  return (
    value === "accept_for_publication" ||
    value === "reject" ||
    value === "archive" ||
    value === "under_review"
  );
}
