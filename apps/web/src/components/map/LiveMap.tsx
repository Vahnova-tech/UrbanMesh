import { useEffect, useMemo, useRef } from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import type { IncidentPublic } from "../../lib/api";
import { labelForCategory } from "../../lib/categories";
import { splitMapFeatures } from "../../lib/clusterMap";
import { StatusBadge } from "../ui/StatusBadge";
import { Link } from "react-router-dom";
import { useTheme } from "../../lib/theme";
import { prefersReducedMotion } from "../../lib/motion";
import { HEAT_DARK, HEAT_LIGHT, MARKER, tilesFor } from "../../lib/mapStyle";

export const KILIMANI_CENTER: [number, number] = [-1.2921, 36.785];

function HeatLayer({
  points,
  dark,
}: {
  points: IncidentPublic[];
  dark: boolean;
}) {
  const map = useMap();
  const heatData = useMemo(
    () =>
      points
        .filter((p) => p.is_verified)
        .map((p) => [p.lat, p.lng, p.severity === "critical" ? 0.85 : 0.55] as [number, number, number]),
    [points],
  );

  useEffect(() => {
    if (heatData.length === 0) return;
    const layer = L.heatLayer(heatData, {
      radius: 22,
      blur: 18,
      maxZoom: 17,
      max: 1,
      minOpacity: dark ? 0.28 : 0.18,
      gradient: dark ? HEAT_DARK : HEAT_LIGHT,
    });
    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, heatData, dark]);

  return null;
}

function FitOnce({ points }: { points: IncidentPublic[] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || points.length === 0) return;
    fitted.current = true;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds.pad(0.16), { maxZoom: 16, animate: false });
  }, [map, points]);
  return null;
}

function FlyToTarget({
  target,
  nonce,
}: {
  target: { lat: number; lng: number; zoom?: number } | null;
  nonce: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (!target || nonce === 0) return;
    const duration = prefersReducedMotion() ? 0 : 0.7;
    map.flyTo([target.lat, target.lng], target.zoom ?? 17, { duration });
  }, [map, target?.lat, target?.lng, target?.zoom, nonce]);
  return null;
}

function SearchPin({
  target,
}: {
  target: { lat: number; lng: number; label?: string };
}) {
  return (
    <CircleMarker
      center={[target.lat, target.lng]}
      radius={9}
      pathOptions={{
        color: "#FFFFFF",
        weight: 2,
        fillColor: MARKER.you,
        fillOpacity: 1,
      }}
    >
      {target.label ? (
        <Popup>
          <p className="text-sm font-semibold">{target.label}</p>
          <p className="text-[11px] text-civic-muted">Search result</p>
        </Popup>
      ) : null}
    </CircleMarker>
  );
}

function markerFill(incident: IncidentPublic): string {
  if (!incident.is_verified) return MARKER.pending;
  if (incident.severity === "critical") return MARKER.critical;
  return MARKER.verified;
}

function selectedPinIcon(fill: string, ring: string): L.DivIcon {
  return L.divIcon({
    className: "um-selected-pin",
    iconSize: [40, 52],
    iconAnchor: [20, 50],
    html: `<span class="um-selected-pin__mark" style="--um-pin:${fill};--um-ring:${ring}" aria-hidden="true">
      <svg class="um-selected-pin__svg" viewBox="0 0 40 52" width="40" height="52" focusable="false">
        <path class="um-selected-pin__shadow" d="M20 50c6-8 16-18 16-30A16 16 0 0 0 4 20c0 12 10 22 16 30z" fill="rgba(0,0,0,.18)"/>
        <path d="M20 2c-9.4 0-17 7.6-17 17 0 12.4 14.2 28.2 16.2 30.4a1.1 1.1 0 0 0 1.6 0C22.8 47.2 37 31.4 37 19 37 9.6 29.4 2 20 2z" fill="${fill}" stroke="${ring}" stroke-width="2.5"/>
        <circle cx="20" cy="19" r="6.5" fill="${ring}"/>
        <circle cx="20" cy="19" r="3.25" fill="${fill}"/>
      </svg>
    </span>`,
  });
}

function SelectedReportMarker({
  incident,
  dark,
}: {
  incident: IncidentPublic;
  dark: boolean;
}) {
  const fill = markerFill(incident);
  const ring = dark ? "#EEE9E1" : "#FFFFFF";
  const icon = useMemo(() => selectedPinIcon(fill, ring), [fill, ring]);

  return (
    <>
      <Circle
        center={[incident.lat, incident.lng]}
        radius={42}
        pathOptions={{
          color: fill,
          weight: 2,
          dashArray: "5 4",
          fillColor: fill,
          fillOpacity: dark ? 0.14 : 0.1,
        }}
      />
      <Marker
        position={[incident.lat, incident.lng]}
        icon={icon}
        zIndexOffset={800}
        interactive={false}
      />
    </>
  );
}

