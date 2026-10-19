import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  confirmHazard,
  fetchEvidence,
  type EvidenceResponse,
  type IncidentPublic,
} from "../lib/api";
import { rememberMyReport } from "../lib/myReports";
import { formatRelative, formatWhen } from "../lib/format";
import { ErrorBanner } from "../components/ui/ReportCard";
import { Skeleton } from "../components/ui/Pipeline";
import { DetailMap } from "../components/map/DetailMap";
import { EvidenceGallery } from "../components/reports/EvidenceGallery";
import { CorroborationProgress } from "../components/reports/CorroborationProgress";
import { ReportStatusCallout } from "../components/reports/ReportStatus";
import { reportPath, REPORT_NEW_PATH } from "../lib/reportStatus";
import { ButtonLink } from "../components/ui/Button";
import { haversineMeters } from "../lib/geo";

/** Group consecutive qualifying reports that arrive within this window. */
const CONSOLIDATE_WINDOW_MS = 5 * 60 * 1000;

type TimelineKind = "initial" | "batch" | "threshold" | "municipal";

type TimelineEvent = {
  key: string;
  kind: TimelineKind;
  title: string;
  source: string;
  at: string;
};

export function ReportDetailPage() {
  const { id = "" } = useParams();
  const [data, setData] = useState<EvidenceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(ev: MouseEvent) {
      if (!menuRef.current?.contains(ev.target as Node)) setMenuOpen(false);
    }
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

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
  const headline = incident.description.split(/[.!?]/)[0];

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
                prominent
              />
            </div>
          }
        />
      </div>

      <div className="px-4 pt-5 lg:overflow-y-auto lg:border-l lg:border-civic-line lg:bg-civic-surface lg:px-6 lg:py-8">
        <div className="flex items-start justify-between gap-3 border-b border-civic-line pb-4">
          <div className="min-w-0">
            <p className="um-eyebrow">{incident.category_label}</p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-civic-ink lg:text-[1.75rem]">
              {headline}
            </h1>
            <p className="um-meta mt-1.5">
              Ref · {incident.id.slice(0, 8).toUpperCase()} · Reported{" "}
              {formatWhen(incident.created_at)} EAT
            </p>
          </div>
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              aria-label="More actions"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-civic-line text-civic-slate hover:bg-civic-mist hover:text-civic-ink"
            >
              <MoreIcon />
            </button>
            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 z-20 mt-1.5 w-56 overflow-hidden rounded-card border border-civic-line bg-civic-surface shadow-card"
              >
                <Link
                  role="menuitem"
                  to={REPORT_NEW_PATH}
                  onClick={() => setMenuOpen(false)}
                  className="block px-3.5 py-2.5 text-sm font-semibold text-civic-ink hover:bg-civic-mist"
                >
                  Report inaccurate location
                </Link>
                <Link
                  role="menuitem"
                  to="/reports"
                  onClick={() => setMenuOpen(false)}
                  className="block border-t border-civic-line px-3.5 py-2.5 text-sm font-semibold text-civic-ink hover:bg-civic-mist"
                >
                  View nearby reports
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4">
          <ReportStatusCallout verified={incident.is_verified} />
        </div>

        <div className="mt-4">
          <CorroborationProgress
            nearbyCount={incident.nearby_count}
            verified={incident.is_verified}
          />
        </div>

        <section className="mt-6 overflow-hidden rounded-card border border-civic-line bg-civic-surface">
          <div className="flex items-start justify-between gap-3 border-b border-civic-line bg-civic-mist/50 px-3.5 py-3">
            <div className="min-w-0">
              <p className="um-eyebrow">Location</p>
              <p className="mt-1 text-sm font-semibold text-civic-ink">{incident.corridor}</p>
              <p className="um-meta mt-0.5">
                Near {incident.ward_name}
                {nearest != null
                  ? ` · ~${Math.round(nearest)} m from nearest qualifying report`
                  : ""}
              </p>
            </div>
            <Link
              to={`/?select=${incident.id}`}
              className="shrink-0 text-xs font-semibold text-civic-accent hover:underline"
            >
              Open map →
            </Link>
          </div>
          <div className="relative h-48 w-full sm:h-52">
            <DetailMap
              lat={incident.lat}
              lng={incident.lng}
              verified={incident.is_verified}
              prominent
            />
          </div>
        </section>

        <p className="um-body mt-5">{incident.description}</p>

        <div className="mt-6 flex items-stretch gap-2">
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={confirming}
            className="min-h-12 flex-1 rounded-card bg-civic-accent px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-civic-accentDark disabled:pointer-events-none disabled:opacity-60"
          >
            {confirming ? "Submitting…" : "+ Add supporting evidence"}
          </button>
          <button
            type="button"
            onClick={() => void onShare()}
            className="min-h-12 shrink-0 rounded-card border border-civic-line bg-civic-mist/60 px-4 text-sm font-semibold text-civic-ink transition-colors hover:bg-civic-mist"
          >
            Share
          </button>
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

        <section className="mt-8 rounded-card border border-civic-line bg-civic-surface px-3.5 py-4">
          <h2 className="text-sm font-semibold text-civic-ink">Activity history</h2>
          <p className="um-meta mt-1">
            Qualifying same-category reports and status changes. Community support is not
            official inspection.
          </p>
          <ol className="relative mt-4 space-y-4 border-l-2 border-civic-line pl-4">
            {timeline.map((row) => (
              <li key={row.key} className="relative">
                <TimelineNode kind={row.kind} />
                <p className="text-sm font-semibold text-civic-ink">{row.title}</p>
                <p className="mt-0.5 text-xs text-civic-muted">
                  {row.source} · {formatRelative(row.at)} · {formatWhen(row.at)}
                </p>
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

function TimelineNode({ kind }: { kind: TimelineKind }) {
  const base =
    "absolute -left-[21px] top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full ring-4 ring-civic-surface";
  if (kind === "threshold") {
    return (
      <span className={`${base} bg-civic-verified text-white`} aria-hidden>
        <CheckMini />
      </span>
    );
  }
  if (kind === "municipal") {
    return (
      <span className={`${base} bg-[#3B6EA5] text-white`} aria-hidden>
        <BadgeMini />
      </span>
    );
  }
  if (kind === "initial") {
    return (
      <span className={`${base} bg-civic-pending text-white`} aria-hidden>
        <HourglassMini />
      </span>
    );
  }
  return <span className={`${base} bg-civic-pending`} aria-hidden />;
}

function CheckMini() {
  return (
    <svg className="h-2 w-2" viewBox="0 0 12 12" fill="none">
      <path
        d="M2.5 6.2 4.8 8.5 9.5 3.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HourglassMini() {
  return (
    <svg className="h-2 w-2" viewBox="0 0 12 12" fill="none">
      <path
        d="M3.5 2.5h5M3.5 9.5h5M4 2.5 6 6 4 9.5M8 2.5 6 6 8 9.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BadgeMini() {
  return (
    <svg className="h-2 w-2" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="3.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <circle cx="10" cy="4.5" r="1.4" />
      <circle cx="10" cy="10" r="1.4" />
      <circle cx="10" cy="15.5" r="1.4" />
    </svg>
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

function buildTimeline(data: EvidenceResponse | null): TimelineEvent[] {
  if (!data) return [];

  const rows =
    data.cluster_members.length > 0
      ? data.cluster_members
      : [data.incident, ...data.nearby];

  const seen = new Set<string>();
  const unique = rows
    .filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    })
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  if (unique.length === 0) return [];

  const events: TimelineEvent[] = [];
  const [initial, ...rest] = unique;

  events.push({
    key: initial.id,
    kind: "initial",
    title: `Initial submission · ${initial.category_label}`,
    source: "Resident report",
    at: initial.created_at,
  });

  let i = 0;
  while (i < rest.length) {
    const seed = rest[i];
    const seedMs = Date.parse(seed.created_at);
    const batch = [seed];
    let j = i + 1;
    while (j < rest.length) {
      const nextMs = Date.parse(rest[j].created_at);
      if (Number.isFinite(seedMs) && Number.isFinite(nextMs) && nextMs - seedMs <= CONSOLIDATE_WINDOW_MS) {
        batch.push(rest[j]);
        j += 1;
      } else {
        break;
      }
    }

    const corridor = batch[0].corridor;
    const count = batch.length;
    events.push({
      key: `batch-${batch.map((row) => row.id).join("-")}`,
      kind: "batch",
      title:
        count === 1
          ? `Additional qualifying report · ${corridor}`
          : `${count} additional qualifying reports submitted`,
      source:
        count === 1
          ? `Nearby resident · ${corridor}`
          : `Nearby resident reports · ${corridor}`,
      at: batch[batch.length - 1].created_at,
    });
    i = j;
  }

  if (data.incident.is_verified) {
    const last = events[events.length - 1];
    events.push({
      key: `threshold-${data.incident.id}`,
      kind: "threshold",
      title: "Corroboration threshold reached",
      source: `System · ${Math.max(unique.length, 3)} reports matched within 15 m`,
      at: last?.at ?? data.incident.created_at,
    });
  }

  // Newest first for a cleaner feed (threshold / latest activity on top)
  return events.reverse();
}

/** Keep old import sites working during route migration. */
export { ReportDetailPage as HazardDetailPage };
