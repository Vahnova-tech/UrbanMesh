import type { Map as MapLibreMap } from "maplibre-gl";

/** OpenFreeMap vector styles — free, no API key. */
export const VECTOR_STYLE = {
  dark: "https://tiles.openfreemap.org/styles/dark",
  light: "https://tiles.openfreemap.org/styles/liberty",
} as const;

export const MAP_CAMERA = {
  pitch: 58,
  bearing: -18,
  maxPitch: 72,
} as const;

export type MapFocusPoint = { lng: number; lat: number };

/** Dark-map accents taken from the civic theme, not a separate neon palette. */
const NIGHT = {
  ground: "#101614",
  water: "#0c1412",
  park: "#14201b",
  sky: "#101614",
  horizon: "#1c2b24",
  accent: "#5a9a86",
  accentLit: "#8fbfb0",
  amber: "#d4a24a",
  building: "#161c19",
  buildingLit: "#1e2823",
  buildingEdge: "#3e554c",
  glass: "#8fbfb0",
} as const;

/** Road accents. Dark mode uses the civic palette; day stays softer. */
export const NEON = {
  cyan: "#3DDCFF",
  amber: "#FFB020",
  yellow: "#FFE566",
  orange: "#FF7A3D",
  building: "#2A3340",
  buildingLit: "#3D4A5C",
  buildingTop: "#4A5A70",
} as const;

/** Softer accents for the daylight twin of the same style language. */
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
  pending: "#D4A24A",
  verified: "#4FA890",
  critical: "#D47868",
  you: "#5AE0FF",
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
  const accent = dark ? null : DAY;
  const layers = map.getStyle()?.layers ?? [];

  for (const layer of layers) {
    if (layer.type !== "line") continue;
    const id = layer.id.toLowerCase();

    const isCasing = id.includes("casing") || id.includes("name");
    const isMotorway = id.includes("motorway") && !isCasing;
    const isTrunk =
      (id.includes("trunk") || id.includes("primary") || id.includes("major_inner")) &&
      !isCasing &&
      !id.includes("subtle");
    const isSecondary =
      (id.includes("secondary") || id.includes("tertiary") || id.includes("minor")) &&
      !isCasing &&
      !id.includes("path");
    const isTransit =
      id.includes("transit") || id.includes("rail") || id.includes("subway");

    try {
      if (dark) {
        if (isMotorway || isTrunk) {
          map.setPaintProperty(layer.id, "line-color", isMotorway ? NIGHT.accentLit : NIGHT.accent);
          map.setPaintProperty(layer.id, "line-opacity", 0.92);
          map.setPaintProperty(layer.id, "line-blur", 0.7);
        } else if (isTransit) {
          map.setPaintProperty(layer.id, "line-color", NIGHT.amber);
          map.setPaintProperty(layer.id, "line-opacity", 0.55);
        }
        continue;
      }
      if (!accent) continue;
      if (isMotorway) map.setPaintProperty(layer.id, "line-color", accent.cyan);
      else if (isTrunk) map.setPaintProperty(layer.id, "line-color", accent.amber);
      else if (isSecondary) map.setPaintProperty(layer.id, "line-color", accent.orange);
      else if (isTransit) map.setPaintProperty(layer.id, "line-color", accent.orange);
    } catch {
      /* layer paint keys vary by style */
    }
  }
}

function paintDarkGround(map: MapLibreMap) {
  const layers = map.getStyle()?.layers ?? [];
  for (const layer of layers) {
    const id = layer.id.toLowerCase();
    if (id.includes("building") || id.includes("housenumber")) continue;
    try {
      if (layer.type === "background") {
        map.setPaintProperty(layer.id, "background-color", NIGHT.ground);
      } else if (layer.type === "fill") {
        if (id.includes("water")) map.setPaintProperty(layer.id, "fill-color", NIGHT.water);
        else if (id.includes("park") || id.includes("grass") || id.includes("wood") || id.includes("forest")) {
          map.setPaintProperty(layer.id, "fill-color", NIGHT.park);
        } else if (id.includes("land")) {
          map.setPaintProperty(layer.id, "fill-color", NIGHT.ground);
        }
      }
    } catch {
      /* ignore layers without a color paint key */
    }
  }
}

