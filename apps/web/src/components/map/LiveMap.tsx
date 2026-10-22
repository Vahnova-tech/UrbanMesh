import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  fetchLayerGeoJson,
  fetchLayers,
  type CatalogueLayerMeta,
  type IncidentPublic,
} from "../../lib/api";
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

const LAYER_COLORS = [
  "#0D7377",
  "#C45C26",
  "#2F6FED",
  "#7B5EA7",
  "#B45309",
  "#0F766E",
  "#BE123C",
  "#365314",
];

function colorForLayer(index: number): string {
  return LAYER_COLORS[index % LAYER_COLORS.length] ?? "#0D7377";
}

function sourceId(layerKey: string): string {
  return `um-cat-${layerKey}`;
}

function ensureCatalogueLayer(
  map: MapLibreMap,
  layerKey: string,
  color: string,
  collection: GeoJSON.FeatureCollection,
) {
  const sid = sourceId(layerKey);
  const existing = map.getSource(sid) as GeoJSONSource | undefined;
  if (existing) {
    existing.setData(collection);
  } else {
    map.addSource(sid, { type: "geojson", data: collection });
  }

  const fillId = `${sid}-fill`;
  const lineId = `${sid}-line`;
  const circleId = `${sid}-circle`;

  if (!map.getLayer(fillId)) {
    map.addLayer({
      id: fillId,
      type: "fill",
      source: sid,
      filter: [
        "any",
        ["==", ["geometry-type"], "Polygon"],
        ["==", ["geometry-type"], "MultiPolygon"],
      ],
      paint: {
        "fill-color": color,
        "fill-opacity": 0.22,
      },
    });
  }
  if (!map.getLayer(lineId)) {
    map.addLayer({
      id: lineId,
      type: "line",
      source: sid,
      filter: [
        "any",
        ["==", ["geometry-type"], "LineString"],
        ["==", ["geometry-type"], "MultiLineString"],
        ["==", ["geometry-type"], "Polygon"],
        ["==", ["geometry-type"], "MultiPolygon"],
      ],
      paint: {
        "line-color": color,
        "line-width": 1.75,
        "line-opacity": 0.85,
      },
    });
  }
  if (!map.getLayer(circleId)) {
    map.addLayer({
      id: circleId,
      type: "circle",
      source: sid,
      filter: [
        "any",
        ["==", ["geometry-type"], "Point"],
        ["==", ["geometry-type"], "MultiPoint"],
      ],
      paint: {
        "circle-radius": 5,
        "circle-color": color,
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.9,
      },
    });
  }
}

