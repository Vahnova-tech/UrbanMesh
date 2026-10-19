import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  confirmHazard,
  fetchEvidence,
  type EvidenceResponse,
  type IncidentPublic,
} from "../lib/api";
import { rememberMyReport } from "../lib/myReports";
import { formatRelative, formatWhen } from "../lib/format";
import { CategoryIcon } from "../components/ui/StatusBadge";
import { ErrorBanner } from "../components/ui/ReportCard";
import { Skeleton } from "../components/ui/Pipeline";
import { DetailMap } from "../components/map/DetailMap";
import { EvidenceGallery } from "../components/reports/EvidenceGallery";
import { CorroborationProgress } from "../components/reports/CorroborationProgress";
import { ReportStatusCallout } from "../components/reports/ReportStatus";
import { reportPath, REPORT_NEW_PATH } from "../lib/reportStatus";
import { ButtonLink } from "../components/ui/Button";
import { haversineMeters } from "../lib/geo";

export function ReportDetailPage() {
  const { id = "" } = useParams();
  const [data, setData] = useState<EvidenceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const evidence = await fetchEvidence(id);
        if (!cancelled) {
          setData(evidence);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "This report is not on UrbanMesh.");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, reload]);

  const timeline = useMemo(() => buildTimeline(data), [data]);

  const galleryImages = useMemo(() => {
    if (!data) return [];
    const rows =
      data.cluster_members.length > 0
        ? data.cluster_members
        : [data.incident, ...data.nearby];
    return rows
      .filter((row) => row.photo_url)
      .map((row, index) => ({
        id: row.id,
        url: row.photo_url,
        label: `${row.category_label} evidence`,
        submittedAt: row.created_at,
        kind: (index === 0 || row.id === data.incident.id
          ? "original"
          : "community") as "original" | "community",
      }));
  }, [data]);

  async function onConfirm() {
    setConfirming(true);
    setConfirmMessage(null);
    setConfirmError(null);
    setShareError(null);
    try {
      const result = await confirmHazard(id);
      rememberMyReport(result.incident_id);
      setConfirmMessage(
        result.is_verified
          ? "Your confirmation completed this 15 m cluster. That is spatial corroboration, not a field inspection."
          : "Supporting evidence logged. More same-category reports within 15 m are still needed.",
      );
      setData(await fetchEvidence(id));
    } catch (err) {
      setConfirmError(
        err instanceof Error ? err.message : "Couldn't add supporting evidence. Try again.",
      );
    } finally {
      setConfirming(false);
    }
  }

  async function onShare() {
    const url = `${window.location.origin}${reportPath(id)}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: data?.incident.category_label ?? "UrbanMesh hazard",
          text: data?.incident.description,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareError(null);
      setConfirmMessage("Public report link copied.");
    } catch {
      setShareError("Couldn't share this report. Copy the address bar link instead.");
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[1100px] px-4 py-6 lg:px-6">
        <ErrorBanner
          message={error}
          onRetry={() => {
            setError(null);
            setReload((n) => n + 1);
          }}
        />
        <Link to="/reports" className="mt-3 inline-block text-sm font-semibold text-civic-accent">
          Back to reports
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full lg:grid lg:grid-cols-2" aria-busy>
        <Skeleton className="h-48 w-full rounded-none lg:h-full" />
        <div className="px-4 py-6 lg:px-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-2 h-7 w-3/4" />
          <Skeleton className="mt-4 h-12 w-full" />
        </div>
      </div>
    );
  }

  const { incident } = data;
  const nearest = nearestDistanceMeters(incident, data.nearby);

  return (
    <div className="um-scroll h-full pb-[max(7.5rem,calc(6rem+env(safe-area-inset-bottom)))] lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(400px,0.85fr)] lg:overflow-hidden lg:pb-0">
      <div className="relative min-h-[14rem] lg:h-full lg:min-h-0">
        <EvidenceGallery
          images={galleryImages}
          emptyFallback={
            <div className="relative h-full min-h-[14rem] w-full">
              <DetailMap
                lat={incident.lat}
                lng={incident.lng}
                verified={incident.is_verified}
              />
            </div>
          }
        />
      </div>

      <div className="px-4 pt-5 lg:overflow-y-auto lg:border-l lg:border-civic-line lg:bg-civic-surface lg:px-6 lg:py-8">
        <p className="um-eyebrow">{incident.category_label}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-civic-ink lg:text-[1.75rem]">
          {incident.description.split(/[.!?]/)[0]}
        </h1>
        <p className="um-meta mt-2">Reference · {incident.id.slice(0, 8).toUpperCase()}</p>

        <div className="mt-4">
          <ReportStatusCallout verified={incident.is_verified} />
        </div>

        <div className="mt-4">
          <CorroborationProgress
            nearbyCount={incident.nearby_count}
            verified={incident.is_verified}
          />
        </div>

        <section className="mt-6 rounded-card border border-civic-line px-3.5 py-3.5">
          <p className="um-eyebrow">Location</p>
          <p className="mt-1 text-sm font-semibold text-civic-ink">{incident.corridor}</p>
          <p className="um-meta mt-0.5">
            Near {incident.ward_name}
            {nearest != null
              ? ` · ~${Math.round(nearest)} m from nearest qualifying report`
              : ""}
          </p>
          <div className="relative mt-3 h-36 overflow-hidden rounded-[10px] border border-civic-line">
            <DetailMap
              lat={incident.lat}
              lng={incident.lng}
              verified={incident.is_verified}
            />
          </div>
          <Link
            to={`/?select=${incident.id}`}
            className="mt-3 inline-flex text-sm font-semibold text-civic-accent"
          >
            Open location on map
          </Link>
        </section>

        <p className="um-body mt-5">{incident.description}</p>
        <p className="um-meta mt-2">Reported {formatWhen(incident.created_at)} EAT</p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={confirming}
            className="min-h-12 flex-1 rounded-card bg-civic-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-civic-accentDark disabled:pointer-events-none disabled:opacity-60"
          >
            {confirming ? "Submitting…" : "Add supporting evidence"}
          </button>
          <button
            type="button"
            onClick={() => void onShare()}
            className="min-h-12 rounded-card border border-civic-line px-4 text-sm font-semibold transition-colors hover:bg-civic-mist"
          >
            Share link
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-civic-slate">
          <Link to={REPORT_NEW_PATH} className="hover:text-civic-ink">
            Report inaccurate location
          </Link>
          <Link to="/reports" className="hover:text-civic-ink">
            View nearby reports
          </Link>
        </div>

        {confirmError ? (
          <div className="mt-3">
            <ErrorBanner message={confirmError} onRetry={() => void onConfirm()} />
          </div>
        ) : null}
        {shareError ? (
          <div className="mt-3">
            <ErrorBanner message={shareError} />
          </div>
        ) : null}
        {confirmMessage ? (
          <p className="mt-3 text-sm font-medium text-civic-accentDark">{confirmMessage}</p>
        ) : null}

        <section className="mt-10">
          <h2 className="text-base font-semibold text-civic-ink">Activity history</h2>
          <p className="um-meta mt-1">
            Qualifying same-category reports and status changes. Community support is not
            official inspection.
          </p>
          <ol className="mt-4 space-y-0 border-l border-civic-line pl-4">
            {timeline.map((row) => (
              <li key={row.key} className="relative pb-5">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-civic-accent" />
                <div className="flex items-start gap-2">
                  {row.category ? (
                    <CategoryIcon
                      category={row.category}
                      className="mt-0.5 h-4 w-4 text-civic-slate"
                    />
                  ) : null}
                  <div>
                    <p className="text-sm font-medium text-civic-ink">{row.title}</p>
                    <p className="mt-0.5 text-xs text-civic-muted">
                      {row.source} · {formatRelative(row.at)} · {formatWhen(row.at)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <ButtonLink to="/reports" variant="secondary" className="mt-6 w-full min-h-11">
          Back to all reports
        </ButtonLink>
      </div>
    </div>
  );
}

function nearestDistanceMeters(
  incident: IncidentPublic,
  nearby: IncidentPublic[],
): number | null {
  let best: number | null = null;
  for (const row of nearby) {
    if (row.id === incident.id) continue;
    const d = haversineMeters(incident.lat, incident.lng, row.lat, row.lng);
    if (best == null || d < best) best = d;
  }
  return best;
}

function buildTimeline(data: EvidenceResponse | null) {
  if (!data) return [];
  const rows =
    data.cluster_members.length > 0
      ? data.cluster_members
      : [data.incident, ...data.nearby];
  const seen = new Set<string>();
  const events = rows
    .filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    })
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((row, index) => ({
      key: row.id,
      title:
        index === 0
          ? `Initial submission · ${row.category_label}`
          : `Additional qualifying evidence · ${row.corridor}`,
      source: index === 0 ? "Resident report" : "Nearby same-category report",
      at: row.created_at,
      category: row.category,
    }));

  if (data.incident.is_verified) {
    const last = events[events.length - 1];
    events.push({
      key: `threshold-${data.incident.id}`,
      title: "Corroboration threshold reached",
      source: "System · ≥3 reports within 15 m",
      at: last?.at ?? data.incident.created_at,
      category: data.incident.category,
    });
  }

  return events;
}

/** Keep old import sites working during route migration. */
export { ReportDetailPage as HazardDetailPage };
