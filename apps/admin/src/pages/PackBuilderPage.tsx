import { useEffect, useState, type FormEvent } from "react";
import {
  fetchAdminDatasets,
  fetchCatalogueLayers,
  publishDataPack,
  type AdminDataset,
  type CatalogueLayerMeta,
} from "../lib/api";

export function PackBuilderPage() {
  const [neighbourhood, setNeighbourhood] = useState<"kilimani" | "kileleshwa">(
    "kileleshwa",
  );
  const [datasets, setDatasets] = useState<AdminDataset[]>([]);
  const [layers, setLayers] = useState<CatalogueLayerMeta[]>([]);
  const [selectedDatasets, setSelectedDatasets] = useState<Set<string>>(
    new Set(),
  );
  const [selectedLayers, setSelectedLayers] = useState<Set<string>>(new Set());
  const [version, setVersion] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setOkMsg(null);
    void Promise.all([
      fetchAdminDatasets(neighbourhood),
      fetchCatalogueLayers(neighbourhood),
    ])
      .then(([ds, ly]) => {
        if (cancelled) return;
        const published = ds.datasets.filter((d) => d.published && !d.archived);
        setDatasets(published);
        setLayers(ly.layers);
        setSelectedDatasets(new Set(published.map((d) => d.id)));
        setSelectedLayers(new Set(ly.layers.map((l) => l.layer_key)));
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't load pack options.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [neighbourhood]);

  function toggleSet(set: Set<string>, id: string): Set<string> {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    setBusy(true);
    setError(null);
    setOkMsg(null);
    try {
      const result = await publishDataPack({
        neighbourhood_id: neighbourhood,
        version: version.trim(),
        title: title.trim(),
        dataset_ids: [...selectedDatasets],
        layer_keys: [...selectedLayers],
        summary: summary.trim() || undefined,
      });
      setOkMsg(
        `Published ${result.pack.title} (${result.pack.version}) as ${result.pack.status}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-6 lg:px-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-xl font-semibold text-civic-ink">Pack builder</h2>

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
        {okMsg ? (
          <p className="mt-6 rounded-card border border-civic-verified/30 bg-civic-verifiedBg px-3 py-2 text-sm text-civic-verified">
            {okMsg}
          </p>
        ) : null}

        {!loading ? (
          <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-8">
            <fieldset>
              <legend className="text-sm font-semibold text-civic-ink">
                Published datasets
              </legend>
              {datasets.length === 0 ? (
                <p className="mt-2 text-sm text-civic-muted">
                  No published datasets for this neighbourhood.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {datasets.map((d) => (
                    <li key={d.id}>
                      <label className="flex cursor-pointer items-start gap-2 rounded-card border border-civic-line bg-civic-surface px-3 py-2.5 text-sm">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={selectedDatasets.has(d.id)}
                          onChange={() =>
                            setSelectedDatasets((prev) => toggleSet(prev, d.id))
                          }
                        />
                        <span>
                          <span className="font-semibold text-civic-ink">
                            {d.title}
                          </span>
                          <span className="mt-0.5 block text-xs text-civic-muted">
                            {d.access_tier} · {d.category}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </fieldset>

            <fieldset>
              <legend className="text-sm font-semibold text-civic-ink">
                Published layers
              </legend>
              {layers.length === 0 ? (
                <p className="mt-2 text-sm text-civic-muted">
                  No published layers with features yet. Refresh OSM layers from
                  Neighbourhoods.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {layers.map((l) => (
                    <li key={l.layer_key}>
                      <label className="flex cursor-pointer items-start gap-2 rounded-card border border-civic-line bg-civic-surface px-3 py-2.5 text-sm">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={selectedLayers.has(l.layer_key)}
                          onChange={() =>
                            setSelectedLayers((prev) =>
                              toggleSet(prev, l.layer_key),
                            )
                          }
                        />
                        <span>
                          <span className="font-semibold text-civic-ink">
                            {l.title}
                          </span>
                          <span className="mt-0.5 block text-xs text-civic-muted">
                            {l.layer_key} · {l.feature_count} features
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </fieldset>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-civic-slate">
                Version
                <input
                  required
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="e.g. 2026.10"
                  className="mt-1.5 min-h-10 w-full rounded-card border border-civic-line bg-civic-surface px-3 text-sm font-normal text-civic-ink outline-none focus:border-civic-accent"
                />
              </label>
              <label className="block text-xs font-semibold text-civic-slate">
                Title
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Pack title"
                  className="mt-1.5 min-h-10 w-full rounded-card border border-civic-line bg-civic-surface px-3 text-sm font-normal text-civic-ink outline-none focus:border-civic-accent"
                />
              </label>
            </div>

            <label className="block text-xs font-semibold text-civic-slate">
              Summary (optional)
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                className="mt-1.5 w-full rounded-card border border-civic-line bg-civic-surface px-3 py-2 text-sm font-normal text-civic-ink outline-none focus:border-civic-accent"
              />
            </label>

            <button
              type="submit"
              disabled={busy}
              className="min-h-11 rounded-card bg-civic-accent px-4 text-sm font-semibold text-white hover:bg-civic-accentDark disabled:opacity-60"
            >
              {busy ? "Publishing…" : "Publish data pack"}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