function removeCatalogueLayer(map: MapLibreMap, layerKey: string) {
  const sid = sourceId(layerKey);
  for (const suffix of ["-fill", "-line", "-circle"]) {
    const id = `${sid}${suffix}`;
    if (map.getLayer(id)) map.removeLayer(id);
  }
  if (map.getSource(sid)) map.removeSource(sid);
}

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
  if (dark) {
    return `<span class="um-crystal-pin" style="--um-pin:${fill};--um-ring:${ring}" aria-hidden="true">
      <span class="um-crystal-pin__gem"></span>
      <span class="um-crystal-pin__beam"></span>
      <span class="um-crystal-pin__ring"></span>
    </span>`;
  }
  return `<span class="um-selected-pin__mark" style="--um-pin:${fill};--um-ring:${ring}" aria-hidden="true">
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
      id: "um-marker-ground",
      type: "circle",
      source: "um-markers",
      filter: [
        "in",
        ["get", "kind"],
        ["literal", ["cluster", "verified", "pending"]],
      ],
      layout: { visibility: dark ? "visible" : "none" },
      paint: {
        "circle-radius": ["+", ["get", "radius"], 8],
        "circle-color": "transparent",
        "circle-stroke-width": 1.25,
        "circle-stroke-color": ["get", "color"],
        "circle-stroke-opacity": 0.75,
        "circle-pitch-alignment": "map",
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
      if (map.getLayer("um-marker-ground")) {
        map.setLayoutProperty("um-marker-ground", "visibility", dark ? "visible" : "none");
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
  const showHazards = neighbourhood.id !== "kileleshwa";
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onSelectRef = useRef(onSelect);
  const byIdRef = useRef(new Map<string, IncidentPublic>());
  const fittedRef = useRef(false);
  const lastFlyRef = useRef<string | null>(null);
  const lastNeighbourhoodRef = useRef(neighbourhood.id);
  const selectedMarkerRef = useRef<maplibregl.Marker | null>(null);
  const focusRef = useRef<{ lng: number; lat: number } | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const loadedKeysRef = useRef<Set<string>>(new Set());

  const [catalogueLayers, setCatalogueLayers] = useState<CatalogueLayerMeta[]>(
    [],
  );
  const [enabledLayers, setEnabledLayers] = useState<Set<string>>(new Set());
  const [layerAttribution, setLayerAttribution] = useState(
    "© OpenStreetMap contributors",
  );
  const [layersError, setLayersError] = useState<string | null>(null);

  const hazardIncidents = showHazards ? incidents : [];
  const features = useMemo(
    () => splitMapFeatures(hazardIncidents),
    [hazardIncidents],
  );
  const byId = useMemo(
    () => new Map(hazardIncidents.map((row) => [row.id, row])),
    [hazardIncidents],
  );
  const selected = selectedId ? byId.get(selectedId) ?? null : null;
  const [centerLat, centerLng] = neighbourhood.center;

  onSelectRef.current = onSelect;
  byIdRef.current = byId;
  focusRef.current = selected ? { lng: selected.lng, lat: selected.lat } : null;

  useEffect(() => {
    let cancelled = false;
    setLayersError(null);
    void fetchLayers(neighbourhood.id)
      .then((data) => {
        if (cancelled) return;
        const withFeatures = data.layers.filter((l) => l.feature_count > 0);
        setCatalogueLayers(withFeatures);
        setLayerAttribution(data.attribution || "© OpenStreetMap contributors");
        setEnabledLayers(new Set(withFeatures.map((l) => l.layer_key)));
      })
      .catch((err) => {
        if (cancelled) return;
        setCatalogueLayers([]);
        setEnabledLayers(new Set());
        setLayersError(
          err instanceof Error ? err.message : "Couldn't load map layers.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [neighbourhood.id]);

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
      applyUrbanMeshBasemap(map, dark, focusRef.current);
      ensureIncidentLayers(map, dark);
    };
    map.on("load", onReady);
    map.on("style.load", () => {
      applyUrbanMeshBasemap(map, dark, focusRef.current);
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
      applyUrbanMeshBasemap(map, dark, focusRef.current);
      ensureIncidentLayers(map, dark);
      // Style swap drops custom sources; catalogue effect reloads them.
      loadedKeysRef.current.clear();
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
    for (const key of loadedKeysRef.current) {
      removeCatalogueLayer(map, key);
    }
    loadedKeysRef.current.clear();
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

    let cancelled = false;
    const wanted = new Set(enabledLayers);

    async function sync() {
      // Remove disabled
      for (const key of [...loadedKeysRef.current]) {
        if (!wanted.has(key)) {
          removeCatalogueLayer(map!, key);
          loadedKeysRef.current.delete(key);
        }
      }
      // Load enabled (re-add if style swap dropped the source)
      for (const [index, meta] of catalogueLayers.entries()) {
        if (!wanted.has(meta.layer_key)) continue;
        if (
          loadedKeysRef.current.has(meta.layer_key) &&
          map!.getSource(sourceId(meta.layer_key))
        ) {
          continue;
        }
        try {
          const data = await fetchLayerGeoJson(
            neighbourhood.id,
            meta.layer_key,
          );
          if (cancelled || !mapRef.current) return;
          if (!data.collection.features?.length) continue;
          const apply = () => {
            ensureCatalogueLayer(
              mapRef.current!,
              meta.layer_key,
              colorForLayer(index),
              data.collection,
            );
            loadedKeysRef.current.add(meta.layer_key);
          };
          if (mapRef.current.isStyleLoaded()) apply();
          else mapRef.current.once("style.load", apply);
        } catch {
          /* skip failed layer */
        }
      }
    }

    void sync();
    return () => {
      cancelled = true;
    };
  }, [catalogueLayers, enabledLayers, neighbourhood.id, dark]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markerFeatures: GeoJSON.Feature[] = [];

    if (showHazards && showVerified) {
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

    if (showHazards && showPending) {
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

    const heatFeatures: GeoJSON.Feature[] =
      showHazards && showVerified
        ? hazardIncidents
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
    hazardIncidents,
    features,
    user,
    focus,
    showVerified,
    showPending,
    showHazards,
    selectedId,
    dark,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || fittedRef.current || hazardIncidents.length === 0) return;
    fittedRef.current = true;
    const bounds = new maplibregl.LngLatBounds();
    for (const row of hazardIncidents) bounds.extend([row.lng, row.lat]);
    map.fitBounds(bounds, {
      padding: 72,
      maxZoom: 16,
      duration: 0,
      pitch: MAP_CAMERA.pitch,
      bearing: MAP_CAMERA.bearing,
    });
  }, [hazardIncidents]);

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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    applyUrbanMeshBasemap(
      map,
      dark,
      selected ? { lng: selected.lng, lat: selected.lat } : null,
    );
  }, [selected, dark]);

  function toggleLayer(layerKey: string) {
    setEnabledLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layerKey)) next.delete(layerKey);
      else next.add(layerKey);
      return next;
    });
  }

  return (
    <div className={`absolute inset-0 ${className}`}>
      <div ref={wrapRef} className="um-vector-map h-full w-full" />
      <div className="pointer-events-none absolute bottom-36 left-6 z-[1100] hidden lg:block">
        <MapKey showHazards={showHazards} />
      </div>
      {catalogueLayers.length > 0 ? (
        <div className="pointer-events-auto absolute left-3 top-[max(5.5rem,calc(4.5rem+env(safe-area-inset-top)))] z-[1100] max-h-[40vh] w-[min(14rem,calc(100vw-1.5rem))] overflow-y-auto rounded-card border border-civic-line bg-civic-surface/95 p-2.5 shadow-card backdrop-blur-md lg:left-auto lg:right-6 lg:top-24">
          <p className="um-eyebrow text-[10px]">Layers</p>
          {layersError ? (
            <p className="mt-1 text-[10px] text-civic-critical">{layersError}</p>
          ) : null}
          <ul className="mt-1.5 space-y-1">
            {catalogueLayers.map((layer, index) => (
              <li key={layer.layer_key}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-[11px] hover:bg-civic-mist/60">
                  <input
                    type="checkbox"
                    checked={enabledLayers.has(layer.layer_key)}
                    onChange={() => toggleLayer(layer.layer_key)}
                  />
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: colorForLayer(index) }}
                    aria-hidden
                  />
                  <span className="min-w-0 truncate font-semibold text-civic-ink">
                    {layer.title}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[9px] leading-snug text-civic-muted">
            {layerAttribution}
          </p>
        </div>
      ) : null}
      <div className="um-map-zoom absolute right-3 top-[42%] z-[1100] flex flex-col overflow-hidden rounded-full border border-civic-line bg-civic-surface/90 shadow-card backdrop-blur-md lg:bottom-28 lg:right-6 lg:top-auto">
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

export function MapKey({
  bare = false,
  showHazards = true,
}: {
  bare?: boolean;
  showHazards?: boolean;
}) {
  const items = showHazards
    ? [
        { color: MARKER.verified, label: "Supported" },
        { color: MARKER.pending, label: "Pending" },
        { color: MARKER.you, label: "You" },
      ]
    : [{ color: MARKER.you, label: "You" }];
  const body = (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-[11px] font-semibold text-civic-slate">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: item.color }}
            aria-hidden
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
  if (bare) return body;
  return (
    <div className="rounded-full border border-civic-line bg-civic-surface/80 px-3 py-1.5 shadow-card backdrop-blur-md">
      {body}
    </div>
  );
}
