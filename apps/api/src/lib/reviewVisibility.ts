/**
 * Review statuses excluded from public maps, listings, clustering,
 * community corroboration, and planner analytics.
 *
 * DISPROVED = admin disproved the hazard claim (evidence retained).
 * ARCHIVED  = soft-deleted / admin-removed (recoverable).
 * REJECTED  = legacy alias kept for rows not yet migrated to DISPROVED.
 */
export const PUBLICLY_HIDDEN_REVIEW_STATUSES = [
  "REJECTED",
  "ARCHIVED",
  "DISPROVED",
] as const;

export type PubliclyHiddenReviewStatus =
  (typeof PUBLICLY_HIDDEN_REVIEW_STATUSES)[number];

/** SQL fragment for `NOT IN (...)` — uppercase enum labels. */
export function publiclyHiddenReviewSqlList(): string {
  return PUBLICLY_HIDDEN_REVIEW_STATUSES.map((s) => `'${s}'`).join(", ");
}
