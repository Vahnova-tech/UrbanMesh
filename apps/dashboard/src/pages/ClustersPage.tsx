import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  fetchClusters,
  fetchReports,
  type IncidentPublic,
  type SpatialCluster,
} from "../lib/api";
import { addEvidenceCluster } from "../lib/evidenceStore";
import { formatCoords, formatWhen } from "../lib/format";
import { ErrorNotice, EvidencePhoto, StatusBadge } from "../components/ui/Primitives";
import { DEFAULT_LAYERS, PlannerMap } from "../components/map/PlannerMap";

export function ClustersPage() {
  const [params] = useSearchParams();
  const [clusters, setClusters] = useState<SpatialCluster[]>([]);
  const [incidents, setIncidents] = useState<IncidentPublic[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(params.get("id"));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchClusters(), fetchReports()])
      .then(([cls, reports]) => {
        if (cancelled) return;
        setClusters(cls);
        setIncidents(reports);
        setSelectedId((current) => current ?? params.get("id") ?? cls[0]?.cluster_id ?? null);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't load clusters. Try again.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [params, reload]);

  const selected = clusters.find((c) => c.cluster_id === selectedId) ?? null;
  const members = useMemo(
    () =>
      selected
        ? incidents.filter((row) => row.cluster_id === selected.cluster_id)
        : [],
    [incidents, selected],
  );

  return (
    <div className="p-5 lg:p-7">
      <h1 className="text-2xl font-semibold tracking-tight">Verified clusters</h1>
      <p className="mt-1 text-sm text-civic-muted">
        Same-category reports within 15 metres, confirmed by at least three residents.
      </p>
      {error ? (
        <div className="mt-4">
          <ErrorNotice message={error} onRetry={() => setReload((n) => n + 1)} />
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-5">
        <div className="h-[360px] overflow-hidden rounded-card border border-civic-line xl:col-span-3">
          <PlannerMap
            incidents={incidents.filter((i) => i.is_verified)}
            clusters={clusters}
            meta={null}
            layers={{ ...DEFAULT_LAYERS, pending: false, wards: false, roads: false }}
            selectedId={selectedId}
            onSelectCluster={(cluster) => setSelectedId(cluster.cluster_id)}
          />
        </div>
        <aside className="rounded-card border border-civic-line bg-civic-surface p-4 xl:col-span-2">
          {selected ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-civic-muted">
                {selected.corridor}
              </p>
              <h2 className="mt-1 text-lg font-semibold">{selected.category_label}</h2>
              <div className="mt-2">
                <StatusBadge verified />
              </div>
              <p className="mt-3 text-sm text-civic-slate">
                {selected.report_count} reports · {selected.radius_meters}m radius
              </p>
              <p className="text-sm text-civic-muted">{selected.ward_name}</p>
              <p className="font-mono text-xs text-civic-muted">
                {formatCoords(selected.lat, selected.lng)}
              </p>
              <p className="mt-2 text-xs text-civic-muted">
                First {formatWhen(selected.first_reported)} · Latest{" "}
                {formatWhen(selected.latest_report)}
              </p>
              <p className="mt-1 text-xs text-civic-muted">{selected.verification_status}</p>
              <div className="mt-4 flex flex-col gap-2">
                <Link
                  to={`/reports?cluster=${selected.cluster_id}`}
                  className="rounded-card border border-civic-line py-2 text-center text-sm font-semibold"
                >
                  View reports
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    addEvidenceCluster(selected.cluster_id);
                    setMessage("Added to LPDP evidence.");
                  }}
                  className="rounded-card bg-civic-accent py-2 text-sm font-semibold text-white"
                >
                  Add to LPDP evidence
                </button>
                {message ? (
                  <p className="text-xs font-medium text-civic-accentDark">{message}</p>
                ) : null}
              </div>
              <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-civic-muted">
                Evidence reports
              </h3>
              <ul className="mt-2 space-y-2">
                {members.map((row) => (
                  <li key={row.id} className="flex gap-3 rounded-[10px] border border-civic-line px-3 py-2">
                    <EvidencePhoto
                      url={row.photo_url}
                      alt="Cluster evidence photograph"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{row.description}</p>
                      <p className="text-[11px] text-civic-muted">
                        {formatWhen(row.created_at)} · {row.corridor}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-civic-muted">Select a cluster from the list.</p>
          )}
        </aside>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {clusters.map((cluster) => (
          <button
            key={cluster.cluster_id}
            type="button"
            onClick={() => setSelectedId(cluster.cluster_id)}
            className={`rounded-card border p-4 text-left shadow-card ${
              selectedId === cluster.cluster_id
                ? "border-civic-ink bg-civic-mist"
                : "border-civic-line bg-civic-surface"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-civic-muted">
              {cluster.corridor}
            </p>
            <h2 className="mt-1 text-lg font-semibold">{cluster.category_label}</h2>
            <div className="mt-2">
              <StatusBadge verified />
            </div>
            <p className="mt-3 text-sm text-civic-slate">
              {cluster.report_count} reports · {cluster.radius_meters}m radius
            </p>
            <p className="text-sm text-civic-muted">{cluster.ward_name}</p>
          </button>
        ))}
      </div>
    </div>
  );
}