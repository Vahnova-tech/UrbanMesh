import { useCallback, useEffect, useState } from "react";
import { fetchPlannerMetrics, type PlannerMetrics } from "../lib/api";

export function AnalyticsPage({ onLogout }: { onLogout: () => void }) {
  const [metrics, setMetrics] = useState<PlannerMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMetrics(await fetchPlannerMetrics());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load analytics.");
      if (err instanceof Error && /sign-in/i.test(err.message)) onLogout();
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="h-full overflow-y-auto px-4 py-6 lg:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="um-eyebrow">Insights</p>
            <h2 className="text-xl font-semibold text-civic-ink">Analytics</h2>
            <p className="mt-1 text-sm text-civic-slate">
              Live hazard metrics from the API. Disproved and archived reports are
              excluded from these totals.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="min-h-10 rounded-full border border-civic-line px-3.5 text-xs font-semibold hover:bg-civic-mist"
          >
            Refresh
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-card border border-civic-critical/20 bg-civic-criticalBg px-3 py-2 text-sm text-civic-critical">
            {error}
          </p>
        ) : null}

        {loading && !metrics ? (
          <p className="mt-8 text-sm text-civic-muted">Loading…</p>
        ) : null}

        {metrics ? (
          <>
            <p className="mt-2 text-xs text-civic-muted">
              Generated {new Date(metrics.generated_at).toLocaleString()}
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card label="Reports" value={metrics.totals.all} />
              <Card label="Community-supported" value={metrics.totals.verified} />
              <Card label="Spatial pending" value={metrics.totals.unverified} />
              <Card label="Active clusters" value={metrics.totals.clusters} />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <section className="rounded-card border border-civic-line bg-civic-surface p-4">
                <h3 className="text-sm font-semibold">By category</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {metrics.by_category.map((row) => (
                    <li
                      key={row.category}
                      className="flex justify-between gap-3"
                    >
                      <span className="text-civic-slate">{row.label}</span>
                      <span className="font-semibold">
                        {row.count}{" "}
                        <span className="font-normal text-civic-muted">
                          ({row.verified} supported)
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="rounded-card border border-civic-line bg-civic-surface p-4">
                <h3 className="text-sm font-semibold">By ward</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {metrics.by_ward.map((row) => (
                    <li
                      key={row.ward_id}
                      className="flex justify-between gap-3"
                    >
                      <span className="text-civic-slate">{row.ward_name}</span>
                      <span className="font-semibold">
                        {row.total}{" "}
                        <span className="font-normal text-civic-muted">
                          ({row.verified} supported)
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-civic-line bg-civic-surface px-3.5 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-civic-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
