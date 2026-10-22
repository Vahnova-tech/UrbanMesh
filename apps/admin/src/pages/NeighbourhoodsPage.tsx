import { useCallback, useEffect, useState } from "react";
import {
  fetchNeighbourhoods,
  refreshOsmLayers,
  uploadBoundary,
  type NeighbourhoodInfo,
} from "../lib/api";

export function NeighbourhoodsPage() {
  const [rows, setRows] = useState<NeighbourhoodInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNeighbourhoods();
      setRows(data.neighbourhoods);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't load neighbourhoods.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onBoundaryUpload(
    id: "kilimani" | "kileleshwa",
    file: File | null,
    status: "provisional_osm" | "authoritative",
  ) {
    if (!file) {
      setError("Choose a GeoJSON file first.");
      return;
    }
    setBusyId(`${id}-boundary`);
    setError(null);
    setOkMsg(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("status", status);
      const result = await uploadBoundary(id, form);
      setOkMsg(
        `Boundary updated for ${result.neighbourhood_id} (${result.status}).`,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Boundary upload failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function onRefreshLayers(id: "kilimani" | "kileleshwa") {
    setBusyId(`${id}-layers`);
    setError(null);
    setOkMsg(null);
    try {
      const result = await refreshOsmLayers(id);
      setOkMsg(
        `Refreshed OSM layers for ${id} (${result.refreshed.length} updated, ${result.skipped.length} skipped).`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Layer refresh failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-6 lg:px-6">
      <div className="mx-auto max-w-3xl">
        <p className="um-eyebrow">Data package</p>
        <h2 className="text-xl font-semibold text-civic-ink">Neighbourhoods</h2>
        <p className="mt-2 text-sm leading-relaxed text-civic-slate">
          Kilimani and Kileleshwa are separate products. Upload a Polygon or
          MultiPolygon GeoJSON boundary, then refresh OSM base layers when needed.
        </p>

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

        <ul className="mt-6 space-y-3">
          {rows.map((n) => (
            <NeighbourhoodCard
              key={n.id}
              n={n}
              busyId={busyId}
              onBoundaryUpload={onBoundaryUpload}
              onRefreshLayers={onRefreshLayers}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

function NeighbourhoodCard({
  n,
  busyId,
  onBoundaryUpload,
  onRefreshLayers,
}: {
  n: NeighbourhoodInfo;
  busyId: string | null;
  onBoundaryUpload: (
    id: "kilimani" | "kileleshwa",
    file: File | null,
    status: "provisional_osm" | "authoritative",
  ) => Promise<void>;
  onRefreshLayers: (id: "kilimani" | "kileleshwa") => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"provisional_osm" | "authoritative">(
    "provisional_osm",
  );

  return (
    <li className="rounded-card border border-civic-line bg-civic-surface px-4 py-4">
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

      <div className="mt-4 space-y-3 border-t border-civic-line pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.05em] text-civic-muted">
          Boundary GeoJSON
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block min-w-[12rem] flex-1 text-xs font-semibold text-civic-slate">
            File
            <input
              type="file"
              accept=".geojson,.json,application/geo+json,application/json"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1.5 block w-full text-sm font-normal"
            />
          </label>
          <label className="block text-xs font-semibold text-civic-slate">
            Status
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "provisional_osm" | "authoritative")
              }
              className="mt-1.5 min-h-10 rounded-card border border-civic-line bg-civic-paper px-2 text-sm font-normal"
            >
              <option value="provisional_osm">Provisional / OSM</option>
              <option value="authoritative">Authoritative</option>
            </select>
          </label>
          <button
            type="button"
            disabled={busyId === `${n.id}-boundary`}
            onClick={() =>
              void onBoundaryUpload(n.id, file, status)
            }
            className="min-h-10 rounded-card bg-civic-accent px-3 text-xs font-semibold text-white disabled:opacity-60"
          >
            {busyId === `${n.id}-boundary` ? "Uploading…" : "Upload boundary"}
          </button>
        </div>

        <button
          type="button"
          disabled={busyId === `${n.id}-layers`}
          onClick={() => void onRefreshLayers(n.id)}
          className="min-h-10 rounded-card border border-civic-line px-3 text-xs font-semibold text-civic-ink hover:bg-civic-mist disabled:opacity-60"
        >
          {busyId === `${n.id}-layers`
            ? "Refreshing…"
            : "Refresh OSM layers"}
        </button>
      </div>
    </li>
  );
}
