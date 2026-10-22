import { useEffect, useState } from "react";
import { fetchDataQuality, type DataQualityCounts } from "../lib/api";
import { formatWhen } from "../lib/format";

export function DataQualityPage() {
  const [data, setData] = useState<DataQualityCounts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchDataQuality()
      .then((row) => {
        if (!cancelled) setData(row);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't load counts.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="h-full overflow-y-auto px-4 py-6 lg:px-6">
      <div className="mx-auto max-w-4xl">
        <p className="um-eyebrow">Data package</p>
        <h2 className="text-xl font-semibold text-civic-ink">Data quality</h2>
        <p className="mt-2 text-sm leading-relaxed text-civic-slate">
          Database counts only. No completeness percentages are inferred.
        </p>

        {loading ? (
          <p className="mt-6 text-sm text-civic-muted">Loading…</p>
        ) : null}
        {error ? (
          <p className="mt-6 rounded-card border border-civic-critical/20 bg-civic-criticalBg px-3 py-2 text-sm text-civic-critical">
            {error}
          </p>
        ) : null}

        {data ? (
          <>
            <p className="mt-4 text-xs text-civic-muted">
              Generated {formatWhen(data.generated_at)} EAT
            </p>

            <section className="mt-8">
              <h3 className="text-sm font-semibold text-civic-ink">Datasets</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                <CountCard label="Total" value={data.datasets.total} />
                <CountCard label="Unpublished" value={data.datasets.unpublished} />
                <CountCard label="Archived" value={data.datasets.archived} />
                <CountCard label="With file" value={data.datasets.with_file} />
                <CountCard
                  label="Missing metadata"
                  value={data.datasets.missing_metadata}
                />
                <CountCard label="Synthetic" value={data.datasets.synthetic} />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Breakdown
                  title="By category"
                  rows={data.datasets.by_category.map((r) => ({
                    label: r.category,
                    count: r.count,
                  }))}
                />
                <Breakdown
                  title="By access tier"
                  rows={data.datasets.by_tier.map((r) => ({
                    label: r.tier,
                    count: r.count,
                  }))}
                />
              </div>
            </section>

            <section className="mt-10 border-t border-civic-line pt-8">
              <h3 className="text-sm font-semibold text-civic-ink">Concerns</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
                <CountCard
                  label="Awaiting review"
                  value={data.concerns.awaiting_review}
                />
                <CountCard label="Accepted" value={data.concerns.accepted} />
                <CountCard label="Rejected" value={data.concerns.rejected} />
                <CountCard label="Archived" value={data.concerns.archived} />
                <CountCard label="Synthetic" value={data.concerns.synthetic} />
              </div>
            </section>

            <section className="mt-10 border-t border-civic-line pt-8">
              <h3 className="text-sm font-semibold text-civic-ink">Layers</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <CountCard label="Total" value={data.layers.total} />
                <CountCard label="Published" value={data.layers.published} />
                <CountCard
                  label="Stale / never refreshed"
                  value={data.layers.stale_or_never_refreshed}
                />
              </div>
              <ul className="mt-4 space-y-2">
                {data.layers.by_neighbourhood.map((row) => (
                  <li
                    key={row.neighbourhood_id}
                    className="rounded-card border border-civic-line bg-civic-surface px-3 py-2 text-sm"
                  >
                    <span className="font-semibold text-civic-ink">
                      {row.neighbourhood_id}
                    </span>
                    <span className="text-civic-muted">
                      {" "}
                      · {row.count} layer{row.count === 1 ? "" : "s"}
                      {row.refreshed_at_latest
                        ? ` · latest refresh ${formatWhen(row.refreshed_at_latest)}`
                        : " · never refreshed"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-10 border-t border-civic-line pt-8">
              <h3 className="text-sm font-semibold text-civic-ink">Data packs</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <CountCard label="Total versions" value={data.packs.total} />
              </div>
              <Breakdown
                title="By status"
                rows={data.packs.by_status.map((r) => ({
                  label: r.status,
                  count: r.count,
                }))}
              />
              {data.packs.versions.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {data.packs.versions.map((v) => (
                    <li
                      key={`${v.neighbourhood_id}-${v.version}`}
                      className="rounded-card border border-civic-line bg-civic-surface px-3 py-2 text-sm text-civic-slate"
                    >
                      <span className="font-semibold text-civic-ink">
                        {v.neighbourhood_id}
                      </span>{" "}
                      · v{v.version} · {v.status}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-civic-muted">No pack versions yet.</p>
              )}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-civic-line bg-civic-surface px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-civic-muted">
        {label}
      </p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums text-civic-ink">
        {value}
      </p>
    </div>
  );
}

function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; count: number }[];
}) {
  if (rows.length === 0) {
    return (
      <div className="mt-3">
        <p className="text-xs font-semibold text-civic-muted">{title}</p>
        <p className="mt-1 text-sm text-civic-muted">None</p>
      </div>
    );
  }
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-civic-muted">{title}</p>
      <ul className="mt-2 space-y-1">
        {rows.map((r) => (
          <li
            key={r.label}
            className="flex items-center justify-between rounded-md border border-civic-line/70 bg-civic-mist/30 px-2.5 py-1.5 text-sm"
          >
            <span className="text-civic-ink">{r.label}</span>
            <span className="font-semibold tabular-nums text-civic-slate">
              {r.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
