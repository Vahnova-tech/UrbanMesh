import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { IncidentPublic } from "../../lib/api";
import { photoSrc } from "../../lib/api";
import { formatRelative, shortTitle } from "../../lib/format";
import {
  CORROBORATION_THRESHOLD,
  corroborationCount,
  reportPath,
  REPORT_NEW_PATH,
} from "../../lib/reportStatus";
import { CategoryIcon } from "./StatusBadge";
import { ReportStatusBadge } from "../reports/ReportStatus";
import { ButtonLink } from "./Button";

export function ReportCard({
  incident,
  footnote,
  onSelect,
}: {
  incident: IncidentPublic;
  footnote?: string;
  onSelect?: (incident: IncidentPublic) => void;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const photo = photoFailed ? null : photoSrc(incident.photo_url);
  const count = corroborationCount(incident.nearby_count);

  useEffect(() => {
    setPhotoFailed(false);
  }, [incident.photo_url]);

  const thumb = photo ? (
    <img
      src={photo}
      alt=""
      onError={() => setPhotoFailed(true)}
      className="h-16 w-16 shrink-0 rounded-[10px] object-cover"
    />
  ) : (
    <div
      className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[10px] ${
        incident.is_verified
          ? "bg-civic-verifiedBg text-civic-verified"
          : "bg-civic-pendingBg text-civic-pending"
      }`}
    >
      <CategoryIcon category={incident.category} />
    </div>
  );

  const body = (
    <>
      {thumb}
      <div className="min-w-0 flex-1">
        <p className="um-eyebrow">{incident.category_label}</p>
        <p className="mt-1 text-sm font-semibold leading-snug text-civic-ink">
          {shortTitle(incident.description, incident.category_label)}
        </p>
        <p className="mt-0.5 truncate text-xs font-medium text-civic-slate">
          {incident.corridor}
        </p>
        <p className="um-meta mt-1.5">
          Reported {formatRelative(incident.created_at)} · {count} matching report
          {count === 1 ? "" : "s"}
        </p>
        <div className="mt-2">
          <ReportStatusBadge verified={incident.is_verified} size="sm" />
        </div>
        <div className="mt-2.5 rounded-md bg-civic-mist/80 px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-civic-muted">
            Community evidence
          </p>
          <p className="mt-0.5 text-xs font-semibold text-civic-ink">
            {Math.min(count, CORROBORATION_THRESHOLD)} of {CORROBORATION_THRESHOLD}{" "}
            reports
          </p>
        </div>
        {footnote ? (
          <p className="mt-1 text-[11px] text-civic-muted">{footnote}</p>
        ) : null}
        <p className="mt-2.5 text-xs font-semibold text-civic-accent">
          View report details
        </p>
      </div>
    </>
  );

  const className =
    "flex gap-3 rounded-card border border-civic-line bg-civic-surface p-3 transition-colors hover:border-civic-slate hover:bg-civic-paper";

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={() => onSelect(incident)}
        className={`${className} w-full text-left`}
      >
        {body}
      </button>
    );
  }

  return (
    <Link to={reportPath(incident.id)} className={className}>
      {body}
    </Link>
  );
}

export function EvidenceEmpty({
  onClear,
  filtersActive,
}: {
  onClear?: () => void;
  filtersActive?: boolean;
}) {
  return (
    <div className="flex flex-col items-center px-3 py-8 text-center">
      <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-civic-mist text-civic-accent">
        <EmptyPinIcon />
      </span>
      <p className="text-base font-semibold tracking-tight text-civic-ink">
        No matching evidence yet
      </p>
      <p className="um-body mx-auto mt-1.5 max-w-xs">
        Try a different hazard type or help document the first issue on your street.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {filtersActive && onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex min-h-11 items-center rounded-full border border-civic-line px-3.5 text-xs font-semibold text-civic-ink hover:bg-civic-mist"
          >
            Clear filters
          </button>
        ) : null}
        <ButtonLink to={REPORT_NEW_PATH} className="min-h-11 rounded-full px-3.5 text-xs">
          Report a hazard
        </ButtonLink>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-civic-line bg-civic-surface px-5 py-10 text-center">
      <p className="um-title text-base lg:text-lg">{title}</p>
      <p className="um-body mx-auto mt-2 max-w-sm">{body}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-card border border-civic-critical/20 bg-civic-criticalBg px-4 py-3 text-sm font-medium leading-snug text-civic-critical"
    >
      <p>{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 text-sm font-semibold underline underline-offset-2"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

function EmptyPinIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s7-6.2 7-11.2A7 7 0 1 0 5 9.8C5 14.8 12 21 12 21z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9.5" r="2.25" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
