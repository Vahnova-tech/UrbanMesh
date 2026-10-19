import { useEffect, useMemo, useRef } from "react";
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import { cellToBoundary } from "h3-js";
import "maplibre-gl/dist/maplibre-gl.css";
import type {
  IncidentPublic,
  PlatformMeta,
  SpatialCluster,
} from "../../lib/api";
import { useTheme } from "../../lib/theme";
import {
  applyUrbanMeshBasemap,
  HEAT_DARK,
  HEAT_LIGHT,
  MAP_CAMERA,
  MARKER,
  styleUrlFor,
} from "../../lib/mapStyle";

const KILIMANI: [number, number] = [-1.2921, 36.785];

export interface MapLayers {
  verified: boolean;
  pending: boolean;
  wards: boolean;
  roads: boolean;
  drainage: boolean;
  pedestrian: boolean;
  h3: boolean;
}

export function PlannerMap({
  incidents,
  clusters,
  meta,
  layers,
  selectedId,
  selectedIncidentId,
  onSelectCluster,
  onSelectIncident,
}: {
  incidents: IncidentPublic[];
  clusters: SpatialCluster[];
  meta: PlatformMeta | null;
  layers: MapLayers;
  selectedId?: string | null;
  selectedIncidentId?: string | null;
  onSelectCluster?: (cluster: SpatialCluster) => void;
  onSelectIncident?: (incident: IncidentPublic) => void;
}) {
  const { dark } = useTheme();
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onSelectClusterRef = useRef(onSelectCluster);
  const onSelectIncidentRef = useRef(onSelectIncident);
  const clustersRef = useRef(clusters);
  const incidentsRef = useRef(incidents);
  onSelectClusterRef.current = onSelectCluster;
  onSelectIncidentRef.current = onSelectIncident;
  clustersRef.current = clusters;
  incidentsRef.current = incidents;

  const h3Cells = useMemo(() => {
    const unique = [...new Set(incidents.map((i) => i.h3_index).filter(Boolean))];
    return unique.map((cell) => ({
      cell,
      path: cellToBoundary(cell) as Array<[number, number]>,
    }));
  }, [incidents]);

  const roads = meta?.corridors.filter(
    (c) => c.id === "argwings-kodhek" || c.id === "ngong-road",
  );
  const drainage = meta?.corridors.filter((c) => c.id === "kirichwa-kubwa");
  const pedestrian = meta?.corridors.filter((c) => c.id === "dennis-pritt");
  const selected = clusters.find((c) => c.cluster_id === selectedId);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || mapRef.current) return;

    const map = new maplibregl.Map({
      container: el,
      style: styleUrlFor(dark),
      center: [KILIMANI[1], KILIMANI[0]],
      zoom: 15.1,
      pitch: MAP_CAMERA.pitch,
      bearing: MAP_CAMERA.bearing,
      maxPitch: MAP_CAMERA.maxPitch,
      attributionControl: { compact: true },
      canvasContextAttributes: { antialias: true },
    });
    mapRef.current = map;

    const boot = () => {
      applyUrbanMeshBasemap(map, dark);
      ensureOverlayLayers(map, dark);
    };
    map.on("load", boot);
    map.on("style.load", boot);

    map.on("click", "um-cluster-circle", (ev) => {
      const id = ev.features?.[0]?.properties?.id as string | undefined;
      if (!id) return;
      const row = clustersRef.current.find((c) => c.cluster_id === id);
      if (row) onSelectClusterRef.current?.(row);
    });
    map.on("click", "um-pending-circle", (ev) => {
      const id = ev.features?.[0]?.properties?.id as string | undefined;
      if (!id) return;
      const row = incidentsRef.current.find((i) => i.id === id);
      if (row) onSelectIncidentRef.current?.(row);
    });
    map.on("mouseenter", "um-cluster-circle", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "um-cluster-circle", () => {
      map.getCanvas().style.cursor = "";
    });
    map.on("mouseenter", "um-pending-circle", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "um-pending-circle", () => {
      map.getCanvas().style.cursor = "";
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(el);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(styleUrlFor(dark), { diff: false });
    map.once("style.load", () => {
      applyUrbanMeshBasemap(map, dark);
      ensureOverlayLayers(map, dark);
    });
  }, [dark]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const wardColor = dark ? "#8F968E" : "#3F4A52";
    const roadColor = dark ? "#C5C1B8" : "#16181D";

    const apply = () => {
      ensureOverlayLayers(map, dark);

      const heat = map.getSource("um-heat") as GeoJSONSource | undefined;
      heat?.setData({
        type: "FeatureCollection",
        features: layers.verified
          ? incidents
              .filter((p) => p.is_verified)
              .map((p) => ({
                type: "Feature" as const,
                geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
                properties: { weight: p.severity === "critical" ? 0.85 : 0.5 },
              }))
          : [],
      });
      map.setLayoutProperty(
        "um-heat-layer",
        "visibility",
        layers.verified ? "visible" : "none",
      );

      const wards = map.getSource("um-wards") as GeoJSONSource | undefined;
      wards?.setData({
        type: "FeatureCollection",
        features:
          layers.wards && meta
            ? meta.wards.map((ward) => {
                const [minLat, maxLat, minLng, maxLng] = ward.bbox;
                return {
                  type: "Feature" as const,
                  properties: { name: ward.name },
                  geometry: {
                    type: "Polygon" as const,
                    coordinates: [
                      [
                        [minLng, minLat],
                        [maxLng, minLat],
                        [maxLng, maxLat],
                        [minLng, maxLat],
                        [minLng, minLat],
                      ],
                    ],
                  },
                };
              })
            : [],
      });
      map.setLayoutProperty("um-wards-fill", "visibility", layers.wards ? "visible" : "none");
      map.setLayoutProperty("um-wards-line", "visibility", layers.wards ? "visible" : "none");
      map.setPaintProperty("um-wards-line", "line-color", wardColor);

      const lineFeatures = (
        items: NonNullable<PlatformMeta["corridors"]> | undefined,
        kind: string,
      ) =>
        (items ?? []).map((c) => ({
          type: "Feature" as const,
          properties: { kind },
          geometry: {
            type: "LineString" as const,
            coordinates: c.path.map(([lat, lng]) => [lng, lat]),
          },
        }));

      const corridors = map.getSource("um-corridors") as GeoJSONSource | undefined;
      corridors?.setData({
        type: "FeatureCollection",
        features: [
          ...(layers.roads ? lineFeatures(roads, "road") : []),
          ...(layers.drainage ? lineFeatures(drainage, "drainage") : []),
          ...(layers.pedestrian ? lineFeatures(pedestrian, "ped") : []),
        ],
      });
      map.setPaintProperty("um-corridor-road", "line-color", roadColor);
      map.setPaintProperty("um-corridor-drainage", "line-color", wardColor);
      map.setLayoutProperty(
        "um-corridor-road",
        "visibility",
        layers.roads ? "visible" : "none",
      );
      map.setLayoutProperty(
        "um-corridor-drainage",
        "visibility",
        layers.drainage ? "visible" : "none",
      );
      map.setLayoutProperty(
        "um-corridor-ped",
        "visibility",
        layers.pedestrian ? "visible" : "none",
      );

      const h3 = map.getSource("um-h3") as GeoJSONSource | undefined;
      h3?.setData({
        type: "FeatureCollection",
        features: layers.h3
          ? h3Cells.map((cell) => ({
              type: "Feature" as const,
              properties: {},
              geometry: {
                type: "Polygon" as const,
                coordinates: [cell.path.map(([lat, lng]) => [lng, lat])],
              },
            }))
          : [],
      });
      map.setLayoutProperty("um-h3-fill", "visibility", layers.h3 ? "visible" : "none");
      map.setLayoutProperty("um-h3-line", "visibility", layers.h3 ? "visible" : "none");

      const pending = map.getSource("um-pending") as GeoJSONSource | undefined;
      pending?.setData({
        type: "FeatureCollection",
        features: layers.pending
          ? incidents
              .filter((i) => !i.is_verified)
              .map((inc) => ({
                type: "Feature" as const,
                geometry: { type: "Point" as const, coordinates: [inc.lng, inc.lat] },
                properties: {
                  id: inc.id,
                  selected: selectedIncidentId === inc.id ? 1 : 0,
                  radius: selectedIncidentId === inc.id ? 8 : 5,
                },
              }))
          : [],
      });
      map.setLayoutProperty(
        "um-pending-circle",
        "visibility",
        layers.pending ? "visible" : "none",
      );

      const clusterSrc = map.getSource("um-clusters") as GeoJSONSource | undefined;
      clusterSrc?.setData({
        type: "FeatureCollection",
        features: layers.verified
          ? clusters.map((cluster) => ({
              type: "Feature" as const,
              geometry: {
                type: "Point" as const,
                coordinates: [cluster.lng, cluster.lat],
              },
              properties: {
                id: cluster.cluster_id,
                color:
                  cluster.severity === "critical" ? MARKER.critical : MARKER.verified,
                radius: selectedId === cluster.cluster_id ? 13 : 9,
                selected: selectedId === cluster.cluster_id ? 1 : 0,
              },
            }))
          : [],
      });
      map.setLayoutProperty(
        "um-cluster-circle",
        "visibility",
        layers.verified ? "visible" : "none",
      );

      const sel = map.getSource("um-selected-ring") as GeoJSONSource | undefined;
      if (selected) {
        const steps = 64;
        const coords: [number, number][] = [];
        const r = selected.radius_meters;
        for (let i = 0; i <= steps; i++) {
          const theta = (i / steps) * Math.PI * 2;
          const dLat = (r / 111320) * Math.cos(theta);
          const dLng =
            (r / (111320 * Math.cos((selected.lat * Math.PI) / 180))) * Math.sin(theta);
          coords.push([selected.lng + dLng, selected.lat + dLat]);
        }
        sel?.setData({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: { type: "Polygon", coordinates: [coords] },
            },
          ],
        });
        map.setLayoutProperty("um-selected-fill", "visibility", "visible");
        map.setLayoutProperty("um-selected-line", "visibility", "visible");
      } else {
        sel?.setData({ type: "FeatureCollection", features: [] });
        map.setLayoutProperty("um-selected-fill", "visibility", "none");
        map.setLayoutProperty("um-selected-line", "visibility", "none");
      }
    };

    if (map.isStyleLoaded() && map.getSource("um-heat")) apply();
    else {
      map.once("style.load", () => {
        ensureOverlayLayers(map, dark);
        apply();
      });
    }
  }, [
    incidents,
    clusters,
    meta,
    layers,
    selectedId,
    selectedIncidentId,
    selected,
    h3Cells,
    roads,
    drainage,
    pedestrian,
    dark,
  ]);

  return <div ref={wrapRef} className="um-vector-map h-full w-full" />;
}

