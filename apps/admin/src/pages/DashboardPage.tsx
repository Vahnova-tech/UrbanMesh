import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ReportsTable } from "../components/ReportsTable";
import { fetchDashboard, type DashboardStats } from "../lib/api";
import { formatRelative } from "../lib/format";
import { actionLabel } from "../lib/status";

export function DashboardPage({ onLogout }: { onLogout: () => void }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStats(await fetchDashboard());
      setFetchedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load dashboard.");
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
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="um-eyebrow">Overview</p>
            <h2 className="text-xl font-semibold tracking-tight text-civic-ink">
              Operations dashboard
            </h2>
            <p className="mt-1 max-w-xl text-sm text-civic-slate">
              Community-supported is spatial corroboration (≥
              {stats?.cluster_threshold ?? 3} within{" "}
              {stats?.cluster_radius_meters ?? 15} m) — not field inspection.
              Disproved and deleted reports are excluded from public hazard views.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {fetchedAt ? (
              <span className="text-xs text-civic-muted">
                {loading ? "Refreshing…" : `Updated ${fetchedAt.toLocaleTimeString()}`}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void load()}
              className="min-h-10 rounded-full border border-civic-line px-3.5 text-xs font-semibold hover:bg-civic-mist"
            >
              Refresh
            </button>
            <Link
              to="/queue"
              className="inline-flex min-h-10 items-center rounded-full bg-civic-accent px-3.5 text-xs font-semibold text-white hover:bg-civic-accentDark"
            >
              Open review queue
            </Link>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-card border border-civic-critical/20 bg-civic-criticalBg px-3 py-2 text-sm font-medium text-civic-critical">
            {error}
          </p>
        ) : null}

        {loading && !stats ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-card bg-civic-mist"
              />
            ))}
          </div>
        ) : null}

        {stats ? (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Total reports" value={stats.total} />
              <Stat label="Pending review" value={stats.pending_review} accent />
              <Stat
                label="Community-supported"
                value={stats.community_supported}
              />
              <Stat label="Field-verified" value={stats.field_verified} />
              <Stat
                label="Awaiting field inspection"
                value={stats.awaiting_field_inspection}
              />
              <Stat label="Disproved" value={stats.disproved} />
              <Stat label="Resolved" value={stats.resolved} />
              <Stat label="Deleted / archived" value={stats.archived} />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <section className="rounded-card border border-civic-line bg-civic-surface p-4">
                <h3 className="text-sm font-semibold text-civic-ink">
                  Recent admin actions
                </h3>
                {stats.recent_actions.length === 0 ? (
                  <p className="mt-3 text-sm text-civic-muted">
                    No audit entries yet.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {stats.recent_actions.map((row) => (
                      <li
                        key={row.id}
                        className="border-b border-civic-line/60 pb-2 last:border-0"
                      >
                        <p className="text-sm font-semibold text-civic-ink">
                          {actionLabel(row.action)}
                        </p>
                        <p className="mt-0.5 text-xs text-civic-muted">
                          {row.actor} · {formatRelative(row.created_at)}
                          {row.incident_id ? (
                            <>
                              {" · "}
                              <Link
                                to={`/reports/${row.incident_id}`}
                                className="font-semibold text-civic-accent hover:underline"
                              >
                                {row.incident_id.slice(0, 8).toUpperCase()}
                              </Link>
                            </>
                          ) : null}
                        </p>
                        {row.reason ? (
                          <p className="mt-1 text-xs text-civic-slate">
                            {row.reason}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  to="/audit"
                  className="mt-3 inline-block text-xs font-semibold text-civic-accent hover:underline"
                >
                  View all audit logs →
                </Link>
              </section>

              <section className="rounded-card border border-civic-line bg-civic-surface p-4">
                <h3 className="text-sm font-semibold text-civic-ink">
                  By category
                </h3>
                <ul className="mt-3 space-y-2">
                  {stats.by_category.length === 0 ? (
                    <li className="text-sm text-civic-muted">No reports yet.</li>
                  ) : (
                    stats.by_category
                      .sort((a, b) => b.count - a.count)
                      .map((row) => (
                        <li
                          key={row.category}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="text-civic-slate">{row.label}</span>
                          <span className="font-semibold text-civic-ink">
                            {row.count}
                          </span>
                        </li>
                      ))
                  )}
                </ul>
              </section>
            </div>

            <section className="mt-8 overflow-hidden rounded-card border border-civic-line bg-civic-surface">
              <div className="flex items-center justify-between border-b border-civic-line px-4 py-3">
                <h3 className="text-sm font-semibold text-civic-ink">
                  Recent reports
                </h3>
                <Link
                  to="/reports"
                  className="text-xs font-semibold text-civic-accent hover:underline"
                >
                  All reports →
                </Link>
              </div>
              <ReportsTable rows={stats.recent_reports} empty="No reports yet." />
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-card border px-3.5 py-3 ${
        accent
          ? "border-civic-accent/30 bg-civic-verifiedBg/50"
          : "border-civic-line bg-civic-surface"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-civic-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-civic-ink">
        {value}
      </p>
    </div>
  );
}
