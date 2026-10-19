import { useEffect, useRef, useState } from "react";
import { fetchReports, type IncidentPublic } from "../lib/api";
import { loadMyReportIds } from "../lib/myReports";
import { formatWhen } from "../lib/format";
import { EmptyState, ErrorBanner, ReportCard } from "../components/ui/ReportCard";
import { ButtonLink } from "../components/ui/Button";
import { PipelineStrip, SkeletonList } from "../components/ui/Pipeline";

export function MyReportsPage() {
  const [items, setItems] = useState<IncidentPublic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [update, setUpdate] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const knownVerified = useRef<Set<string> | null>(null);
  const submittedAt = useRef(new Map(loadMyReportIds().map((row) => [row.id, row.at])));

  useEffect(() => {
    let cancelled = false;
    async function load(initial: boolean) {
      if (initial) setLoading(true);
      try {
        const mine = loadMyReportIds();
        submittedAt.current = new Map(mine.map((row) => [row.id, row.at]));
        const ids = new Set(mine.map((row) => row.id));
        const all = await fetchReports({ status: "all", limit: 500 });
        const next = all.filter((row) => ids.has(row.id));
        if (cancelled) return;
        const verifiedIds = new Set(next.filter((row) => row.is_verified).map((row) => row.id));
        if (knownVerified.current) {
          const newly = [...verifiedIds].filter((id) => !knownVerified.current?.has(id));
          if (newly.length > 0) {
            setUpdate(
              newly.length === 1
                ? "One of your reports is now community-supported."
                : `${newly.length} of your reports are now community-supported.`,
            );
          }
        }
        knownVerified.current = verifiedIds;
        setItems(next);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't load your reports. Try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load(true);
    const timer = window.setInterval(() => void load(false), 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [reload]);

  const pending = items.filter((i) => !i.is_verified);
  const verified = items.filter((i) => i.is_verified);
  const history = [...items].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6 pb-[max(6.5rem,calc(5rem+env(safe-area-inset-bottom)))] md:pb-8 lg:px-6 lg:py-8">
      <h1 className="um-display text-2xl lg:text-3xl">My reports</h1>
      <p className="um-body mt-2">
        Stored on this device. No public profile — just the hazards you logged in Kilimani.
      </p>
      <div className="mt-4">
        <PipelineStrip compact />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="Submitted" value={items.length} />
        <Stat label="Pending" value={pending.length} />
        <Stat label="Community-supported" value={verified.length} />
      </div>

      {update ? (
        <p className="mt-4 rounded-card border border-civic-verified bg-civic-verifiedBg px-3 py-2 text-sm font-semibold text-civic-verified">
          {update}
        </p>
      ) : null}

      {error ? (
        <div className="mt-4">
          <ErrorBanner message={error} onRetry={() => setReload((n) => n + 1)} />
        </div>
      ) : null}
      {loading ? (
        <div className="mt-4">
          <SkeletonList rows={3} />
        </div>
      ) : null}

      {!loading && items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No reports from this phone yet"
            body="When you submit a hazard, it will appear here until nearby residents corroborate a 15 m cluster."
            action={<ButtonLink to="/report">Report an issue</ButtonLink>}
          />
        </div>
      ) : null}

      {history.length > 0 ? (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-civic-ink">Report history</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {history.map((incident) => (
              <ReportCard
                key={incident.id}
                incident={incident}
                footnote={
                  submittedAt.current.get(incident.id)
                    ? `Submitted ${formatWhen(submittedAt.current.get(incident.id) as string)}`
                    : incident.is_verified
                      ? "Now inside a community-supported cluster"
                      : "Waiting for two more same-category reports within 15 m"
                }
              />
            ))}
          </div>
        </section>
      ) : null}

      {verified.length > 0 ? (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-civic-ink">Community-supported clusters</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {verified.map((incident) => (
              <ReportCard key={`v-${incident.id}`} incident={incident} />
            ))}
          </div>
        </section>
      ) : null}

      {pending.length > 0 ? (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-civic-ink">Pending corroboration</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {pending.map((incident) => (
              <ReportCard key={`p-${incident.id}`} incident={incident} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-civic-line bg-civic-surface px-3 py-4">
      <p className="um-eyebrow">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-civic-ink">{value}</p>
    </div>
  );
}