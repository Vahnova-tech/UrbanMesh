import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import maplibregl, { type Map as MapLibreMap, type Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  fetchAdminReports,
  type AdminIncident,
  type ReviewStatus,
} from "../lib/api";
import { HAZARD_CATEGORIES } from "../lib/categories";
import { formatRelative } from "../lib/format";
import { ReviewBadge } from "../lib/status";

const STYLE = "https://tiles.openfreemap.org/styles/liberty";
const CENTER: [number, number] = [36.785, -1.2921];

const STATUS_COLOR: Record<ReviewStatus, string> = {
  pending: "#a67c2a",
  approved: "#2f6b5a",
  rejected: "#a63d2f",
  flagged: "#b45309",
  resolved: "#475569",
  archived: "#94a3b8",
};

type Filter = ReviewStatus | "all" | "queue";

export function MapPage({ onLogout }: { onLogout: () => void }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState("all");
  const [items, setItems] = useState<AdminIncident[]>([]);
  const [selected, setSelected] = useState<AdminIncident | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const wrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminReports({ review: filter, category });
      setItems(data.incidents);
      setSelected((prev) => {
        if (!prev) return null;
        return data.incidents.find((r) => r.id === prev.id) ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load map data.");
      if (err instanceof Error && /sign-in/i.test(err.message)) onLogout();
    } finally {
      setLoading(false);
    }
  }, [filter, category, onLogout]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || mapRef.current) return;

    const map = new maplibregl.Map({
      container: el,
      style: STYLE,
      center: CENTER,
      zoom: 14.2,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const row of items) {
      const pin = document.createElement("button");
      pin.type = "button";
      pin.title = row.category_label;
      pin.className =
        "h-3 w-3 rounded-full border-2 border-white shadow cursor-pointer";
      pin.style.background = STATUS_COLOR[row.review_status];
      pin.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelected(row);
        map.easeTo({ center: [row.lng, row.lat], zoom: Math.max(map.getZoom(), 15.5) });
      });
      const marker = new maplibregl.Marker({ element: pin })
        .setLngLat([row.lng, row.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }
  }, [items]);

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-6xl flex-col gap-3 px-4 py-4 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="um-eyebrow">Geography</p>
          <h2 className="text-xl font-semibold tracking-tight text-civic-ink">
            Report map
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
            className="min-h-9 rounded-card border border-civic-line bg-civic-surface px-2 text-xs outline-none focus:border-civic-accent"
          >
            <option value="all">All statuses</option>
            <option value="queue">Review queue</option>
            <option value="pending">Pending</option>
            <option value="flagged">Flagged</option>
            <option value="approved">Field-verified</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="min-h-9 rounded-card border border-civic-line bg-civic-surface px-2 text-xs outline-none focus:border-civic-accent"
          >
            <option value="all">All categories</option>
            {HAZARD_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="min-h-9 rounded-full border border-civic-line px-3 text-xs font-semibold hover:bg-civic-mist"
          >
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-card border border-civic-critical/20 bg-civic-criticalBg px-3 py-2 text-xs font-medium text-civic-critical">
          {error}
        </p>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1fr_320px]">
        <div
          ref={wrapRef}
          className="min-h-[22rem] overflow-hidden rounded-card border border-civic-line lg:min-h-0"
        />
        <aside className="overflow-y-auto rounded-card border border-civic-line bg-civic-surface p-3">
          <p className="text-xs text-civic-muted">
            {loading ? "Loading…" : `${items.length} reports on map`}
          </p>
          {selected ? (
            <div className="mt-3">
              <div className="flex items-start justify-between gap-2">
                <p className="um-eyebrow">{selected.category_label}</p>
                <ReviewBadge status={selected.review_status} />
              </div>
              <p className="mt-1 text-sm font-semibold text-civic-ink">
                {selected.description}
              </p>
              <p className="mt-1 text-xs text-civic-muted">
                {selected.corridor} · {formatRelative(selected.created_at)}
              </p>
              <Link
                to={`/reports/${selected.id}`}
                className="mt-3 inline-flex min-h-9 items-center rounded-card bg-civic-accent px-3 text-xs font-semibold text-white hover:bg-civic-accentDark"
              >
                Open report
              </Link>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="ml-2 inline-flex min-h-9 items-center rounded-card border border-civic-line px-3 text-xs font-semibold hover:bg-civic-mist"
              >
                Clear
              </button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-civic-muted">
              Click a marker to inspect a cluster point, then open the full record.
            </p>
          )}

          <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto lg:max-h-none">
            {items.slice(0, 40).map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(row);
                    mapRef.current?.easeTo({
                      center: [row.lng, row.lat],
                      zoom: 15.8,
                    });
                  }}
                  className={`w-full rounded-card border px-2.5 py-2 text-left text-xs ${
                    selected?.id === row.id
                      ? "border-civic-accent bg-civic-verifiedBg/40"
                      : "border-civic-line hover:bg-civic-mist/50"
                  }`}
                >
                  <span className="font-semibold text-civic-ink line-clamp-1">
                    {row.category_label}
                  </span>
                  <span className="mt-0.5 block text-civic-muted">
                    {row.corridor} · {formatRelative(row.created_at)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
