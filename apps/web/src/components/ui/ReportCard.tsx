import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { IncidentPublic, ReportResponse } from "../../lib/api";
import { confirmHazard, photoSrc } from "../../lib/api";
import { formatRelative, shortTitle } from "../../lib/format";
import {
  CORROBORATION_THRESHOLD,
  corroborationCount,
  reportPath,
  REPORT_NEW_PATH,
} from "../../lib/reportStatus";
import type { CollapsedReport } from "../../lib/collapseReports";
import {
  isGroupResolved,
  setGroupResolved,
} from "../../lib/resolvedReports";
import { rememberMyReport } from "../../lib/myReports";
import { CategoryIcon } from "./StatusBadge";
import { ReportStatusBadge } from "../reports/ReportStatus";
import { ButtonLink } from "./Button";

export function ReportCard({
  incident,
  footnote,
  onSelect,
  memberCount,
  memberIds,
  showResolved = true,
  showCorroborate = true,
  onCorroborated,
}: {
  incident: IncidentPublic;
  footnote?: string;
  onSelect?: (incident: IncidentPublic) => void;
  memberCount?: number;
  memberIds?: string[];
  showResolved?: boolean;
  showCorroborate?: boolean;
  onCorroborated?: (result: ReportResponse) => void;
}) {
  const collapsed = incident as CollapsedReport;
  const ids = memberIds?.length
    ? memberIds
    : collapsed.member_ids?.length
      ? collapsed.member_ids
      : [incident.id];
  const sightings = memberCount ?? collapsed.member_count ?? 1;
  const corroborations =
    collapsed.corroboration_count ?? Math.max(0, sightings - 1);
  const members = collapsed.members?.length
    ? collapsed.members
    : [incident];
  const latestAt = collapsed.latest_at ?? incident.created_at;
  const idKey = ids.join("|");
  const [photoFailed, setPhotoFailed] = useState(false);
  const [resolved, setResolved] = useState(() => isGroupResolved(ids));
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmOk, setConfirmOk] = useState<string | null>(null);
  const photo = photoFailed ? null : photoSrc(incident.photo_url);
  const matching = corroborationCount(incident.nearby_count);
  const needsEvidence = matching < CORROBORATION_THRESHOLD || !incident.is_verified;

  useEffect(() => {
    setPhotoFailed(false);
  }, [incident.photo_url]);

  useEffect(() => {
    function sync() {
      setResolved(isGroupResolved(ids));
    }
    sync();
    window.addEventListener("urbanmesh:resolved-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("urbanmesh:resolved-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, [idKey]);

  async function onAddEvidence(ev: MouseEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    setConfirming(true);
    setConfirmError(null);
    setConfirmOk(null);
    try {
      const result = await confirmHazard(incident.id);
      rememberMyReport(result.incident_id);
      setConfirmOk(
        result.is_verified
          ? "Confirmation logged — cluster is now community-supported."
          : "Confirmation logged. More nearby reports still help.",
      );
      onCorroborated?.(result);
    } catch (err) {
      setConfirmError(
        err instanceof Error ? err.message : "Couldn't add evidence. Try again.",
      );
    } finally {
      setConfirming(false);
    }
  }

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
        <div className="flex items-start justify-between gap-2">
          <p className="um-eyebrow">{incident.category_label}</p>
          {sightings > 1 ? (
            <span className="shrink-0 rounded-full bg-civic-mist px-2 py-0.5 text-[10px] font-semibold text-civic-slate">
              {sightings} merged
            </span>
          ) : null}
        </div>
        <p
          className={`mt-1 text-sm font-semibold leading-snug ${
            resolved ? "text-civic-muted line-through" : "text-civic-ink"
          }`}
        >
          {shortTitle(incident.description, incident.category_label)}
        </p>
        <p className="mt-0.5 truncate text-xs font-medium text-civic-slate">
          {incident.corridor}
        </p>
        <p className="um-meta mt-1.5">
          {corroborations > 0
            ? `${corroborations} new corroboration${corroborations === 1 ? "" : "s"} · ${formatRelative(latestAt)}`
            : `Reported ${formatRelative(incident.created_at)} · ${matching} matching report${matching === 1 ? "" : "s"}`}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ReportStatusBadge verified={incident.is_verified} size="sm" />
          {resolved ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-civic-mist px-1.5 py-0.5 text-[10px] font-semibold text-civic-slate">
              Resolved
            </span>
          ) : null}
        </div>
        <div className="mt-2.5 rounded-md bg-civic-mist/80 px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-civic-muted">
            Community evidence
          </p>
          <p className="mt-0.5 text-xs font-semibold text-civic-ink">
            {Math.min(matching, CORROBORATION_THRESHOLD)} of {CORROBORATION_THRESHOLD}{" "}
            reports
            {sightings > 1 ? ` · ${sightings} sightings in this card` : ""}
          </p>
        </div>
        {footnote ? (
          <p className="mt-1 text-[11px] text-civic-muted">{footnote}</p>
        ) : null}
        <p className="mt-2.5 text-xs font-semibold text-civic-accent">
          {onSelect ? "Show on map" : "View report details"}
        </p>
      </div>
    </>
  );

  const shellClass = `rounded-card border border-civic-line bg-civic-surface transition-colors hover:border-civic-slate hover:bg-civic-paper ${
    resolved ? "opacity-75" : ""
  }`;
  const mainClass = "flex gap-3 p-3";

  const main = onSelect ? (
    <button
      type="button"
      onClick={() => onSelect(incident)}
      className={`${mainClass} w-full text-left`}
    >
      {body}
    </button>
  ) : (
    <Link to={reportPath(incident.id)} className={mainClass}>
      {body}
    </Link>
  );

  return (
    <div className={shellClass}>
      {main}

      {corroborations > 0 ? (
        <div className="border-t border-civic-line/80 px-3 py-2">
          <button
            type="button"
            aria-expanded={expanded}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((open) => !open);
            }}
            className="flex w-full items-center justify-between gap-2 text-left text-xs font-semibold text-civic-slate hover:text-civic-ink"
          >
            <span>
              {corroborations} new corroboration{corroborations === 1 ? "" : "s"} (
              {formatRelative(latestAt)})
            </span>
            <span aria-hidden className="text-civic-muted">
              {expanded ? "▴" : "▾"}
            </span>
          </button>
          {expanded ? (
            <ul className="mt-2 space-y-2 border-t border-civic-line/60 pt-2">
              {members.map((row, index) => (
                <li key={row.id} className="text-xs leading-snug text-civic-slate">
                  <span className="font-semibold text-civic-ink">
                    {index === members.length - 1
                      ? "Initial report"
                      : "Corroboration"}
                  </span>
                  {" · "}
                  {shortTitle(row.description, row.category_label)}
                  <span className="mt-0.5 block text-[11px] text-civic-muted">
                    {formatRelative(row.created_at)} · {row.corridor}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {showCorroborate && needsEvidence && !resolved ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-civic-line/80 px-3 py-2.5">
          <button
            type="button"
            onClick={(e) => void onAddEvidence(e)}
            disabled={confirming}
            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-[10px] bg-civic-accent px-3 text-xs font-semibold text-white transition-colors hover:bg-civic-accentDark disabled:opacity-60 sm:flex-none"
          >
            {confirming ? "Submitting…" : "Add evidence"}
          </button>
          <Link
            to={reportPath(incident.id)}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex min-h-10 items-center justify-center rounded-[10px] border border-civic-line px-3 text-xs font-semibold text-civic-ink hover:bg-civic-mist"
          >
            Details
          </Link>
        </div>
      ) : null}

      {confirmError ? (
        <p className="border-t border-civic-critical/20 bg-civic-criticalBg px-3 py-2 text-xs font-medium text-civic-critical">
          {confirmError}
        </p>
      ) : null}
      {confirmOk ? (
        <p className="border-t border-civic-verified/20 bg-civic-verifiedBg px-3 py-2 text-xs font-medium text-civic-verified">
          {confirmOk}
        </p>
      ) : null}

      {showResolved ? (
        <label className="flex cursor-pointer items-center gap-2 border-t border-civic-line/80 px-3 py-2.5 text-xs font-semibold text-civic-slate">
          <input
            type="checkbox"
            checked={resolved}
            onChange={(e) => {
              setGroupResolved(ids, e.target.checked);
              setResolved(e.target.checked);
            }}
            className="h-4 w-4 rounded border-civic-line text-civic-accent focus:ring-civic-accent"
          />
          Mark resolved on this device
        </label>
      ) : null}
    </div>
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
