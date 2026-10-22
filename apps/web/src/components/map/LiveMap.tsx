import { useEffect, useMemo, useRef } from "react";
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { IncidentPublic } from "../../lib/api";
import { labelForCategory } from "../../lib/categories";
import { splitMapFeatures } from "../../lib/clusterMap";
import { useTheme } from "../../lib/theme";
import { prefersReducedMotion } from "../../lib/motion";
import {
  applyUrbanMeshBasemap,
  HEAT_DARK,
  HEAT_LIGHT,
  MAP_CAMERA,
  MARKER,
  styleUrlFor,
} from "../../lib/mapStyle";
import { useNeighbourhood } from "../../lib/neighbourhood";

/** @deprecated Prefer useNeighbourhood().neighbourhood.center */
export const KILIMANI_CENTER: [number, number] = [-1.2921, 36.785];

export type MapFocus = {
  lat: number;
  lng: number;
  zoom?: number;
  label?: string;
};

type MarkerProps = {
  id: string;
  kind: "cluster" | "verified" | "pending" | "user" | "search";
  color: string;
  radius: number;
  selected: number;
  label?: string;
  corridor?: string;
  meta?: string;
  href?: string;
  verified?: boolean;
};

function markerFill(incident: IncidentPublic): string {
  if (!incident.is_verified) return MARKER.pending;
  if (incident.severity === "critical") return MARKER.critical;
  return MARKER.verified;
}

function selectedPinHtml(fill: string, ring: string, dark: boolean): string {
  const glow = dark ? "0 0 0 3px rgba(255,255,255,.22), 0 0 14px rgba(0,0,0,.55)" : "0 2px 8px rgba(0,0,0,.32)";
  return `<span class="um-selected-pin__mark" style="--um-pin:${fill};--um-ring:${ring};filter:drop-shadow(${glow})" aria-hidden="true">
    <svg class="um-selected-pin__svg" viewBox="0 0 40 52" width="40" height="52" focusable="false">
      <path d="M20 50c6-8 16-18 16-30A16 16 0 0 0 4 20c0 12 10 22 16 30z" fill="rgba(0,0,0,.28)"/>
      <path d="M20 2c-9.4 0-17 7.6-17 17 0 12.4 14.2 28.2 16.2 30.4a1.1 1.1 0 0 0 1.6 0C22.8 47.2 37 31.4 37 19 37 9.6 29.4 2 20 2z" fill="${fill}" stroke="${ring}" stroke-width="3"/>
      <circle cx="20" cy="19" r="6.5" fill="${ring}"/>
      <circle cx="20" cy="19" r="3.25" fill="${fill}"/>
    </svg>
  </span>`;
}

