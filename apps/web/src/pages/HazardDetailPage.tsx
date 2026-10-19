import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  confirmHazard,
  fetchEvidence,
  photoSrc,
  type EvidenceResponse,
} from "../lib/api";
import { rememberMyReport } from "../lib/myReports";
import { formatRelative, formatWhen, formatCoords } from "../lib/format";
import { CategoryIcon, StatusBadge } from "../components/ui/StatusBadge";
import { ErrorBanner } from "../components/ui/ReportCard";
import { Skeleton } from "../components/ui/Pipeline";
import { useTheme } from "../lib/theme";
import { MARKER, tilesFor } from "../lib/mapStyle";

export function HazardDetailPage() {
  const { id = "" } = useParams();
  const { dark } = useTheme();
  const tiles = tilesFor(dark);
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

  const timeline = useMemo(() => {
    if (!data) return [];
    const rows =
      data.cluster_members.length > 0
        ? data.cluster_members
        : [data.incident, ...data.nearby];
    const seen = new Set<string>();
    return rows
      .filter((row) => {
        if (seen.has(row.id)) return false;
        seen.add(row.id);
        return true;
      })
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
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
          ? "Community-supported — your confirmation completed this 15 m cluster. That is spatial corroboration, not a field inspection."
          : "Confirmation logged. Nearby same-category reports are still needed for community support.",
      );
      setData(await fetchEvidence(id));
    } catch (err) {
      setConfirmError(
        err instanceof Error ? err.message : "Couldn't add your confirmation. Try again.",
      );
    } finally {
      setConfirming(false);
    }
  }

  async function onShare() {
    const url = window.location.href;
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
      setConfirmMessage("Link copied.");
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
        <Link to="/" className="mt-3 inline-block text-sm font-semibold text-civic-accent">
          Back to map
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
  const photo = photoSrc(incident.photo_url);

  return (
    <div className="um-scroll h-full pb-[max(2rem,env(safe-area-inset-bottom))] lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)] lg:overflow-hidden lg:pb-0">
      <div className="relative h-48 lg:h-full lg:min-h-0">
        {photo ? (
          <>
            <img src={photo} alt="Hazard evidence photograph" className="h-full w-full object-cover" />
            <p className="absolute bottom-2 left-2 rounded-md bg-civic-surface/90 px-2 py-1 text-[11px] font-semibold text-civic-ink">
              Camera evidence
            </p>
          </>
        ) : (
          <MapContainer
            center={[incident.lat, incident.lng]}
            zoom={17}
            scrollWheelZoom={false}
            zoomControl={false}
            className="h-full w-full"
          >
            <TileLayer
              key={dark ? "dark" : "light"}
              url={tiles.url}
              attribution={tiles.attribution}
            />
            <CircleMarker
              center={[incident.lat, incident.lng]}
              radius={10}
              pathOptions={{
                color: dark ? "#EEE9E1" : "#FFFFFF",
                weight: 2,
                fillColor: incident.is_verified ? MARKER.verified : MARKER.pending,
                fillOpacity: 0.95,
              }}
            />
          </MapContainer>
        )}
      </div>

      <div className="px-4 pt-5 lg:overflow-y-auto lg:border-l lg:border-civic-line lg:bg-civic-surface lg:px-6 lg:py-8">
        <p className="um-eyebrow">
          {incident.category_label}
          {incident.is_verified ? " · Community-supported cluster" : " · Individual report"}
        </p>
        <h1 className="um-display mt-2 text-2xl lg:text-3xl">
          {incident.description.split(/[.!?]/)[0]}
        </h1>
        <div className="mt-4">
          <StatusBadge verified={incident.is_verified} />
        </div>
        <p className="um-body mt-4">
          {incident.is_verified
            ? `${incident.nearby_count} nearby same-category reports corroborate this hazard within 15 m. Nairobi City County has not inspected this site.`
            : "Pending corroboration: waiting for two more same-category reports within 15 m. This is not a field inspection."}
        </p>
        <dl className="mt-5 space-y-2 border-t border-civic-line pt-4">
          <div>
            <dt className="um-eyebrow">Corridor</dt>
            <dd className="mt-0.5 text-sm font-medium text-civic-ink">{incident.corridor}</dd>
          </div>
          <div>
            <dt className="um-eyebrow">Location</dt>
            <dd className="um-meta mt-0.5">
              {incident.ward_name} · {formatCoords(incident.lat, incident.lng)}
            </dd>
          </div>
          <div>
            <dt className="um-eyebrow">Reported</dt>
            <dd className="um-meta mt-0.5">{formatWhen(incident.created_at)} EAT</dd>
          </div>
        </dl>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={confirming}
            className="flex-1 min-h-12 rounded-card bg-civic-accent py-3 text-sm font-semibold text-white transition-colors hover:bg-civic-accentDark disabled:pointer-events-none disabled:opacity-60"
          >
            {confirming ? "Confirming…" : "I'm seeing this too"}
          </button>
          <button
            type="button"
            onClick={() => void onShare()}
            className="min-h-12 rounded-card border border-civic-line px-4 py-3 text-sm font-semibold transition-colors hover:bg-civic-mist"
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

        <section className="mt-8">
          <h2 className="text-sm font-semibold">Community evidence</h2>
          <p className="mt-1 text-xs text-civic-muted">
            Timeline of nearby same-category reports, not a social feed.
          </p>
          <ol className="mt-4 space-y-0 border-l border-civic-line pl-4">
            {timeline.map((row, index) => (
              <li key={row.id} className="relative pb-5">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-civic-accent" />
                <div className="flex items-start gap-2">
                  <CategoryIcon category={row.category} className="mt-0.5 h-4 w-4 text-civic-slate" />
                  <div>
                    <p className="text-sm font-medium text-civic-ink">{row.description}</p>
                    <p className="mt-0.5 text-xs text-civic-muted">
                      {index === 0 ? "First reported" : "Nearby confirmation"} ·{" "}
                      {formatRelative(row.created_at)} · {row.corridor}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
