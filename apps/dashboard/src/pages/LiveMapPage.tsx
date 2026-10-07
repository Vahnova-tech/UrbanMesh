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
import { EvidencePhoto, StatusBadge } from "../components/ui/Primitives";
import {
  DEFAULT_LAYERS,
  PlannerMap,
  type MapLayers,
} from "../components/map/PlannerMap";

const HAZARD_FILTERS = [
  { value: "all", label: "All categories" },
  { value: "MOBILITY_SURFACE_DAMAGE", label: "Road damage" },
  { value: "NMT_PEDESTRIAN_HAZARD", label: "Blocked walkway" },
  { value: "DRAINAGE_STORMWATER", label: "Flooding / drainage" },
  { value: "SEWER_SANITATION", label: "Sewer / sanitation" },
  { value: "LIGHTING_SECURITY", label: "Broken lighting" },
  { value: "ILLEGAL_WASTE_DUMP", label: "Illegal dumping" },
];

export function LiveMapPage() {
  const [incidents, setIncidents] = useState<IncidentPublic[]>([]);
  const [clusters, setClusters] = useState<SpatialCluster[]>([]);
  const [meta, setMeta] = useState<PlatformMeta | null>(null);
  const [layers, setLayers] = useState<MapLayers>(DEFAULT_LAYERS);
  const [selected, setSelected] = useState<SpatialCluster | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [days, setDays] = useState("all");

  useEffect(() => {
    void Promise.all([fetchReports(), fetchClusters(), fetchMeta()]).then(
      ([reports, cls, platform]) => {
        setIncidents(reports);
        setClusters(cls);
        setMeta(platform);
      },
    );
  }, []);

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

  const members = selected
    ? visibleIncidents.filter((row) => row.cluster_id === selected.cluster_id)
    : [];

  function toggle(key: keyof MapLayers) {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="flex h-[calc(100dvh-48px)] min-h-[640px] lg:h-dvh">
      <div className="relative min-w-0 flex-1">
        <PlannerMap
          incidents={visibleIncidents}
          clusters={visibleClusters}
          meta={meta}
          layers={layers}
          selectedId={selected?.cluster_id}
          onSelectCluster={setSelected}
        />
        <div className="absolute left-3 top-3 w-56 rounded-card border border-civic-line bg-civic-surface/95 p-3 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-civic-muted">
            Layers
          </p>
          {(
            [
              ["verified", "Verified clusters"],
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
            Category
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

      <aside className="um-enter w-full max-w-sm overflow-y-auto border-l border-civic-line bg-civic-surface p-5">
        {selected ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-civic-verified">
              Verified cluster
            </p>
            <h2 className="mt-1 text-xl font-semibold">{selected.category_label}</h2>
            <div className="mt-3">
              <StatusBadge verified />
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Report count" value={String(selected.report_count)} />
              <Row label="Radius" value={`${selected.radius_meters}m`} />
              <Row label="First reported" value={formatWhen(selected.first_reported)} />
              <Row label="Latest report" value={formatWhen(selected.latest_report)} />
              <Row label="Planning area" value={selected.ward_name} />
              <Row label="Corridor" value={selected.corridor} />
              <Row label="Coordinates" value={formatCoords(selected.lat, selected.lng)} />
              <Row label="Verification" value={selected.verification_status} />
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
                          {formatWhen(row.created_at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="mt-5 flex flex-col gap-2">
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
        ) : (
          <div>
            <h2 className="text-lg font-semibold">Geospatial workspace</h2>
            <p className="mt-2 text-sm text-civic-slate">
              Click a verified cluster on the Kilimani map to inspect report count,
              15 m radius and planning area. Dashed pins are pending reports, not
              verified evidence.
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