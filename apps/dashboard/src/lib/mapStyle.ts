import type { Map as MapLibreMap } from "maplibre-gl";

export const VECTOR_STYLE = {
  dark: "https://tiles.openfreemap.org/styles/dark",
  light: "https://tiles.openfreemap.org/styles/liberty",
} as const;

export const MAP_CAMERA = {
  pitch: 52,
  bearing: -18,
  maxPitch: 60,
} as const;

export const NEON = {
  cyan: "#3DDCFF",
  amber: "#FFB020",
  yellow: "#FFE566",
  orange: "#FF7A3D",
  building: "#2A3340",
  buildingLit: "#3D4A5C",
  buildingTop: "#4A5A70",
} as const;

export const DAY = {
  cyan: "#1A8FB5",
  amber: "#C4851A",
  yellow: "#B89A2E",
  orange: "#C4652A",
  building: "#E4DED4",
  buildingLit: "#D5CFC4",
  buildingTop: "#F2EEE7",
} as const;

export const HEAT_LIGHT = {
  0.2: "#c5d4c8",
  0.45: "#d7c48a",
  0.7: "#c98456",
  1: "#a63d2f",
};

export const HEAT_DARK = {
  0.2: "#3d5c52",
  0.45: "#c4a15a",
  0.7: "#c98456",
  1: "#c56a58",
};

export const MARKER = {
  pending: "#C4923A",
  verified: "#3F8A74",
  critical: "#C56A58",
  you: "#3DDCFF",
};

export function styleUrlFor(dark: boolean): string {
  return dark ? VECTOR_STYLE.dark : VECTOR_STYLE.light;
}

function firstSymbolLayerId(map: MapLibreMap): string | undefined {
  const layers = map.getStyle()?.layers;
  if (!layers) return undefined;
  for (const layer of layers) {
    if (layer.type === "symbol" && layer.layout && "text-field" in layer.layout) {
      return layer.id;
    }
  }
  return undefined;
}

function paintRoadAccents(map: MapLibreMap, dark: boolean) {
  const accent = dark ? NEON : DAY;
  const layers = map.getStyle()?.layers ?? [];

  for (const layer of layers) {
    if (layer.type !== "line") continue;
    const id = layer.id.toLowerCase();
    const isMotorway =
      id.includes("motorway") && !id.includes("casing") && !id.includes("name");
    const isTrunk =
      (id.includes("trunk") || id.includes("primary") || id.includes("major_inner")) &&
      !id.includes("casing") &&
      !id.includes("name") &&
      !id.includes("subtle");
    const isSecondary =
      (id.includes("secondary") || id.includes("tertiary") || id.includes("minor")) &&
      !id.includes("casing") &&
      !id.includes("name") &&
      !id.includes("path");
    const isTransit =
      id.includes("transit") || id.includes("rail") || id.includes("subway");

    try {
      if (isMotorway) {
        map.setPaintProperty(id, "line-color", accent.cyan);
        if (dark) map.setPaintProperty(id, "line-opacity", 0.95);
      } else if (isTrunk) {
        map.setPaintProperty(id, "line-color", accent.amber);
        if (dark) map.setPaintProperty(id, "line-opacity", 0.9);
      } else if (isSecondary) {
        map.setPaintProperty(id, "line-color", dark ? accent.yellow : accent.orange);
        if (dark) map.setPaintProperty(id, "line-opacity", 0.75);
      } else if (isTransit) {
        map.setPaintProperty(id, "line-color", accent.orange);
        if (dark) map.setPaintProperty(id, "line-opacity", 0.85);
      }
    } catch {
      /* ignore */
    }
  }
}

function ensure3dBuildings(map: MapLibreMap, dark: boolean) {
  const palette = dark ? NEON : DAY;
  const colorExpr = [
    "interpolate",
    ["linear"],
    ["coalesce", ["get", "render_height"], 10],
    0,
    palette.building,
    24,
    palette.buildingLit,
    60,
    palette.buildingTop,
  ];

  if (map.getLayer("building")) {
    try {
      map.setLayoutProperty("building", "visibility", "none");
    } catch {
      /* ignore */
    }
  }

  if (map.getLayer("building-3d")) {
    try {
      map.setPaintProperty("building-3d", "fill-extrusion-color", colorExpr);
      map.setPaintProperty("building-3d", "fill-extrusion-opacity", dark ? 0.92 : 0.88);
      map.setPaintProperty("building-3d", "fill-extrusion-vertical-gradient", true);
    } catch {
      /* ignore */
    }
    return;
  }

  if (map.getLayer("um-3d-buildings")) {
    try {
      map.setPaintProperty("um-3d-buildings", "fill-extrusion-color", colorExpr);
      map.setPaintProperty("um-3d-buildings", "fill-extrusion-opacity", dark ? 0.92 : 0.88);
    } catch {
      /* ignore */
    }
    return;
  }

  if (!map.getSource("openmaptiles")) return;
  const beforeId = firstSymbolLayerId(map);
  try {
    map.addLayer(
      {
        id: "um-3d-buildings",
        source: "openmaptiles",
        "source-layer": "building",
        type: "fill-extrusion",
        minzoom: 14,
        filter: ["!=", ["get", "hide_3d"], true],
        paint: {
          "fill-extrusion-color": colorExpr as unknown as string,
          "fill-extrusion-height": [
            "interpolate",
            ["linear"],
            ["zoom"],
            14,
            0,
            15.5,
            ["coalesce", ["get", "render_height"], 10],
          ],
          "fill-extrusion-base": [
            "case",
            [">=", ["zoom"], 15.5],
            ["coalesce", ["get", "render_min_height"], 0],
            0,
          ],
          "fill-extrusion-opacity": dark ? 0.92 : 0.88,
          "fill-extrusion-vertical-gradient": true,
        },
      },
      beforeId,
    );
  } catch {
    /* ignore */
  }
}

export function applyUrbanMeshBasemap(map: MapLibreMap, dark: boolean) {
  paintRoadAccents(map, dark);
  ensure3dBuildings(map, dark);
  try {
    if (dark) map.setPaintProperty("background", "background-color", "#0c1016");
  } catch {
    /* ignore */
  }
}
