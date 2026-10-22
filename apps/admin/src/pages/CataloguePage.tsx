import { useEffect, useState } from "react";
import {
  fetchCatalogue,
  type CatalogueDataset,
} from "../lib/api";

const TIER_CLASS: Record<string, string> = {
  open: "border-civic-verified/40 bg-civic-verifiedBg text-civic-verified",
  restricted: "border-civic-critical/30 bg-civic-criticalBg text-civic-critical",
  synthetic: "border-amber-500/40 bg-amber-50 text-amber-800",
};

export function CataloguePage() {
  const [datasets, setDatasets] = useState<CatalogueDataset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [neighbourhood, setNeighbourhood] = useState<"kilimani" | "kileleshwa">(
    "kileleshwa",
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchCatalogue(neighbourhood)
      .then((data) => {
        if (!cancelled) setDatasets(data.datasets);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't load catalogue.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [neighbourhood]);

  return (
    <div className="h-full overflow-y-auto px-4 py-6 lg:px-6">
      <div className="mx-auto max-w-4xl">
        <p className="um-eyebrow">Data package</p>
        <h2 className="text-xl font-semibold text-civic-ink">Dataset catalogue</h2>
        <p className="mt-2 text-sm leading-relaxed text-civic-slate">
          Metadata and access tiers for the selected neighbourhood. Restricted
          download URLs are never exposed on public routes. Upload, validation,
          and publish workflows are next (P1).
        </p>

        <label className="mt-4 inline-flex items-center gap-2 text-sm">
          <span className="text-civic-muted">Neighbourhood</span>
          <select
            value={neighbourhood}
            onChange={(e) =>
              setNeighbourhood(e.target.value as "kilimani" | "kileleshwa")
            }
            className="min-h-10 rounded-card border border-civic-line bg-civic-surface px-3 text-sm font-semibold"
          >
            <option value="kileleshwa">Kileleshwa</option>
            <option value="kilimani">Kilimani</option>
          </select>
        </label>

        {loading ? (
          <p className="mt-6 text-sm text-civic-muted">Loading…</p>
        ) : null}
        {error ? (
          <p className="mt-6 rounded-card border border-civic-critical/20 bg-civic-criticalBg px-3 py-2 text-sm text-civic-critical">
            {error}
          </p>
        ) : null}

        {!loading && !error && datasets.length === 0 ? (
          <p className="mt-6 text-sm text-civic-muted">
            No catalogue entries for this neighbourhood yet.
          </p>
        ) : null}

        <ul className="mt-6 space-y-3">
          {datasets.map((d) => (
            <li
              key={d.id}
              className="rounded-card border border-civic-line bg-civic-surface px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-civic-ink">
                    {d.title}
                  </h3>
                  <p className="mt-1 text-sm text-civic-slate">{d.description}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span
                    className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] ${
                      TIER_CLASS[d.access_tier] ??
                      "border-civic-line text-civic-muted"
                    }`}
                  >
                    {d.access_tier}
                  </span>
                  <span className="rounded-md border border-civic-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-civic-muted">
                    {d.data_kind}
                  </span>
                </div>
              </div>
              <dl className="mt-3 grid gap-2 text-xs text-civic-muted sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-civic-ink">Category</dt>
                  <dd className="mt-0.5">{d.category}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-civic-ink">Coverage</dt>
                  <dd className="mt-0.5">{d.geographic_coverage}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-civic-ink">Source</dt>
                  <dd className="mt-0.5">{d.source_organization}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-civic-ink">License</dt>
                  <dd className="mt-0.5">{d.license}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-civic-ink">Quality</dt>
                  <dd className="mt-0.5">{d.quality_notes}</dd>
                </div>
              </dl>
              {d.access_tier === "synthetic" ? (
                <p className="mt-3 rounded-md border border-amber-500/40 bg-amber-50 px-2 py-1 text-xs font-semibold uppercase tracking-[0.06em] text-amber-900">
                  Synthetic data — not for real-world findings
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