function FlyToSelected({ incident }: { incident: IncidentPublic | null }) {
  const map = useMap();
  const lastId = useRef<string | null>(null);
  useEffect(() => {
    if (!incident) {
      lastId.current = null;
      return;
    }
    if (lastId.current === incident.id) return;
    lastId.current = incident.id;
    const duration = prefersReducedMotion() ? 0 : 0.55;
    map.flyTo([incident.lat, incident.lng], 17, { duration });
  }, [map, incident]);
  return null;
}

export type MapFocus = {
  lat: number;
  lng: number;
  zoom?: number;
  label?: string;
};

export function LiveMap({
  incidents,
  user,
  locateNonce = 0,
  focus = null,
  className = "",
  showVerified = true,
  showPending = true,
  selectedId = null,
  onSelect,
}: {
  incidents: IncidentPublic[];
  user: { lat: number; lng: number } | null;
  locateNonce?: number;
  focus?: MapFocus | null;
  className?: string;
  showVerified?: boolean;
  showPending?: boolean;
  selectedId?: string | null;
  onSelect?: (incident: IncidentPublic) => void;
}) {
  const { dark } = useTheme();
  const tiles = tilesFor(dark);
  const mapRef = useRef<L.Map | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const features = useMemo(() => splitMapFeatures(incidents), [incidents]);
  const flyTarget = focus ?? (locateNonce ? user : null);
  const flyNonce = (focus ? 1000 : 0) + locateNonce;
  const byId = useMemo(
    () => new Map(incidents.map((row) => [row.id, row])),
    [incidents],
  );
  const selected = selectedId ? byId.get(selectedId) ?? null : null;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      mapRef.current?.invalidateSize({ animate: false });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className={`absolute inset-0 ${className}`}>
      <MapContainer
        center={KILIMANI_CENTER}
        zoom={15}
        scrollWheelZoom
        className="h-full w-full"
        attributionControl
        zoomControl={false}
        ref={(map) => {
          mapRef.current = map ?? null;
        }}
      >
        <TileLayer
          key={dark ? "dark" : "light"}
          attribution={tiles.attribution}
          url={tiles.url}
          maxZoom={19}
        />
        {showVerified ? <HeatLayer points={incidents} dark={dark} /> : null}
        <FitOnce points={incidents} />
        <FlyToTarget target={flyTarget} nonce={flyNonce} />
        <FlyToSelected incident={focus ? null : selected} />
        {focus?.label ? <SearchPin target={focus} /> : null}

        {showVerified
          ? features.clusters.map((cluster) => (
              <Circle
                key={`${cluster.clusterId}-ring`}
                center={[cluster.lat, cluster.lng]}
                radius={15}
                pathOptions={{
                  color: MARKER.verified,
                  weight: 1,
                  fillColor: MARKER.verified,
                  fillOpacity: dark ? 0.1 : 0.08,
                }}
              />
            ))
          : null}

        {showVerified
          ? features.clusters.map((cluster) => (
              <CircleMarker
                key={cluster.clusterId}
                center={[cluster.lat, cluster.lng]}
                radius={10}
                pathOptions={{
                  color: dark ? "#EEE9E1" : "#FFFFFF",
                  weight: selectedId === cluster.representativeId ? 3 : 2,
                  fillColor:
                    cluster.severity === "critical" ? MARKER.critical : MARKER.verified,
                  fillOpacity: 0.95,
                }}
                eventHandlers={{
                  click: () => {
                    const row = byId.get(cluster.representativeId);
                    if (row) onSelect?.(row);
                  },
                }}
              >
                <Popup>
                  <div className="min-w-[176px] space-y-1.5">
                    <p className="text-sm font-semibold">{cluster.category_label}</p>
                    <StatusBadge verified size="sm" />
                    <p className="text-xs text-civic-slate">{cluster.corridor}</p>
                    <p className="text-[11px] text-civic-muted">
                      {cluster.report_count} same-category reports · 15 m cluster
                    </p>
                    <Link
                      to={`/hazards/${cluster.representativeId}`}
                      className="text-xs font-semibold text-civic-accent"
                    >
                      View evidence
                    </Link>
                  </div>
                </Popup>
              </CircleMarker>
            ))
          : null}

        {showVerified
          ? features.ungroupedVerified.map((inc) => (
              <CircleMarker
                key={inc.id}
                center={[inc.lat, inc.lng]}
                radius={8}
                pathOptions={{
                  color: dark ? "#EEE9E1" : "#FFFFFF",
                  weight: selectedId === inc.id ? 3 : 2,
                  fillColor: markerFill(inc),
                  fillOpacity: 0.95,
                }}
                eventHandlers={{
                  click: () => onSelect?.(inc),
                }}
              >
                <Popup>
                  <IncidentPopup incident={inc} />
                </Popup>
              </CircleMarker>
            ))
          : null}

        {showPending
          ? features.pending.map((inc) => (
              <CircleMarker
                key={inc.id}
                center={[inc.lat, inc.lng]}
                radius={5}
                pathOptions={{
                  color: dark ? "#EEE9E1" : "#FFFFFF",
                  weight: selectedId === inc.id ? 3 : 1.5,
                  fillColor: MARKER.pending,
                  fillOpacity: 0.8,
                  dashArray: "3 3",
                }}
                eventHandlers={{
                  click: () => onSelect?.(inc),
                }}
              >
                <Popup>
                  <IncidentPopup incident={inc} />
                </Popup>
              </CircleMarker>
            ))
          : null}

        {user ? (
          <>
            <Circle
              center={[user.lat, user.lng]}
              radius={28}
              pathOptions={{
                color: MARKER.you,
                weight: 1,
                fillColor: MARKER.you,
                fillOpacity: dark ? 0.08 : 0.12,
              }}
            />
            <CircleMarker
              center={[user.lat, user.lng]}
              radius={6}
              pathOptions={{
                color: "#FFFFFF",
                weight: 2,
                fillColor: MARKER.you,
                fillOpacity: 1,
              }}
            />
          </>
        ) : null}

        {selected ? <SelectedReportMarker incident={selected} dark={dark} /> : null}
      </MapContainer>
      <div className="pointer-events-none absolute bottom-6 left-6 z-[1100] hidden max-w-[220px] lg:block">
        <MapKey />
      </div>
      <div className="absolute right-3 top-[42%] z-[1100] flex flex-col overflow-hidden rounded-card border border-civic-line bg-civic-surface shadow-card lg:bottom-28 lg:right-6 lg:top-auto">
        <button
          type="button"
          aria-label="Zoom in"
          title="Zoom in"
          className="h-9 w-9 text-lg font-semibold text-civic-ink"
          onClick={() => mapRef.current?.zoomIn()}
        >
          +
        </button>
        <span className="h-px bg-civic-line" />
        <button
          type="button"
          aria-label="Zoom out"
          title="Zoom out"
          className="h-9 w-9 text-lg font-semibold text-civic-ink"
          onClick={() => mapRef.current?.zoomOut()}
        >
          −
        </button>
      </div>
    </div>
  );
}