function ensureOverlayLayers(map: MapLibreMap, dark: boolean) {
  if (!map.getSource("um-heat")) {
    map.addSource("um-heat", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    map.addLayer({
      id: "um-heat-layer",
      type: "heatmap",
      source: "um-heat",
      paint: {
        "heatmap-weight": ["get", "weight"],
        "heatmap-intensity": 0.9,
        "heatmap-radius": 24,
        "heatmap-opacity": dark ? 0.5 : 0.38,
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

  const empty = { type: "FeatureCollection" as const, features: [] };

  if (!map.getSource("um-wards")) {
    map.addSource("um-wards", { type: "geojson", data: empty });
    map.addLayer({
      id: "um-wards-fill",
      type: "fill",
      source: "um-wards",
      paint: { "fill-color": MARKER.verified, "fill-opacity": dark ? 0.06 : 0.04 },
    });
    map.addLayer({
      id: "um-wards-line",
      type: "line",
      source: "um-wards",
      paint: { "line-color": "#8F968E", "line-width": 1, "line-dasharray": [1, 1.4] },
    });
  }

  if (!map.getSource("um-corridors")) {
    map.addSource("um-corridors", { type: "geojson", data: empty });
    map.addLayer({
      id: "um-corridor-road",
      type: "line",
      source: "um-corridors",
      filter: ["==", ["get", "kind"], "road"],
      paint: { "line-color": "#16181D", "line-width": 3, "line-opacity": 0.55 },
    });
    map.addLayer({
      id: "um-corridor-drainage",
      type: "line",
      source: "um-corridors",
      filter: ["==", ["get", "kind"], "drainage"],
      paint: {
        "line-color": "#8F968E",
        "line-width": 3,
        "line-dasharray": [1.5, 1.5],
      },
    });
    map.addLayer({
      id: "um-corridor-ped",
      type: "line",
      source: "um-corridors",
      filter: ["==", ["get", "kind"], "ped"],
      paint: { "line-color": MARKER.verified, "line-width": 3 },
    });
  }

  if (!map.getSource("um-h3")) {
    map.addSource("um-h3", { type: "geojson", data: empty });
    map.addLayer({
      id: "um-h3-fill",
      type: "fill",
      source: "um-h3",
      paint: { "fill-color": MARKER.verified, "fill-opacity": dark ? 0.1 : 0.06 },
    });
    map.addLayer({
      id: "um-h3-line",
      type: "line",
      source: "um-h3",
      paint: { "line-color": MARKER.verified, "line-width": 1 },
    });
  }

  if (!map.getSource("um-selected-ring")) {
    map.addSource("um-selected-ring", { type: "geojson", data: empty });
    map.addLayer({
      id: "um-selected-fill",
      type: "fill",
      source: "um-selected-ring",
      paint: { "fill-color": MARKER.verified, "fill-opacity": 0.08 },
    });
    map.addLayer({
      id: "um-selected-line",
      type: "line",
      source: "um-selected-ring",
      paint: { "line-color": MARKER.verified, "line-width": 1.5 },
    });
  }

  if (!map.getSource("um-pending")) {
    map.addSource("um-pending", { type: "geojson", data: empty });
    map.addLayer({
      id: "um-pending-circle",
      type: "circle",
      source: "um-pending",
      paint: {
        "circle-radius": ["get", "radius"],
        "circle-color": MARKER.pending,
        "circle-stroke-width": ["case", [">", ["get", "selected"], 0], 3, 1.5],
        "circle-stroke-color": dark ? "#EEE9E1" : "#FFFFFF",
        "circle-opacity": 0.85,
        "circle-pitch-alignment": "viewport",
      },
    });
  }

  if (!map.getSource("um-clusters")) {
    map.addSource("um-clusters", { type: "geojson", data: empty });
    map.addLayer({
      id: "um-cluster-circle",
      type: "circle",
      source: "um-clusters",
      paint: {
        "circle-radius": ["get", "radius"],
        "circle-color": ["get", "color"],
        "circle-stroke-width": 2,
        "circle-stroke-color": dark ? "#EEE9E1" : "#FFFFFF",
        "circle-opacity": 0.95,
        "circle-pitch-alignment": "viewport",
      },
    });
  }
}

export const DEFAULT_LAYERS: MapLayers = {
  verified: true,
  pending: true,
  wards: true,
  roads: true,
  drainage: false,
  pedestrian: false,
  h3: false,
};
