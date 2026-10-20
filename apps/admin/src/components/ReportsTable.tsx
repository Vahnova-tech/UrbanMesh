import { Link } from "react-router-dom";
import type { AdminIncident } from "../lib/api";
import { formatRelative, formatWhen } from "../lib/format";
import { ReviewBadge } from "../lib/status";

export function ReportsTable({
  rows,
  loading,
  empty = "No reports match these filters.",
}: {
  rows: AdminIncident[];
  loading?: boolean;
  empty?: string;
}) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded-card bg-civic-mist/80"
          />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="px-4 py-12 text-center text-sm text-civic-muted">{empty}</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-civic-line text-[10px] font-semibold uppercase tracking-[0.05em] text-civic-muted">
            <th className="px-3 py-2.5">Ref</th>
            <th className="px-3 py-2.5">Category</th>
            <th className="px-3 py-2.5">Description</th>
            <th className="px-3 py-2.5">Location</th>
            <th className="px-3 py-2.5">Submitted</th>
            <th className="px-3 py-2.5">Status</th>
            <th className="px-3 py-2.5">Community</th>
            <th className="px-3 py-2.5">Field</th>
            <th className="px-3 py-2.5">Updated</th>
            <th className="px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-civic-line/70 hover:bg-civic-mist/40"
            >
              <td className="px-3 py-2.5 font-mono text-xs text-civic-slate">
                {row.id.slice(0, 8).toUpperCase()}
              </td>
              <td className="px-3 py-2.5 text-civic-ink">{row.category_label}</td>
              <td className="max-w-[14rem] px-3 py-2.5">
                <p className="line-clamp-2 text-civic-slate">{row.description}</p>
              </td>
              <td className="px-3 py-2.5 text-xs text-civic-muted">
                {row.corridor}
                <br />
                {row.ward_name}
              </td>
              <td className="px-3 py-2.5 text-xs text-civic-muted">
                <span title={formatWhen(row.created_at)}>
                  {formatRelative(row.created_at)}
                </span>
              </td>
              <td className="px-3 py-2.5">
                <ReviewBadge status={row.review_status} />
              </td>
              <td className="px-3 py-2.5 text-xs">
                {row.community_supported ? (
                  <span className="font-semibold text-civic-verified">Yes</span>
                ) : (
                  <span className="text-civic-muted">No</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-xs">
                {row.field_verified ? (
                  <span className="font-semibold text-civic-accent">Yes</span>
                ) : (
                  <span className="text-civic-muted">No</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-xs text-civic-muted">
                {row.reviewed_at
                  ? formatRelative(row.reviewed_at)
                  : "—"}
              </td>
              <td className="px-3 py-2.5">
                <Link
                  to={`/reports/${row.id}`}
                  className="text-xs font-semibold text-civic-accent hover:underline"
                >
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