function pointDistance(focus: MapFocusPoint): unknown[] {
  return [
    "distance",
    { type: "Point", coordinates: [focus.lng, focus.lat] },
  ];
}

function buildingColor(dark: boolean, focus: MapFocusPoint | null): unknown {
  if (!dark) {
    return [
      "interpolate",
      ["linear"],
      ["coalesce", ["get", "render_height"], 10],
      0,
      DAY.building,
      24,
      DAY.buildingLit,
      60,
      DAY.buildingTop,
    ];
  }
  if (!focus) {
    return [
      "interpolate",
      ["linear"],
      ["coalesce", ["get", "render_height"], 10],
      0,
      NIGHT.building,
      28,
      NIGHT.buildingLit,
      70,
      NIGHT.buildingEdge,
    ];
  }
  return [
    "interpolate",
    ["linear"],
    pointDistance(focus),
    0,
    NIGHT.glass,
    80,
    NIGHT.buildingEdge,
    170,
    NIGHT.building,
  ];
}

function buildingOpacity(dark: boolean, focus: MapFocusPoint | null): unknown {
  if (!dark) return 0.88;
  if (!focus) return 0.76;
  return ["interpolate", ["linear"], pointDistance(focus), 0, 0.26, 70, 0.34, 170, 0.8];
}

function paintBuildings(map: MapLibreMap, layerId: string, dark: boolean, focus: MapFocusPoint | null) {
  const paint: Array<[string, unknown]> = [
    ["fill-extrusion-color", buildingColor(dark, focus)],
    ["fill-extrusion-opacity", buildingOpacity(dark, focus)],
    ["fill-extrusion-vertical-gradient", true],
  ];
  for (const [key, value] of paint) {
    try {
      map.setPaintProperty(layerId, key, value as never);
    } catch {
      /* expression support varies by style */
    }
  }
}

function ensureBuildingEdges(map: MapLibreMap, dark: boolean, focus: MapFocusPoint | null) {
  if (!map.getSource("openmaptiles")) return;
  const color = !dark
    ? DAY.buildingLit
    : focus
      ? ([
          "interpolate",
          ["linear"],
          pointDistance(focus),
          0,
          NIGHT.accentLit,
          140,
          NIGHT.buildingEdge,
        ] as unknown)
      : NIGHT.accent;
  const opacity = !dark ? 0.35 : focus ? 0.7 : 0.4;

  if (map.getLayer("um-building-edge")) {
    map.setPaintProperty("um-building-edge", "line-color", color as never);
    map.setPaintProperty("um-building-edge", "line-opacity", opacity);
    return;
  }

  const beforeId = firstSymbolLayerId(map);
  map.addLayer(
    {
      id: "um-building-edge",
      source: "openmaptiles",
      "source-layer": "building",
      type: "line",
      minzoom: 15,
      paint: {
        "line-color": color as never,
        "line-width": dark ? 0.9 : 0.6,
        "line-opacity": opacity,
      },
    },
    beforeId,
  );
}

function gridAround(lng: number, lat: number) {
  const span = 0.02;
  const step = 0.0018;
  const features: GeoJSON.Feature[] = [];
  const minLng = lng - span;
  const maxLng = lng + span;
  const minLat = lat - span;
  const maxLat = lat + span;
  for (let x = minLng; x <= maxLng + step / 2; x += step) {
    features.push({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [x, minLat],
          [x, maxLat],
        ],
      },
    });
  }
  for (let y = minLat; y <= maxLat + step / 2; y += step) {
    features.push({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [minLng, y],
          [maxLng, y],
        ],
      },
    });
  }
  return { type: "FeatureCollection" as const, features };
}

