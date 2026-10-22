import { useEffect, useState } from "react";
import { fetchNeighbourhoods, type NeighbourhoodInfo } from "../lib/api";

export function NeighbourhoodsPage() {
  const [rows, setRows] = useState<NeighbourhoodInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchNeighbourhoods()
      .then((data) => {
        if (!cancelled) setRows(data.neighbourhoods);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't load neighbourhoods.");
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
      <div className="mx-auto max-w-3xl">
        <p className="um-eyebrow">Data package</p>
        <h2 className="text-xl font-semibold text-civic-ink">Neighbourhoods</h2>
        <p className="mt-2 text-sm leading-relaxed text-civic-slate">
          Kilimani and Kileleshwa are separate products. Boundary edits must be
          validated before publication. Provisional framing boxes are not
          authoritative ward polygons.
        </p>

        {loading ? (
          <p className="mt-6 text-sm text-civic-muted">Loading…</p>
        ) : null}
        {error ? (
          <p className="mt-6 rounded-card border border-civic-critical/20 bg-civic-criticalBg px-3 py-2 text-sm text-civic-critical">
            {error}
          </p>
        ) : null}

        <ul className="mt-6 space-y-3">
          {rows.map((n) => (
            <li
              key={n.id}
              className="rounded-card border border-civic-line bg-civic-surface px-4 py-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold text-civic-ink">
                  {n.display_name}
                </h3>
                <span className="rounded-md border border-civic-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-civic-muted">
                  {n.boundary_status.replace(/_/g, " ")}
                </span>
              </div>
              <p className="mt-2 text-sm text-civic-slate">{n.description}</p>
              <dl className="mt-3 grid gap-2 text-xs text-civic-muted sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-civic-ink">Reporting mode</dt>
                  <dd className="mt-0.5">{n.reporting_mode.replace(/_/g, " ")}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-civic-ink">Center</dt>
                  <dd className="mt-0.5 tabular-nums">
                    {n.center[0].toFixed(4)}, {n.center[1].toFixed(4)}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-civic-ink">Boundary source</dt>
                  <dd className="mt-0.5">{n.boundary_source}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-civic-ink">Note</dt>
                  <dd className="mt-0.5">{n.boundary_note}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-civic-muted">
                Layer enable/disable and authoritative polygon upload land in a
                later admin module. This view is read-only metadata for P0.
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
