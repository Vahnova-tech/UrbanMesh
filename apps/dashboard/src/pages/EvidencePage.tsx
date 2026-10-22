import { useEffect, useMemo, useState } from "react";
import {
  fetchClusters,
  fetchReports,
  generateLpdpBrief,
  LPDP_DOWNLOAD_HREF,
  type IncidentPublic,
  type SpatialCluster,
} from "../lib/api";
import { loadEvidenceSelection, saveEvidenceSelection } from "../lib/evidenceStore";
import { formatCoords } from "../lib/format";
import { EmptyState, ErrorNotice, EvidencePhoto, StatCard, StatusBadge } from "../components/ui/Primitives";

export function EvidencePage() {
  const [clusters, setClusters] = useState<SpatialCluster[]>([]);
  const [incidents, setIncidents] = useState<IncidentPublic[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchClusters(), fetchReports()])
      .then(([rows, reports]) => {
        if (cancelled) return;
        setClusters(rows);
        setIncidents(reports);
        const stored = loadEvidenceSelection();
        const valid = stored?.filter((id) => rows.some((row) => row.cluster_id === id));
        setSelected(valid && valid.length > 0 ? valid : rows.map((r) => r.cluster_id));
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't load evidence. Try again.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const grouped = useMemo(() => {
    const map = new Map<string, SpatialCluster[]>();
    for (const cluster of clusters) {
      const list = map.get(cluster.corridor) ?? [];
      list.push(cluster);
      map.set(cluster.corridor, list);
    }
    return [...map.entries()];
  }, [clusters]);

  const categories = new Set(clusters.map((c) => c.category_label)).size;

  async function onGenerate() {
    setGenerating(true);
    setMessage(null);
    setGenerateError(null);
    try {
      const result = await generateLpdpBrief(selected);
      setReady(true);
      setMessage(
        `Brief ready — ${result.cluster_count} community-supported cluster${result.cluster_count === 1 ? "" : "s"} compiled.`,
      );
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : "Couldn't compile the LPDP brief. Try again.",
      );
    } finally {
      setGenerating(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      saveEvidenceSelection(next);
      return next;
    });
  }

  return (
    <div className="p-5 lg:p-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="um-display">Evidence</h1>
        </div>
        <button
          type="button"
          onClick={() => void onGenerate()}
          disabled={generating || selected.length === 0}
          className="min-h-10 rounded-card bg-civic-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-civic-accentDark disabled:pointer-events-none disabled:opacity-60"
        >
          {generating ? "Generating brief…" : "Generate LPDP Brief"}
        </button>
      </header>
      {error ? (
        <div className="mb-4">
          <ErrorNotice message={error} onRetry={() => setReload((n) => n + 1)} />
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard label="Community-supported clusters" value={clusters.length} />
        <StatCard label="Priority corridors" value={grouped.length} />
        <StatCard label="Affected categories" value={categories} />
      </div>

      {generating ? (
        <div className="mb-4 rounded-card border border-civic-line bg-civic-mist px-4 py-3">
          <p className="text-sm font-semibold">Compiling selected clusters into an A4 brief…</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-civic-line">
            <div className="h-full w-2/3 bg-civic-accent" />
          </div>
        </div>
      ) : null}

      {generateError ? (
        <div className="mb-4">
          <ErrorNotice message={generateError} onRetry={() => void onGenerate()} />
        </div>
      ) : null}
      {message ? (
        <p className="mb-4 text-sm font-medium text-civic-accentDark">{message}</p>
      ) : null}

      {ready ? (
        <div className="mb-6 overflow-hidden rounded-card border border-civic-line bg-civic-surface">
          <div className="flex items-center justify-between border-b border-civic-line px-4 py-3">
            <p className="text-sm font-semibold">Policy brief preview</p>
            <a
              href={LPDP_DOWNLOAD_HREF}
              className="text-sm font-semibold text-civic-accent"
            >
              Download policy brief
            </a>
          </div>
          <iframe
            title="LPDP policy brief"
            src={LPDP_DOWNLOAD_HREF}
            className="h-[480px] w-full bg-civic-mist"
          />
        </div>
      ) : null}

      <div className="space-y-6">
        {clusters.length === 0 ? (
          <EmptyState
            title="No community-supported clusters yet"
            body="Individual reports become LPDP evidence only after three same-category sightings within 15 metres."
          />
        ) : null}
        {grouped.map(([corridor, rows]) => (
          <section key={corridor}>
            <h2 className="mb-3 text-sm font-semibold">{corridor}</h2>
            <div className="space-y-3">
              {rows.map((cluster) => (
                <label
                  key={cluster.cluster_id}
                  className="flex cursor-pointer gap-3 rounded-card border border-civic-line bg-civic-surface p-4"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selected.includes(cluster.cluster_id)}
                    onChange={() => toggle(cluster.cluster_id)}
                    aria-label={`Include ${cluster.category_label} on ${cluster.corridor} in the LPDP brief`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{cluster.category_label}</p>
                      <StatusBadge verified />
                    </div>
                    <p className="mt-1 text-sm text-civic-slate">
                      {cluster.ward_name} · {cluster.report_count} reports ·{" "}
                      {formatCoords(cluster.lat, cluster.lng)}
                    </p>
                    <p className="text-xs text-civic-muted">
                      {cluster.verification_status}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {incidents
                        .filter((row) => row.cluster_id === cluster.cluster_id && row.photo_url)
                        .slice(0, 4)
                        .map((row) => (
                          <EvidencePhoto
                            key={row.id}
                            url={row.photo_url}
                            alt={`${cluster.category_label} evidence`}
                            className="h-12 w-12"
                          />
                        ))}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