function ensureGroundGrid(map: MapLibreMap, dark: boolean) {
  if (!dark) {
    if (map.getLayer("um-ground-grid")) {
      map.setLayoutProperty("um-ground-grid", "visibility", "none");
    }
    return;
  }
  if (map.getLayer("um-ground-grid")) {
    map.setLayoutProperty("um-ground-grid", "visibility", "visible");
    return;
  }
  const center = map.getCenter();
  map.addSource("um-ground-grid", {
    type: "geojson",
    data: gridAround(center.lng, center.lat),
  });
  const before =
    map.getLayer("um-3d-buildings")
      ? "um-3d-buildings"
      : map.getLayer("building-3d")
        ? "building-3d"
        : firstSymbolLayerId(map);
  map.addLayer(
    {
      id: "um-ground-grid",
      type: "line",
      source: "um-ground-grid",
      minzoom: 13,
      maxzoom: 16.5,
      paint: {
        "line-color": NIGHT.accent,
        "line-width": 0.6,
        "line-opacity": 0.12,
      },
    },
    before,
  );
}

function applyAtmosphere(map: MapLibreMap, dark: boolean) {
  if (dark) {
    map.setSky({
      "sky-color": NIGHT.sky,
      "horizon-color": NIGHT.horizon,
      "fog-color": NIGHT.ground,
      "fog-ground-blend": 0.42,
      "horizon-fog-blend": 0.72,
      "sky-horizon-blend": 0.55,
      "atmosphere-blend": [
        "interpolate",
        ["linear"],
        ["zoom"],
        12,
        0.9,
        16,
        0.25,
      ],
    });
    map.setLight({
      anchor: "viewport",
      color: "#f4efe6",
      intensity: 0.32,
      position: [1.15, 210, 22],
    });
    return;
  }
  map.setSky({
    "sky-color": "#d5e4ef",
    "horizon-color": "#f4f1ea",
    "fog-color": "#ebe6dc",
    "fog-ground-blend": 0.2,
    "horizon-fog-blend": 0.35,
    "sky-horizon-blend": 0.5,
    "atmosphere-blend": 0.15,
  });
  map.setLight({
    anchor: "viewport",
    color: "#ffffff",
    intensity: 0.55,
    position: [1.5, 210, 40],
  });
}

function ensure3dBuildings(map: MapLibreMap, dark: boolean, focus: MapFocusPoint | null) {
  if (map.getLayer("building")) {
    try {
      map.setLayoutProperty("building", "visibility", "none");
    } catch {
      /* ignore */
    }
  }

  const extrusionId = map.getLayer("building-3d")
    ? "building-3d"
    : map.getLayer("um-3d-buildings")
      ? "um-3d-buildings"
      : null;

  if (extrusionId) {
    try {
      paintBuildings(map, extrusionId, dark, focus);
    } catch {
      /* ignore */
    }
  } else if (map.getSource("openmaptiles")) {
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
            "fill-extrusion-color": buildingColor(dark, focus) as never,
            "fill-extrusion-height": [
              "interpolate",
              ["linear"],
              ["zoom"],
              14,
              0,
              15.5,
              ["coalesce", ["get", "render_height"], 10],
            ],
            "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
            "fill-extrusion-opacity": buildingOpacity(dark, focus) as never,
            "fill-extrusion-vertical-gradient": true,
          },
        },
        beforeId,
      );
    } catch {
      /* source may still be loading */
    }
  }

  try {
    ensureBuildingEdges(map, dark, focus);
  } catch {
    /* source may still be loading */
  }
}

/**
 * After a vector style loads, tune roads, extruded buildings, and the night atmosphere.
 * `focus` makes nearby blocks translucent so a selected report stays readable.
 */
export function applyUrbanMeshBasemap(
  map: MapLibreMap,
  dark: boolean,
  focus: MapFocusPoint | null = null,
) {
  if (dark) paintDarkGround(map);
  paintRoadAccents(map, dark);
  ensure3dBuildings(map, dark, focus);
  try {
    ensureGroundGrid(map, dark);
  } catch {
    /* grid is decorative */
  }
  try {
    applyAtmosphere(map, dark);
  } catch {
    /* sky support varies */
  }
}
