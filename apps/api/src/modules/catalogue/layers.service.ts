import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../lib/env.js";
import type { NeighbourhoodId } from "../../lib/neighbourhoods.js";
import { getBoundaryGeoJson } from "./boundary.service.js";

export interface LayerMeta {
  id: string;
  neighbourhood_id: NeighbourhoodId;
  layer_key: string;
  title: string;
  category: string;
  source: string;
  attribution: string;
  observation_period: string | null;
  access_tier: string;
  published: boolean;
  feature_count: number;
  refreshed_at: string | null;
}

function layerPath(neighbourhood: NeighbourhoodId, layerKey: string): string {
  mkdirSync(env.layerStoragePath, { recursive: true });
  return path.join(env.layerStoragePath, `${neighbourhood}_${layerKey}.geojson`);
}

export async function listPublishedLayers(
  neighbourhood: NeighbourhoodId,
): Promise<LayerMeta[]> {
  const rows = await prisma.mapLayer.findMany({
    where: {
      neighbourhoodId: neighbourhood,
      published: true,
      featureCount: { gt: 0 },
    },
    orderBy: { title: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    neighbourhood_id: r.neighbourhoodId,
    layer_key: r.layerKey,
    title: r.title,
    category: r.category,
    source: r.source,
    attribution: r.attribution,
    observation_period: r.observationPeriod,
    access_tier: r.accessTier,
    published: r.published,
    feature_count: r.featureCount,
    refreshed_at: r.refreshedAt?.toISOString() ?? null,
  }));
}

export async function getLayerGeoJson(
  neighbourhood: NeighbourhoodId,
  layerKey: string,
): Promise<{
  layer_key: string;
  title: string;
  attribution: string;
  feature_count: number;
  collection: { type: "FeatureCollection"; features: unknown[] };
} | null> {
  const row = await prisma.mapLayer.findUnique({
    where: {
      neighbourhoodId_layerKey: { neighbourhoodId: neighbourhood, layerKey },
    },
  });
  if (!row || !row.published || row.featureCount <= 0) return null;

  const file = row.storagePath ?? layerPath(neighbourhood, layerKey);
  if (!existsSync(file)) return null;

  const collection = JSON.parse(readFileSync(file, "utf8")) as {
    type: "FeatureCollection";
    features: unknown[];
  };
  if (!collection.features?.length) return null;

  return {
    layer_key: row.layerKey,
    title: row.title,
    attribution: row.attribution,
    feature_count: row.featureCount,
    collection,
  };
}

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  geometry?: Array<{ lat: number; lon: number }>;
  tags?: Record<string, string>;
};

const LAYER_QUERIES: Array<{
  key: string;
  title: string;
  category: string;
  query: (bbox: string) => string;
}> = [
  {
    key: "roads",
    title: "Roads",
    category: "mobility",
    query: (bbox) =>
      `way["highway"](${bbox});`,
  },
  {
    key: "buildings",
    title: "Buildings",
    category: "built_form",
    query: (bbox) => `way["building"](${bbox});`,
  },
  {
    key: "water",
    title: "Water",
    category: "environment",
    query: (bbox) =>
      `way["natural"="water"](${bbox});way["waterway"](${bbox});`,
  },
  {
    key: "green",
    title: "Green space",
    category: "environment",
    query: (bbox) =>
      `way["leisure"="park"](${bbox});way["landuse"="grass"](${bbox});relation["leisure"="park"](${bbox});`,
  },
  {
    key: "amenities",
    title: "Amenities",
    category: "facilities",
    query: (bbox) =>
      `node["amenity"~"school|hospital|clinic|place_of_worship|marketplace"](${bbox});`,
  },
];

function bboxFromBoundary(
  feature: { geometry: { type: string; coordinates: unknown } },
): string | null {
  const coords: number[][] = [];
  const walk = (c: unknown): void => {
    if (!Array.isArray(c)) return;
    if (typeof c[0] === "number" && typeof c[1] === "number") {
      coords.push(c as number[]);
      return;
    }
    for (const item of c) walk(item);
  };
  walk(feature.geometry.coordinates);
  if (!coords.length) return null;
  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  const south = Math.min(...lats);
  const north = Math.max(...lats);
  const west = Math.min(...lngs);
  const east = Math.max(...lngs);
  return `${south},${west},${north},${east}`;
}

function elementsToFeatures(
  elements: OverpassElement[],
): Array<{ type: "Feature"; properties: Record<string, unknown>; geometry: unknown }> {
  const features: Array<{
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: unknown;
  }> = [];
  for (const el of elements) {
    const props = { osm_id: el.id, ...(el.tags ?? {}) };
    if (el.type === "node" && el.lat != null && el.lon != null) {
      features.push({
        type: "Feature",
        properties: props,
        geometry: { type: "Point", coordinates: [el.lon, el.lat] },
      });
    } else if (el.geometry?.length) {
      const line = el.geometry.map((g) => [g.lon, g.lat]);
      const closed =
        line.length > 3 &&
        line[0][0] === line[line.length - 1][0] &&
        line[0][1] === line[line.length - 1][1];
      features.push({
        type: "Feature",
        properties: props,
        geometry: closed
          ? { type: "Polygon", coordinates: [line] }
          : { type: "LineString", coordinates: line },
      });
    }
  }
  return features;
}

