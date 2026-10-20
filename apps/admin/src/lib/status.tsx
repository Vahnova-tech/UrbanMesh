import type { ReviewStatus } from "./api";

export function reviewLabel(status: ReviewStatus): string {
  switch (status) {
    case "approved":
      return "Field-verified";
    case "rejected":
      return "Rejected";
    case "flagged":
      return "Flagged";
    case "resolved":
      return "Resolved";
    case "archived":
      return "Archived";
    default:
      return "Needs review";
  }
}

export function ReviewBadge({ status }: { status: ReviewStatus }) {
  const styles: Record<ReviewStatus, string> = {
    pending: "bg-civic-pendingBg text-civic-pending",
    approved: "bg-civic-verifiedBg text-civic-verified",
    rejected: "bg-civic-criticalBg text-civic-critical",
    flagged: "bg-amber-100 text-amber-800",
    resolved: "bg-slate-200 text-slate-700",
    archived: "bg-civic-mist text-civic-muted",
  };
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${styles[status]}`}
    >
      {reviewLabel(status)}
    </span>
  );
}

export function actionLabel(action: string): string {
  const map: Record<string, string> = {
    approve_field: "Verified in field",
    reject: "Rejected",
    flag: "Flagged",
    resolve: "Marked resolved",
    reopen: "Reopened",
    archive: "Archived",
    restore: "Restored",
    merge_duplicate: "Merged duplicate",
    reset_queue: "Reset to queue",
    edit_category: "Category changed",
  };
  return map[action] ?? action;
}
