import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { fetchConcern, type ConcernPublic } from "../lib/api";
import { formatCoords, formatRelative, formatWhen } from "../lib/format";
import { ErrorBanner } from "../components/ui/ReportCard";
import { Skeleton } from "../components/ui/Pipeline";
import { ButtonLink } from "../components/ui/Button";

export function ConcernDetailPage() {
  const { id = "" } = useParams();
  const location = useLocation();
  const justSubmitted = Boolean(
    (location.state as { justSubmitted?: boolean } | null)?.justSubmitted,
  );
  const [concern, setConcern] = useState<ConcernPublic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const row = await fetchConcern(id);
        if (!cancelled) {
          setConcern(row);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setConcern(null);
          setError(
            err instanceof Error
              ? err.message
              : justSubmitted
                ? "Your concern was received for review. It is not public until accepted."
                : "This concern is not on UrbanMesh.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, justSubmitted]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-4 h-24 w-full" />
      </div>
    );
  }

  if (error || !concern) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        {justSubmitted ? (
          <div className="rounded-card border border-civic-line bg-civic-surface p-5">
            <p className="um-eyebrow">Submitted</p>
            <h1 className="um-title mt-1">Concern received for review</h1>
            <p className="mt-3 text-sm leading-relaxed text-civic-slate">
              UrbanMesh does not publish planning concerns until an admin accepts
              them for the evidence pack. This is not Kilimani hazard reporting,
              and acceptance is not a county confirmation.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <ButtonLink to="/concerns/new">Share another</ButtonLink>
              <Link
                to="/kileleshwa"
                className="inline-flex min-h-11 items-center rounded-card border border-civic-line px-4 text-sm font-semibold text-civic-ink hover:bg-civic-mist"
              >
                Back to data pack
              </Link>
            </div>
          </div>
        ) : (
          <>
            <ErrorBanner
              message={error ?? "This concern is not on UrbanMesh."}
            />
            <div className="mt-4">
              <ButtonLink to="/kileleshwa" variant="secondary">
                Kileleshwa data pack
              </ButtonLink>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-[max(7rem,calc(5rem+env(safe-area-inset-bottom)))]">
      <p className="um-eyebrow">
        {concern.neighbourhood_id} · {concern.concern_type_label}
      </p>
      <h1 className="um-title mt-1">{concern.title}</h1>
      <p className="um-meta mt-2">
        Published {formatRelative(concern.created_at)} ·{" "}
        {formatWhen(concern.created_at)} EAT
      </p>

      {concern.synthetic ? (
        <p
          role="status"
          className="mt-4 rounded-card border border-civic-pending/40 bg-civic-pendingBg px-3 py-2.5 text-sm font-semibold text-civic-pending"
        >
          Synthetic scenario evidence — not observed community data. Do not treat
          as confirmed field findings.
        </p>
      ) : null}

      <p className="mt-5 text-sm leading-relaxed text-civic-slate">
        {concern.description}
      </p>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        <Meta label="Evidence type" value={concern.evidence_type} />
        <Meta label="Review status" value={concern.review_status} />
        {concern.area_label ? (
          <Meta label="Area" value={concern.area_label} />
        ) : null}
        {concern.lat != null && concern.lng != null ? (
          <Meta
            label="Generalized location"
            value={formatCoords(concern.lat, concern.lng)}
          />
        ) : (
          <Meta label="Location" value="Not published as a point" />
        )}
        {concern.source_ref ? (
          <Meta label="Source" value={concern.source_ref} />
        ) : null}
        {concern.limitations ? (
          <Meta label="Limitations" value={concern.limitations} />
        ) : null}
      </dl>

      <p className="mt-6 text-xs leading-relaxed text-civic-muted">
        Accepted planning concerns are community or documentary evidence for
        discussion. They are not Kilimani infrastructure hazards and do not imply
        KIWANA or county confirmation.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink to="/concerns/new" variant="secondary">
          Share a concern
        </ButtonLink>
        <Link
          to="/kileleshwa"
          className="inline-flex min-h-11 items-center rounded-card border border-civic-line px-4 text-sm font-semibold text-civic-ink hover:bg-civic-mist"
        >
          Data pack
        </Link>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-civic-line/80 bg-civic-mist/40 px-3 py-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.05em] text-civic-muted">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-civic-ink">{value}</dd>
    </div>
  );
}