/** Refresh OSM layers for a neighbourhood. Skips empty results. */
export async function refreshOsmLayers(
  neighbourhood: NeighbourhoodId,
): Promise<{ refreshed: string[]; skipped: string[] }> {
  const boundary = await getBoundaryGeoJson(neighbourhood);
  if (!boundary) {
    throw new Error("Boundary required before refreshing OSM layers.");
  }
  const bbox = bboxFromBoundary(boundary.feature);
  if (!bbox) throw new Error("Could not derive bbox from boundary.");

  const refreshed: string[] = [];
  const skipped: string[] = [];

  for (const def of LAYER_QUERIES) {
    const ql = `[out:json][timeout:45];(${def.query(bbox)});out geom;`;
    let features: ReturnType<typeof elementsToFeatures> = [];
    try {
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(ql)}`,
      });
      if (!res.ok) {
        skipped.push(def.key);
        continue;
      }
      const data = (await res.json()) as { elements?: OverpassElement[] };
      features = elementsToFeatures(data.elements ?? []);
    } catch {
      skipped.push(def.key);
      continue;
    }

    if (features.length === 0) {
      skipped.push(def.key);
      await prisma.mapLayer.upsert({
        where: {
          neighbourhoodId_layerKey: {
            neighbourhoodId: neighbourhood,
            layerKey: def.key,
          },
        },
        create: {
          neighbourhoodId: neighbourhood,
          layerKey: def.key,
          title: def.title,
          category: def.category,
          source: "OpenStreetMap Overpass",
          attribution: "© OpenStreetMap contributors",
          published: false,
          featureCount: 0,
        },
        update: {
          featureCount: 0,
          published: false,
          refreshedAt: new Date(),
        },
      });
      continue;
    }

    const file = layerPath(neighbourhood, def.key);
    writeFileSync(
      file,
      JSON.stringify({ type: "FeatureCollection", features }),
      "utf8",
    );

    await prisma.mapLayer.upsert({
      where: {
        neighbourhoodId_layerKey: {
          neighbourhoodId: neighbourhood,
          layerKey: def.key,
        },
      },
      create: {
        neighbourhoodId: neighbourhood,
        layerKey: def.key,
        title: def.title,
        category: def.category,
        source: "OpenStreetMap Overpass",
        attribution: "© OpenStreetMap contributors",
        observationPeriod: new Date().toISOString().slice(0, 10),
        published: true,
        featureCount: features.length,
        storagePath: file,
        refreshedAt: new Date(),
      },
      update: {
        title: def.title,
        category: def.category,
        published: true,
        featureCount: features.length,
        storagePath: file,
        refreshedAt: new Date(),
        observationPeriod: new Date().toISOString().slice(0, 10),
      },
    });
    refreshed.push(def.key);
  }

  return { refreshed, skipped };
}

/** Seed empty placeholder layers is intentionally avoided — only non-empty layers publish. */
export async function ensureSampleLayerIfNeeded(
  neighbourhood: NeighbourhoodId,
): Promise<void> {
  const existing = await prisma.mapLayer.count({
    where: { neighbourhoodId: neighbourhood, published: true, featureCount: { gt: 0 } },
  });
  if (existing > 0) return;

  // Register boundary as a published "layer" metadata pointer (features served from boundary endpoint).
  const boundary = await getBoundaryGeoJson(neighbourhood);
  if (!boundary) return;

  const file = layerPath(neighbourhood, "boundary");
  writeFileSync(
    file,
    JSON.stringify({
      type: "FeatureCollection",
      features: [boundary.feature],
    }),
    "utf8",
  );

  await prisma.mapLayer.upsert({
    where: {
      neighbourhoodId_layerKey: {
        neighbourhoodId: neighbourhood,
        layerKey: "boundary",
      },
    },
    create: {
      neighbourhoodId: neighbourhood,
      layerKey: "boundary",
      title: "Neighbourhood boundary",
      category: "boundaries",
      source: boundary.source,
      attribution:
        boundary.status === "provisional_osm"
          ? "© OpenStreetMap contributors (provisional framing — not IEBC)"
          : boundary.source,
      published: true,
      featureCount: 1,
      storagePath: file,
      refreshedAt: new Date(),
    },
    update: {
      published: true,
      featureCount: 1,
      storagePath: file,
      refreshedAt: new Date(),
    },
  });
}
