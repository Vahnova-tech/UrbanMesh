import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchEvidence, type IncidentPublic } from "../lib/api";
import { ButtonLink } from "../components/ui/Button";
import { ErrorBanner } from "../components/ui/ReportCard";
import { CorroborationProgress } from "../components/reports/CorroborationProgress";
import { ReportStatusBadge } from "../components/reports/ReportStatus";
import { reportPath, REPORT_NEW_PATH } from "../lib/reportStatus";
import { Skeleton } from "../components/ui/Pipeline";

export function ReportSubmittedPage() {
  const { id = "" } = useParams();
  const [incident, setIncident] = useState<IncidentPublic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const evidence = await fetchEvidence(id);
        if (!cancelled) {
          setIncident(evidence.incident);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Couldn't load the submitted report. Check your connection and try again.",
          );
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function copyLink() {
    const url = `${window.location.origin}${reportPath(id)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <ErrorBanner message={error} />
        <ButtonLink to={REPORT_NEW_PATH} className="mt-4 w-full">
          Return to report form
        </ButtonLink>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10" aria-busy>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-3 h-8 w-3/4" />
        <Skeleton className="mt-4 h-24 w-full" />
      </div>
    );
  }

  const ref = incident.id.slice(0, 8).toUpperCase();

  return (
    <div className="um-enter um-scroll mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col px-5 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <h1 className="text-2xl font-semibold tracking-tight text-civic-ink">
        Received
      </h1>

      <dl className="mt-6 space-y-3 rounded-card border border-civic-line px-4 py-4">
        <div>
          <dt className="um-eyebrow">Reference</dt>
          <dd className="mt-1 font-mono text-sm font-semibold tracking-wide text-civic-ink">
            {ref}
          </dd>
        </div>
        <div>
          <dt className="um-eyebrow">Hazard</dt>
          <dd className="mt-1 text-sm font-medium text-civic-ink">
            {incident.category_label} · {incident.corridor}
          </dd>
        </div>
        <div>
          <dt className="um-eyebrow">Next step</dt>
          <dd className="mt-1 flex flex-wrap items-center gap-2 text-sm font-medium text-civic-ink">
            Await corroboration
            <ReportStatusBadge verified={incident.is_verified} size="sm" />
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        <CorroborationProgress
          nearbyCount={incident.nearby_count}
          verified={incident.is_verified}
        />
      </div>

      <p className="um-meta mt-4">
        Support needs 3 same-category reports within 15 m.
      </p>

      <div className="mt-8 flex flex-col gap-2">
        <ButtonLink to={reportPath(incident.id)} className="w-full min-h-12">
          View submitted report
        </ButtonLink>
        <button
          type="button"
          onClick={() => void copyLink()}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-card border border-civic-line text-sm font-semibold text-civic-ink hover:bg-civic-mist"
        >
          {copied ? "Tracking link copied" : "Copy tracking link"}
        </button>
        <ButtonLink to="/" variant="secondary" className="w-full min-h-11">
          Browse nearby hazards
        </ButtonLink>
        <Link
          to="/reports"
          className="py-2 text-center text-sm font-semibold text-civic-accent"
        >
          Return to all reports
        </Link>
      </div>
    </div>
  );
}
