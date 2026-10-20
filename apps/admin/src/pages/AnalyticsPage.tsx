import { useCallback, useEffect, useState } from "react";
import {
  fetchAdminAnalytics,
  type AdminAnalytics,
} from "../lib/api";
import { actionLabel } from "../lib/status";

export function AnalyticsPage({ onLogout }: { onLogout: () => void }) {
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchAdminAnalytics());
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

  const o = data?.overview;
  const maxTrend = data
    ? Math.max(1, ...data.trend_14d.map((d) => d.submitted))
    : 1;
  const maxCat = data
    ? Math.max(1, ...data.by_category.map((c) => c.count))
    : 1;
  const maxCorridor = data
    ? Math.max(1, ...data.hotspots_corridor.map((c) => c.count))
    : 1;
  const maxAge = data
    ? Math.max(
        1,
        data.age_buckets.under_24h,
        data.age_buckets.days_1_7,
        data.age_buckets.days_7_30,
        data.age_buckets.over_30d,
      )
    : 1;

  return (
    <div className="h-full overflow-y-auto px-4 py-6 lg:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="um-eyebrow">Insights</p>
            <h2 className="text-xl font-semibold text-civic-ink">Analytics</h2>
            <p className="mt-1 max-w-2xl text-sm text-civic-slate">
              Live moderation and hazard stats from the admin API. Community-supported
              is spatial corroboration (≥{data?.rules.cluster_threshold ?? 3} within{" "}
              {data?.rules.cluster_radius_meters ?? 15} m) — not field inspection.
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

        {loading && !data ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-card bg-civic-mist" />
            ))}
          </div>
        ) : null}

        {data && o ? (
          <>
            <p className="mt-2 text-xs text-civic-muted">
              Generated {new Date(data.generated_at).toLocaleString()}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Total reports" value={o.total} />
              <Stat label="Open (active)" value={o.open} accent />
              <Stat label="Pending review" value={o.pending_review} />
              <Stat label="Awaiting field inspection" value={o.awaiting_field_inspection} />
              <Stat label="Community-supported" value={o.community_supported} hint={`${o.community_rate_pct}%`} />
              <Stat label="Field-verified" value={o.field_verified} hint={`${o.field_rate_pct}%`} />
              <Stat label="Resolved" value={o.resolved} />
              <Stat label="Disproved" value={o.disproved} />
              <Stat label="Deleted / archived" value={o.archived} />
              <Stat label="Flagged" value={o.flagged} />
              <Stat label="Under review" value={o.under_review} />
              <Stat label="With photo" value={o.with_photo} hint={`${o.photo_coverage_pct}%`} />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-3">
              <section className="rounded-card border border-civic-line bg-civic-surface p-4">
                <h3 className="text-sm font-semibold text-civic-ink">
                  Open report age
                </h3>
                <p className="mt-1 text-xs text-civic-muted">
                  How long active reports have been waiting.
                </p>
                <ul className="mt-4 space-y-3">
                  <BarRow label="< 24 hours" value={data.age_buckets.under_24h} max={maxAge} />
                  <BarRow label="1–7 days" value={data.age_buckets.days_1_7} max={maxAge} />
                  <BarRow label="7–30 days" value={data.age_buckets.days_7_30} max={maxAge} />
                  <BarRow label="> 30 days" value={data.age_buckets.over_30d} max={maxAge} />
                </ul>
              </section>

              <section className="rounded-card border border-civic-line bg-civic-surface p-4">
                <h3 className="text-sm font-semibold text-civic-ink">
                  Resolution & inspection time
                </h3>
                <p className="mt-1 text-xs text-civic-muted">
                  From submission to outcome (hours).
                </p>
                <dl className="mt-4 space-y-3 text-sm">
                  <TimeRow
                    label="Avg time to resolve"
                    hours={data.resolution.avg_hours_to_resolve}
                  />
                  <TimeRow
                    label="Median time to resolve"
                    hours={data.resolution.median_hours_to_resolve}
                  />
                  <TimeRow
                    label="Avg time to field verify"
                    hours={data.resolution.avg_hours_to_field_verify}
                  />
                  <TimeRow
                    label="Median time to field verify"
                    hours={data.resolution.median_hours_to_field_verify}
                  />
                  <div className="flex justify-between border-t border-civic-line pt-3">
                    <dt className="text-civic-muted">Resolved sample</dt>
                    <dd className="font-semibold">{data.resolution.resolved_count}</dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-card border border-civic-line bg-civic-surface p-4">
                <h3 className="text-sm font-semibold text-civic-ink">Severity mix</h3>
                <p className="mt-1 text-xs text-civic-muted">
                  From hazard category severity rules.
                </p>
                <ul className="mt-4 space-y-3">
                  <BarRow
                    label="Critical categories"
                    value={data.severity.critical}
                    max={Math.max(1, data.severity.critical + data.severity.standard)}
                    tone="critical"
                  />
                  <BarRow
                    label="Standard categories"
                    value={data.severity.standard}
                    max={Math.max(1, data.severity.critical + data.severity.standard)}
                  />
                </ul>
                <div className="mt-6 border-t border-civic-line pt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.05em] text-civic-muted">
                    Evidence coverage
                  </h4>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">
                    {o.photo_coverage_pct}%
                  </p>
                  <p className="mt-1 text-xs text-civic-muted">
                    {o.with_photo} with photo · {o.without_photo} without
                  </p>
                </div>
              </section>
            </div>

            <section className="mt-8 rounded-card border border-civic-line bg-civic-surface p-4">
              <h3 className="text-sm font-semibold text-civic-ink">
                14-day activity
              </h3>
              <p className="mt-1 text-xs text-civic-muted">
                Submitted, resolved, disproved, and field-verified by day.
              </p>
              <div className="mt-4 flex h-40 items-end gap-1.5 sm:gap-2">
                {data.trend_14d.map((day) => (
                  <div
                    key={day.date}
                    className="flex min-w-0 flex-1 flex-col items-center gap-1"
                    title={`${day.date}: ${day.submitted} submitted, ${day.resolved} resolved, ${day.disproved} disproved, ${day.field_verified} field-verified`}
                  >
                    <div className="flex h-28 w-full flex-col justify-end gap-0.5">
                      <div
                        className="w-full rounded-t-sm bg-civic-accent/80"
                        style={{
                          height: `${Math.max(2, (day.submitted / maxTrend) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="truncate text-[9px] text-civic-muted">
                      {day.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-civic-muted">
                Bar height = submissions that day. Hover a bar for resolved / disproved / field counts.
              </p>
            </section>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <section className="rounded-card border border-civic-line bg-civic-surface p-4">
                <h3 className="text-sm font-semibold text-civic-ink">
                  Hazard categories
                </h3>
                <ul className="mt-4 space-y-3">
                  {data.by_category.map((row) => (
                    <li key={row.category}>
                      <div className="mb-1 flex justify-between gap-2 text-sm">
                        <span className="text-civic-slate">{row.label}</span>
                        <span className="font-semibold tabular-nums">{row.count}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-civic-mist">
                        <div
                          className="h-full rounded-full bg-civic-accent"
                          style={{ width: `${(row.count / maxCat) * 100}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-civic-muted">
                        {row.community_supported} community · {row.field_verified} field ·{" "}
                        {row.open} open · {row.resolved} resolved · {row.disproved} disproved
                      </p>
                    </li>
                  ))}
                  {data.by_category.length === 0 ? (
                    <li className="text-sm text-civic-muted">No reports yet.</li>
                  ) : null}
                </ul>
              </section>

              <section className="rounded-card border border-civic-line bg-civic-surface p-4">
                <h3 className="text-sm font-semibold text-civic-ink">
                  Corridor hotspots
                </h3>
                <ul className="mt-4 space-y-3">
                  {data.hotspots_corridor.map((row) => (
                    <li key={row.corridor}>
                      <BarRow
                        label={row.corridor}
                        value={row.count}
                        max={maxCorridor}
                      />
                      <p className="mt-0.5 text-[11px] text-civic-muted">
                        {row.community_supported} community-supported · {row.open} open
                      </p>
                    </li>
                  ))}
                  {data.hotspots_corridor.length === 0 ? (
                    <li className="text-sm text-civic-muted">No corridor data.</li>
                  ) : null}
                </ul>
              </section>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <section className="rounded-card border border-civic-line bg-civic-surface p-4">
                <h3 className="text-sm font-semibold text-civic-ink">
                  Ward coverage
                </h3>
                <ul className="mt-4 space-y-2 text-sm">
                  {data.hotspots_ward.map((row) => (
                    <li
                      key={row.ward_id}
                      className="flex items-center justify-between gap-3 border-b border-civic-line/60 pb-2 last:border-0"
                    >
                      <span className="text-civic-slate">{row.ward_name}</span>
                      <span className="text-right text-xs text-civic-muted">
                        <span className="font-semibold text-civic-ink">{row.count}</span>
                        {" · "}
                        {row.community_supported} supported · {row.open} open
                      </span>
                    </li>
                  ))}
                  {data.hotspots_ward.length === 0 ? (
                    <li className="text-civic-muted">No ward data.</li>
                  ) : null}
                </ul>
              </section>

              <section className="rounded-card border border-civic-line bg-civic-surface p-4">
                <h3 className="text-sm font-semibold text-civic-ink">
                  Admin actions (30 days)
                </h3>
                <ul className="mt-4 space-y-2 text-sm">
                  {data.admin_actions_30d.length === 0 ? (
                    <li className="text-civic-muted">No audited actions in the last 30 days.</li>
                  ) : (
                    data.admin_actions_30d.map((row) => (
                      <li
                        key={row.action}
                        className="flex justify-between gap-3 border-b border-civic-line/60 pb-2 last:border-0"
                      >
                        <span className="text-civic-slate">{actionLabel(row.action)}</span>
                        <span className="font-semibold tabular-nums">{row.count}</span>
                      </li>
                    ))
                  )}
                </ul>
              </section>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: number;
  hint?: string;
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
        {hint ? (
          <span className="ml-1.5 text-sm font-medium text-civic-muted">{hint}</span>
        ) : null}
      </p>
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
  tone = "accent",
}: {
  label: string;
  value: number;
  max: number;
  tone?: "accent" | "critical";
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between gap-2 text-sm">
        <span className="truncate text-civic-slate">{label}</span>
        <span className="font-semibold tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-civic-mist">
        <div
          className={`h-full rounded-full ${
            tone === "critical" ? "bg-civic-critical" : "bg-civic-accent"
          }`}
          style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
        />
      </div>
    </div>
  );
}

function TimeRow({ label, hours }: { label: string; hours: number | null }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-civic-muted">{label}</dt>
      <dd className="font-semibold tabular-nums text-civic-ink">
        {formatHours(hours)}
      </dd>
    </div>
  );
}

function formatHours(hours: number | null): string {
  if (hours == null || !Number.isFinite(hours)) return "—";
  if (hours < 24) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} d`;
}
