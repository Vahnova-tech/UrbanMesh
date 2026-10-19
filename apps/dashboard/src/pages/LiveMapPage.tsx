import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchClusters,
  fetchMeta,
  fetchReports,
  type IncidentPublic,
  type PlatformMeta,
  type SpatialCluster,
} from "../lib/api";
import { addEvidenceCluster } from "../lib/evidenceStore";
import { formatCoords, formatWhen } from "../lib/format";
import { ErrorNotice, EvidencePhoto, StatusBadge } from "../components/ui/Primitives";
import {
  DEFAULT_LAYERS,
  PlannerMap,
  type MapLayers,
} from "../components/map/PlannerMap";

const HAZARD_FILTERS = [
  { value: "all", label: "All hazards" },
  { value: "MOBILITY_SURFACE_DAMAGE", label: "Road surface damage" },
  { value: "NMT_PEDESTRIAN_HAZARD", label: "Pedestrian obstruction" },
  { value: "DRAINAGE_STORMWATER", label: "Drainage and stormwater" },
  { value: "SEWER_SANITATION", label: "Sewer and sanitation" },
  { value: "LIGHTING_SECURITY", label: "Lighting problems" },
  { value: "ILLEGAL_WASTE_DUMP", label: "Illegal waste dumping" },
];

export function LiveMapPage() {
  const [incidents, setIncidents] = useState<IncidentPublic[]>([]);
  const [clusters, setClusters] = useState<SpatialCluster[]>([]);
  const [meta, setMeta] = useState<PlatformMeta | null>(null);
  const [layers, setLayers] = useState<MapLayers>(DEFAULT_LAYERS);
  const [selectedCluster, setSelectedCluster] = useState<SpatialCluster | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<IncidentPublic | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [days, setDays] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchReports(), fetchClusters(), fetchMeta()])
      .then(([reports, cls, platform]) => {
        if (cancelled) return;
        setIncidents(reports);
        setClusters(cls);
        setMeta(platform);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't load the live map. Try again.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const cutoff =
    days === "all" ? 0 : Date.now() - Number(days) * 24 * 60 * 60 * 1000;

  const visibleIncidents = useMemo(
    () =>
      incidents.filter((item) => {
        if (category !== "all" && item.category !== category) return false;
        if (cutoff && new Date(item.created_at).getTime() < cutoff) return false;
        return true;
      }),
    [incidents, category, cutoff],
  );

  const visibleClusters = useMemo(
    () =>
      clusters.filter((cluster) => {
        if (category !== "all" && cluster.category !== category) return false;
        if (cutoff && new Date(cluster.latest_report).getTime() < cutoff) {
          return false;
        }
        return true;
      }),
    [clusters, category, cutoff],
  );

  const members = selectedCluster
    ? visibleIncidents.filter((row) => row.cluster_id === selectedCluster.cluster_id)
    : [];

  function toggle(key: keyof MapLayers) {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorNotice message={error} onRetry={() => setReload((n) => n + 1)} />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-48px)] min-h-[640px] lg:h-dvh">
      <div className="relative min-w-0 flex-1">
        <PlannerMap
          incidents={visibleIncidents}
          clusters={visibleClusters}
          meta={meta}
          layers={layers}
          selectedId={selectedCluster?.cluster_id}
          selectedIncidentId={selectedIncident?.id}
          onSelectCluster={(cluster) => {
            setSelectedCluster(cluster);
            setSelectedIncident(null);
          }}
          onSelectIncident={(incident) => {
            setSelectedIncident(incident);
            setSelectedCluster(null);
          }}
        />
        <div className="absolute left-3 top-3 w-60 rounded-card border border-civic-line bg-civic-surface/95 p-3.5 shadow-card">
          <p className="um-eyebrow">Map layers</p>
          {(
            [
              ["verified", "Community-supported clusters"],
              ["pending", "Pending reports"],
              ["wards", "Ward boundaries"],
              ["roads", "Roads"],
              ["drainage", "Drainage"],
              ["pedestrian", "Pedestrian corridors"],
              ["h3", "H3 cells"],
            ] as Array<[keyof MapLayers, string]>
          ).map(([key, label]) => (
            <label key={key} className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={layers[key]}
                onChange={() => toggle(key)}
              />
              {label}
            </label>
          ))}
          <label className="mt-3 block text-xs font-semibold text-civic-muted">
            Hazard type
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-[10px] border border-civic-line bg-civic-paper px-2 py-1.5 text-sm font-medium text-civic-ink"
            >
              {HAZARD_FILTERS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 block text-xs font-semibold text-civic-muted">
            Date
            <select
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="mt-1 w-full rounded-[10px] border border-civic-line bg-civic-paper px-2 py-1.5 text-sm font-medium text-civic-ink"
            >
              <option value="all">Any date</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </label>
        </div>
      </div>

      <aside className="um-enter w-full max-w-md overflow-y-auto border-l border-civic-line bg-civic-surface p-5 lg:p-6">
        {selectedCluster ? (
          <div>
            <p className="um-eyebrow text-civic-verified">
              Community-supported cluster
            </p>
            <h2 className="um-title mt-2 text-xl lg:text-xl">{selectedCluster.category_label}</h2>
            <div className="mt-3">
              <StatusBadge verified />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-civic-muted">
              Spatial corroboration from ≥3 same-category reports within 15 m.
              Not a field inspection.
            </p>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Report count" value={String(selectedCluster.report_count)} />
              <Row label="Radius" value={`${selectedCluster.radius_meters}m`} />
              <Row label="First reported" value={`${formatWhen(selectedCluster.first_reported)} EAT`} />
              <Row label="Latest report" value={`${formatWhen(selectedCluster.latest_report)} EAT`} />
              <Row label="Planning area" value={selectedCluster.ward_name} />
              <Row label="Corridor" value={selectedCluster.corridor} />
              <Row label="Coordinates" value={formatCoords(selectedCluster.lat, selectedCluster.lng)} />
              <Row label="Status" value={selectedCluster.verification_status} />
            </dl>
            {members.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-civic-muted">
                  Evidence reports
                </p>
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
                          {formatWhen(row.created_at)} EAT
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="mt-5 flex flex-col gap-2">
              <Link
                to={`/reports?cluster=${selectedCluster.cluster_id}`}
                className="rounded-card border border-civic-line py-2 text-center text-sm font-semibold"
              >
                View reports
              </Link>
              <button
                type="button"
                onClick={() => {
                  addEvidenceCluster(selectedCluster.cluster_id);
                  setMessage("Added to LPDP evidence. Open Evidence to generate the brief.");
                }}
                className="rounded-card bg-civic-accent py-2 text-sm font-semibold text-white"
              >
                Add to LPDP evidence
              </button>
              {message ? (
                <p className="text-xs font-medium text-civic-accentDark">{message}</p>
              ) : null}
            </div>
          </div>
        ) : selectedIncident ? (
          <div>
            <p className="um-eyebrow text-civic-pending">
              Pending report
            </p>
            <h2 className="um-title mt-2 text-xl lg:text-xl">{selectedIncident.category_label}</h2>
            <div className="mt-3">
              <StatusBadge verified={false} />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-civic-slate">
              {selectedIncident.description}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-civic-muted">
              Awaiting nearby same-category corroboration. Not a field inspection,
              and this dashboard has no moderation or resolution actions.
            </p>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Reported" value={`${formatWhen(selectedIncident.created_at)} EAT`} />
              <Row label="Corridor" value={selectedIncident.corridor} />
              <Row label="Planning area" value={selectedIncident.ward_name} />
              <Row label="Coordinates" value={formatCoords(selectedIncident.lat, selectedIncident.lng)} />
              <Row label="Nearby reports" value={String(selectedIncident.nearby_count)} />
            </dl>
            {selectedIncident.photo_url ? (
              <div className="mt-4">
                <EvidencePhoto
                  url={selectedIncident.photo_url}
                  alt="Pending report photograph"
                  className="h-32 w-full"
                />
              </div>
            ) : null}
            <Link
              to="/reports"
              className="mt-5 block rounded-card border border-civic-line py-2 text-center text-sm font-semibold"
            >
              Open reports table
            </Link>
          </div>
        ) : (
          <div>
            <h2 className="um-title text-lg lg:text-xl">Geospatial workspace</h2>
            <p className="um-body mt-3">
              Click a community-supported cluster to inspect report count, 15 m
              radius and planning area. Dashed pins are pending reports — they open
              the report row here. There is no moderation queue on this dashboard.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-civic-mist py-1.5">
      <dt className="text-civic-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}