function popupHtml(props: MarkerProps): string {
  if (props.kind === "search") {
    return `<div class="um-map-popup"><p class="um-map-popup__title">${escapeHtml(props.label ?? "Place")}</p><p class="um-map-popup__meta">Search result</p></div>`;
  }
  const status = props.verified
    ? `<span class="um-map-popup__badge um-map-popup__badge--ok">Community-supported</span>`
    : `<span class="um-map-popup__badge">Pending</span>`;
  const link = props.href
    ? `<a class="um-map-popup__link" href="${escapeHtml(props.href)}">View evidence</a>`
    : "";
  return `<div class="um-map-popup">
    <p class="um-map-popup__title">${escapeHtml(props.label ?? "Report")}</p>
    ${status}
    <p class="um-map-popup__meta">${escapeHtml(props.corridor ?? "")}</p>
    <p class="um-map-popup__meta">${escapeHtml(props.meta ?? "")}</p>
    ${link}
  </div>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ensureIncidentLayers(map: MapLibreMap, dark: boolean) {
  if (!map.getSource("um-heat")) {
    map.addSource("um-heat", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    map.addLayer({
      id: "um-heat-layer",
      type: "heatmap",
      source: "um-heat",
      maxzoom: 18,
      paint: {
        "heatmap-weight": ["get", "weight"],
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 12, 0.55, 16, 1.1],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 12, 14, 16, 28],
        "heatmap-opacity": dark ? 0.55 : 0.42,
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0,
          "rgba(0,0,0,0)",
          0.2,
          dark ? HEAT_DARK[0.2] : HEAT_LIGHT[0.2],
          0.45,
          dark ? HEAT_DARK[0.45] : HEAT_LIGHT[0.45],
          0.7,
          dark ? HEAT_DARK[0.7] : HEAT_LIGHT[0.7],
          1,
          dark ? HEAT_DARK[1] : HEAT_LIGHT[1],
        ],
      },
    });
  }

  if (!map.getSource("um-markers")) {
    map.addSource("um-markers", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    map.addLayer({
      id: "um-marker-halo",
      type: "circle",
      source: "um-markers",
      filter: [
        "in",
        ["get", "kind"],
        ["literal", ["cluster", "verified"]],
      ],
      paint: {
        "circle-radius": [
          "case",
          [">", ["get", "selected"], 0],
          dark ? 22 : 18,
          dark ? 18 : 15,
        ],
        "circle-color": ["get", "color"],
        "circle-opacity": dark ? 0.34 : 0.16,
        "circle-blur": dark ? 0.55 : 0.35,
        "circle-pitch-alignment": "viewport",
      },
    });

    map.addLayer({
      id: "um-marker-selected-ring",
      type: "circle",
      source: "um-markers",
      filter: [">", ["get", "selected"], 0],
      paint: {
        "circle-radius": ["+", ["get", "radius"], dark ? 7 : 5],
        "circle-color": "transparent",
        "circle-stroke-width": dark ? 2.5 : 2,
        "circle-stroke-color": dark ? "#F5F0E8" : "#FFFFFF",
        "circle-stroke-opacity": dark ? 0.92 : 0.85,
        "circle-pitch-alignment": "viewport",
      },
    });

    map.addLayer({
      id: "um-marker-circle",
      type: "circle",
      source: "um-markers",
      filter: ["in", ["get", "kind"], ["literal", ["cluster", "verified", "pending", "user", "search"]]],
      paint: {
        "circle-radius": ["get", "radius"],
        "circle-color": ["get", "color"],
        "circle-stroke-width": [
          "case",
          [">", ["get", "selected"], 0],
          dark ? 3.5 : 3,
          ["==", ["get", "kind"], "pending"],
          1.75,
          dark ? 2.75 : 2,
        ],
        "circle-stroke-color": dark ? "#F7F2EA" : "#FFFFFF",
        "circle-opacity": ["case", ["==", ["get", "kind"], "pending"], 0.9, 1],
        "circle-pitch-alignment": "viewport",
      },
    });
  } else {
    try {
      if (!map.getLayer("um-marker-selected-ring") && map.getLayer("um-marker-circle")) {
        map.addLayer(
          {
            id: "um-marker-selected-ring",
            type: "circle",
            source: "um-markers",
            filter: [">", ["get", "selected"], 0],
            paint: {
              "circle-radius": ["+", ["get", "radius"], dark ? 7 : 5],
              "circle-color": "transparent",
              "circle-stroke-width": dark ? 2.5 : 2,
              "circle-stroke-color": dark ? "#F5F0E8" : "#FFFFFF",
              "circle-stroke-opacity": dark ? 0.92 : 0.85,
              "circle-pitch-alignment": "viewport",
            },
          },
          "um-marker-circle",
        );
      }
      map.setPaintProperty("um-heat-layer", "heatmap-opacity", dark ? 0.55 : 0.42);
      map.setPaintProperty("um-marker-circle", "circle-stroke-color", dark ? "#F7F2EA" : "#FFFFFF");
      map.setPaintProperty("um-marker-circle", "circle-stroke-width", [
        "case",
        [">", ["get", "selected"], 0],
        dark ? 3.5 : 3,
        ["==", ["get", "kind"], "pending"],
        1.75,
        dark ? 2.75 : 2,
      ]);
      map.setPaintProperty("um-marker-halo", "circle-opacity", dark ? 0.34 : 0.16);
      map.setPaintProperty("um-marker-halo", "circle-radius", [
        "case",
        [">", ["get", "selected"], 0],
        dark ? 22 : 18,
        dark ? 18 : 15,
      ]);
      if (map.getLayer("um-marker-halo")) {
        map.setFilter("um-marker-halo", [
          "in",
          ["get", "kind"],
          ["literal", ["cluster", "verified"]],
        ]);
      }
      if (map.getLayer("um-marker-selected-ring")) {
        map.setPaintProperty(
          "um-marker-selected-ring",
          "circle-stroke-color",
          dark ? "#F5F0E8" : "#FFFFFF",
        );
      }
    } catch {
      /* layers may be mid-swap */
    }
  }
}

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
  const { neighbourhood } = useNeighbourhood();
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onSelectRef = useRef(onSelect);
  const byIdRef = useRef(new Map<string, IncidentPublic>());
  const fittedRef = useRef(false);
  const lastFlyRef = useRef<string | null>(null);
  const lastNeighbourhoodRef = useRef(neighbourhood.id);
  const selectedMarkerRef = useRef<maplibregl.Marker | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  const features = useMemo(() => splitMapFeatures(incidents), [incidents]);
  const byId = useMemo(
    () => new Map(incidents.map((row) => [row.id, row])),
    [incidents],
  );
  const selected = selectedId ? byId.get(selectedId) ?? null : null;
  const [centerLat, centerLng] = neighbourhood.center;

  onSelectRef.current = onSelect;
  byIdRef.current = byId;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || mapRef.current) return;

    const map = new maplibregl.Map({
      container: el,
      style: styleUrlFor(dark),
      center: [centerLng, centerLat],
      zoom: 15.2,
      pitch: MAP_CAMERA.pitch,
      bearing: MAP_CAMERA.bearing,
      maxPitch: MAP_CAMERA.maxPitch,
      attributionControl: { compact: true },
      canvasContextAttributes: { antialias: true },
    });
    mapRef.current = map;

    const onReady = () => {
      applyUrbanMeshBasemap(map, dark);
      ensureIncidentLayers(map, dark);
    };
    map.on("load", onReady);
    map.on("style.load", () => {
      applyUrbanMeshBasemap(map, dark);
      ensureIncidentLayers(map, dark);
    });

    map.on("click", "um-marker-circle", (ev) => {
      const feature = ev.features?.[0];
      if (!feature || feature.geometry.type !== "Point") return;
      const props = feature.properties as MarkerProps | undefined;
      if (!props?.id || props.kind === "user" || props.kind === "search") return;
      const row = byIdRef.current.get(props.id);
      if (row) onSelectRef.current?.(row);

      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup({
        closeButton: true,
        offset: 14,
        className: "um-maplibre-popup",
        maxWidth: "220px",
      })
        .setLngLat(feature.geometry.coordinates as [number, number])
        .setHTML(popupHtml(props))
        .addTo(map);
    });

    map.on("mouseenter", "um-marker-circle", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "um-marker-circle", () => {
      map.getCanvas().style.cursor = "";
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(el);

    return () => {
      ro.disconnect();
      popupRef.current?.remove();
      selectedMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
    // Mount once; theme/data handled in later effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onStyle = () => {
      applyUrbanMeshBasemap(map, dark);
      ensureIncidentLayers(map, dark);
    };
    map.setStyle(styleUrlFor(dark), { diff: false });
    map.once("style.load", onStyle);
  }, [dark]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (lastNeighbourhoodRef.current === neighbourhood.id) return;
    lastNeighbourhoodRef.current = neighbourhood.id;
    fittedRef.current = false;
    const reduced = prefersReducedMotion();
    map.easeTo({
      center: [centerLng, centerLat],
      zoom: 15.2,
      duration: reduced ? 0 : 700,
    });
  }, [neighbourhood.id, centerLat, centerLng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markerFeatures: GeoJSON.Feature[] = [];

    if (showVerified) {
      for (const cluster of features.clusters) {
        const id = cluster.representativeId;
        markerFeatures.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [cluster.lng, cluster.lat] },
          properties: {
            id,
            kind: "cluster",
            color: cluster.severity === "critical" ? MARKER.critical : MARKER.verified,
            radius: selectedId === id ? 11 : 9,
            selected: selectedId === id ? 1 : 0,
            label: cluster.category_label,
            corridor: cluster.corridor,
            meta: `${cluster.report_count} same-category reports · 15 m cluster`,
            href: `/reports/${id}`,
            verified: true,
          } satisfies MarkerProps,
        });
      }
      for (const inc of features.ungroupedVerified) {
        markerFeatures.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [inc.lng, inc.lat] },
          properties: {
            id: inc.id,
            kind: "verified",
            color: markerFill(inc),
            radius: selectedId === inc.id ? 9 : 7,
            selected: selectedId === inc.id ? 1 : 0,
            label: labelForCategory(inc.category),
            corridor: inc.corridor,
            meta: `${inc.nearby_count} nearby report${inc.nearby_count === 1 ? "" : "s"} · 15 m`,
            href: `/reports/${inc.id}`,
            verified: true,
          } satisfies MarkerProps,
        });
      }
    }

    if (showPending) {
      for (const inc of features.pending) {
        markerFeatures.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [inc.lng, inc.lat] },
          properties: {
            id: inc.id,
            kind: "pending",
            color: MARKER.pending,
            radius: selectedId === inc.id ? 7 : 5,
            selected: selectedId === inc.id ? 1 : 0,
            label: labelForCategory(inc.category),
            corridor: inc.corridor,
            meta: `${inc.nearby_count} nearby report${inc.nearby_count === 1 ? "" : "s"} · 15 m`,
            href: `/reports/${inc.id}`,
            verified: false,
          } satisfies MarkerProps,
        });
      }
    }

    if (user) {
      markerFeatures.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [user.lng, user.lat] },
        properties: {
          id: "user",
          kind: "user",
          color: MARKER.you,
          radius: 6,
          selected: 0,
          label: "You",
        } satisfies MarkerProps,
      });
    }

    if (focus?.label) {
      markerFeatures.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [focus.lng, focus.lat] },
        properties: {
          id: "search",
          kind: "search",
          color: MARKER.you,
          radius: 8,
          selected: 0,
          label: focus.label,
        } satisfies MarkerProps,
      });
    }

    const heatFeatures: GeoJSON.Feature[] = showVerified
      ? incidents
          .filter((p) => p.is_verified)
          .map((p) => ({
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
            properties: { weight: p.severity === "critical" ? 0.85 : 0.55 },
          }))
      : [];

    const apply = () => {
      const markers = map.getSource("um-markers") as GeoJSONSource | undefined;
      const heat = map.getSource("um-heat") as GeoJSONSource | undefined;
      markers?.setData({ type: "FeatureCollection", features: markerFeatures });
      heat?.setData({ type: "FeatureCollection", features: heatFeatures });
      map.setLayoutProperty(
        "um-heat-layer",
        "visibility",
        showVerified && heatFeatures.length ? "visible" : "none",
      );
    };

    if (map.isStyleLoaded() && map.getSource("um-markers")) apply();
    else map.once("style.load", () => {
      ensureIncidentLayers(map, dark);
      apply();
    });
  }, [
    incidents,
    features,
    user,
    focus,
    showVerified,
    showPending,
    selectedId,
    dark,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || fittedRef.current || incidents.length === 0) return;
    fittedRef.current = true;
    const bounds = new maplibregl.LngLatBounds();
    for (const row of incidents) bounds.extend([row.lng, row.lat]);
    map.fitBounds(bounds, {
      padding: 72,
      maxZoom: 16,
      duration: 0,
      pitch: MAP_CAMERA.pitch,
      bearing: MAP_CAMERA.bearing,
    });
  }, [incidents]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const target = focus ?? (locateNonce ? user : null);
    if (!target) return;
    if (!focus && locateNonce === 0) return;
    const key = focus
      ? `focus:${focus.lat},${focus.lng},${locateNonce}`
      : `locate:${locateNonce}`;
    if (lastFlyRef.current === key) return;
    lastFlyRef.current = key;
    map.flyTo({
      center: [target.lng, target.lat],
      zoom: focus?.zoom ?? 17,
      pitch: MAP_CAMERA.pitch,
      bearing: MAP_CAMERA.bearing,
      duration: prefersReducedMotion() ? 0 : 700,
    });
  }, [focus, locateNonce, user]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    selectedMarkerRef.current?.remove();
    selectedMarkerRef.current = null;

    if (!selected || focus) return;

    const fill = markerFill(selected);
    const ring = dark ? "#F7F2EA" : "#FFFFFF";
    const el = document.createElement("div");
    el.className = "um-selected-pin";
    el.innerHTML = selectedPinHtml(fill, ring, dark);

    selectedMarkerRef.current = new maplibregl.Marker({
      element: el,
      anchor: "bottom",
      offset: [0, 4],
      pitchAlignment: "viewport",
      rotationAlignment: "viewport",
    })
      .setLngLat([selected.lng, selected.lat])
      .addTo(map);

    const key = `select:${selected.id}`;
    if (lastFlyRef.current !== key) {
      lastFlyRef.current = key;
      map.flyTo({
        center: [selected.lng, selected.lat],
        zoom: 17,
        pitch: MAP_CAMERA.pitch,
        bearing: MAP_CAMERA.bearing,
        duration: prefersReducedMotion() ? 0 : 550,
      });
    }
  }, [selected, dark, focus]);

  return (
    <div className={`absolute inset-0 ${className}`}>
      <div ref={wrapRef} className="um-vector-map h-full w-full" />
      <div className="pointer-events-none absolute bottom-6 left-6 z-[1100] hidden max-w-[220px] lg:block">
        <MapKey />
      </div>
      <div className="absolute right-3 top-[42%] z-[1100] flex flex-col overflow-hidden rounded-full border border-civic-line bg-civic-surface/90 shadow-card backdrop-blur-md lg:bottom-28 lg:right-6 lg:top-auto">
        <button
          type="button"
          aria-label="Zoom in"
          title="Zoom in"
          className="h-9 w-9 text-lg font-semibold text-civic-ink"
          onClick={() => mapRef.current?.zoomIn({ duration: 250 })}
        >
          +
        </button>
        <span className="h-px bg-civic-line" />
        <button
          type="button"
          aria-label="Zoom out"
          title="Zoom out"
          className="h-9 w-9 text-lg font-semibold text-civic-ink"
          onClick={() => mapRef.current?.zoomOut({ duration: 250 })}
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
        <LegendItem color="#3DDCFF" label="3D streets" hint="Neon routes · extruded blocks" />
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