export function MapKey({ bare = false }: { bare?: boolean }) {
  const body = (
    <>
      <p className="um-eyebrow text-[10px]">Map key</p>
      <ul className="mt-1.5 space-y-1">
        <LegendItem color={MARKER.verified} label="Community-supported" hint="Solid pin · 15 m" />
        <LegendItem color={MARKER.pending} dashed label="Pending report" hint="Dashed pin" />
        <LegendItem color={MARKER.you} label="Your location" hint="After Locate" />
        <LegendItem color={MARKER.verified} crosshair label="Selected report" hint="Location pin" />
      </ul>
    </>
  );
  if (bare) return <div>{body}</div>;
  return (
    <div className="rounded-card border border-civic-line bg-civic-surface px-2.5 py-2 shadow-card">
      {body}
    </div>
  );
}

function LegendItem({
  color,
  label,
  hint,
  dashed = false,
  crosshair = false,
}: {
  color: string;
  label: string;
  hint: string;
  dashed?: boolean;
  crosshair?: boolean;
}) {
  return (
    <li className="flex items-center gap-2">
      <span className="relative h-2.5 w-2.5 shrink-0">
        <span
          className="absolute inset-0 rounded-full border border-white"
          style={{
            background: color,
            outline: dashed ? `1px dashed ${color}` : undefined,
            outlineOffset: dashed ? "1px" : undefined,
          }}
        />
        {crosshair ? (
          <span
            className="absolute inset-[-3px] rounded-full border border-dashed"
            style={{ borderColor: color }}
          />
        ) : null}
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold leading-tight text-civic-ink">
          {label}
        </span>
        <span className="block text-[10px] leading-tight text-civic-muted">{hint}</span>
      </span>
    </li>
  );
}

function IncidentPopup({ incident }: { incident: IncidentPublic }) {
  return (
    <div className="min-w-[168px] space-y-1.5">
      <p className="text-sm font-semibold">{labelForCategory(incident.category)}</p>
      <StatusBadge verified={incident.is_verified} size="sm" />
      <p className="text-xs text-civic-slate">{incident.corridor}</p>
      <p className="text-[11px] text-civic-muted">
        {incident.nearby_count} nearby report{incident.nearby_count === 1 ? "" : "s"} · 15 m
      </p>
      <Link
        to={`/hazards/${incident.id}`}
        className="text-xs font-semibold text-civic-accent"
      >
        View evidence
      </Link>
    </div>
  );
}