import { Link } from "react-router-dom";
import type { IncidentPublic } from "../../lib/api";
import { formatRelative, shortTitle } from "../../lib/format";
import { CategoryIcon, StatusBadge } from "./StatusBadge";

export function ReportCard({
  incident,
  footnote,
}: {
  incident: IncidentPublic;
  footnote?: string;
}) {
  return (
    <Link
      to={`/hazards/${incident.id}`}
      className="flex gap-3 rounded-card border border-civic-line bg-civic-surface p-3 shadow-card"
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          incident.is_verified
            ? incident.severity === "critical"
              ? "bg-civic-criticalBg text-civic-critical"
              : "bg-civic-verifiedBg text-civic-verified"
            : "bg-civic-pendingBg text-civic-pending"
        }`}
      >
        <CategoryIcon category={incident.category} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold text-civic-ink">
            {shortTitle(incident.description, incident.category_label)}
          </p>
          <span className="shrink-0 text-[11px] font-medium text-civic-muted">
            {formatRelative(incident.created_at)}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs font-medium text-civic-slate">
          {incident.corridor}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge verified={incident.is_verified} size="sm" />
          <span className="text-[11px] font-medium text-civic-muted">
            {incident.nearby_count} report{incident.nearby_count === 1 ? "" : "s"}
          </span>
        </div>
        {footnote ? (
          <p className="mt-1 text-[11px] text-civic-muted">{footnote}</p>
        ) : null}
      </div>
    </Link>
  );
}

export function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-card border border-dashed border-civic-line bg-civic-surface px-4 py-8 text-center">
      <p className="text-sm font-semibold text-civic-ink">{title}</p>
      <p className="mt-1 text-sm text-civic-muted">{body}</p>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-card bg-civic-criticalBg px-3 py-2.5 text-sm font-medium leading-snug text-civic-critical shadow-card"
    >
      {message}
    </p>
  );
}
