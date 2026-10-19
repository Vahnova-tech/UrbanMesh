/** Same-category reports within 15 m required for community support. */
export const CORROBORATION_THRESHOLD = 3;

export type CommunityStatus = "pending" | "community_supported";

export type OfficialStatus =
  | "none"
  | "under_review"
  | "inspected"
  | "resolution_reported"
  | "resolution_verified"
  | "closed";

export function communityStatus(isVerified: boolean): CommunityStatus {
  return isVerified ? "community_supported" : "pending";
}

export function communityStatusLabel(status: CommunityStatus): string {
  return status === "community_supported"
    ? "Community-supported"
    : "Pending corroboration";
}

export function communityStatusHint(status: CommunityStatus): string {
  return status === "community_supported"
    ? "Three or more same-category reports within 15 metres. Spatial corroboration — not a county inspection."
    : "Waiting for more same-category reports within 15 metres. Not a field inspection.";
}

/** Qualifying report count toward the 15 m corroboration threshold. */
export function corroborationCount(nearbyCount: number): number {
  return Math.max(1, nearbyCount);
}

export function corroborationNeeded(nearbyCount: number): number {
  return Math.max(0, CORROBORATION_THRESHOLD - corroborationCount(nearbyCount));
}

export function reportPath(id: string): string {
  return `/reports/${id}`;
}

export function reportSubmittedPath(id: string): string {
  return `/reports/${id}/submitted`;
}

export const REPORT_NEW_PATH = "/reports/new";
