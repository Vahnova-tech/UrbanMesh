import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../../lib/prisma.js";
import type { NeighbourhoodId } from "../../lib/neighbourhoods.js";
import { NEIGHBOURHOODS } from "../../lib/neighbourhoods.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOUNDARY_DIR = path.resolve(
  __dirname,
  "../../../data/boundaries",
);

type BoundaryFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: unknown;
  };
};

/** Rough OSM-derived framing polygon for Kileleshwa (not IEBC). */
function provisionalKileleshwaGeoJson(): BoundaryFeature {
  const [minLat, maxLat, minLng, maxLng] = NEIGHBOURHOODS.kileleshwa.bbox;
  // Slightly irregular ring so it is clearly a framing polygon, not a bbox rect.
  const ring: [number, number][] = [
    [minLng, minLat],
    [minLng + (maxLng - minLng) * 0.15, minLat - 0.001],
    [maxLng, minLat],
    [maxLng + 0.001, minLat + (maxLat - minLat) * 0.4],
    [maxLng, maxLat],
    [minLng + (maxLng - minLng) * 0.55, maxLat + 0.001],
    [minLng, maxLat],
    [minLng - 0.001, minLat + (maxLat - minLat) * 0.55],
    [minLng, minLat],
  ];
  return {
    type: "Feature",
    properties: {
      name: "Kileleshwa",
      boundary_status: "provisional_osm",
      source: "OSM-derived provisional framing (not IEBC)",
      note: "Area statistics remain TBD until an authoritative boundary is uploaded.",
    },
    geometry: {
      type: "MultiPolygon",
      coordinates: [[ring]],
    },
  };
}

function loadSeedGeoJson(id: NeighbourhoodId): BoundaryFeature | null {
  const file = path.join(BOUNDARY_DIR, `${id}_osm.geojson`);
  if (!existsSync(file)) {
    if (id === "kileleshwa") return provisionalKileleshwaGeoJson();
    return null;
  }
  const raw = JSON.parse(readFileSync(file, "utf8")) as
    | BoundaryFeature
    | { type: "FeatureCollection"; features: BoundaryFeature[] };
  if (raw.type === "FeatureCollection") {
    return raw.features[0] ?? null;
  }
  return raw;
}

export async function ensureProvisionalBoundary(
  id: NeighbourhoodId,
): Promise<void> {
  const rows = await prisma.$queryRaw<Array<{ has_geom: boolean }>>`
    SELECT (boundary_geom IS NOT NULL) AS has_geom
    FROM neighbourhoods
    WHERE id = ${id}::"NeighbourhoodId"
  `.catch(() => [] as Array<{ has_geom: boolean }>);

  if (rows[0]?.has_geom) return;

  const feature = loadSeedGeoJson(id);
  if (!feature?.geometry) return;

  const geojson = JSON.stringify(feature.geometry);
  await prisma.$executeRawUnsafe(
    `UPDATE neighbourhoods
     SET boundary_geom = ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)),
         boundary_status = 'provisional_osm',
         boundary_source = 'OSM-derived provisional framing (not IEBC)',
         boundary_note = 'Provisional OSM polygon for map framing. Not an official ward boundary. Area/density remain TBD until authoritative GeoJSON is uploaded.',
         boundary_version = 'osm-provisional-v1'
     WHERE id = $2::"NeighbourhoodId"
       AND boundary_geom IS NULL`,
    geojson,
    id,
  );
}

export async function getBoundaryGeoJson(
  id: NeighbourhoodId,
): Promise<{
  feature: BoundaryFeature;
  status: string;
  source: string;
  version: string | null;
  area_km2: number | null;
} | null> {
  const meta = await prisma.neighbourhood.findUnique({ where: { id } });
  if (!meta) return null;

  const geomRows = await prisma.$queryRaw<
    Array<{ geojson: string; area_m2: number | null }>
  >`
    SELECT
      ST_AsGeoJSON(boundary_geom)::text AS geojson,
      CASE
        WHEN boundary_status = 'authoritative'
        THEN ST_Area(boundary_geom::geography)
        ELSE NULL
      END AS area_m2
    FROM neighbourhoods
    WHERE id = ${id}::"NeighbourhoodId"
      AND boundary_geom IS NOT NULL
  `.catch(() => [] as Array<{ geojson: string; area_m2: number | null }>);

  if (!geomRows[0]?.geojson) {
    const seed = loadSeedGeoJson(id);
    if (!seed) return null;
    return {
      feature: seed,
      status: meta.boundaryStatus,
      source: meta.boundarySource,
      version: meta.boundaryVersion,
      area_km2: null,
    };
  }

  const geometry = JSON.parse(geomRows[0].geojson) as BoundaryFeature["geometry"];
  const areaKm2 =
    geomRows[0].area_m2 != null
      ? Math.round((geomRows[0].area_m2 / 1_000_000) * 1000) / 1000
      : null;

  return {
    feature: {
      type: "Feature",
      properties: {
        name: meta.displayName,
        boundary_status: meta.boundaryStatus,
        source: meta.boundarySource,
        version: meta.boundaryVersion,
        area_km2: areaKm2,
      },
      geometry,
    },
    status: meta.boundaryStatus,
    source: meta.boundarySource,
    version: meta.boundaryVersion,
    area_km2: areaKm2,
  };
}

export async function setBoundaryFromGeoJson(
  id: NeighbourhoodId,
  geometry: BoundaryFeature["geometry"] | { type: string; coordinates: unknown },
  opts: {
    status: "provisional_osm" | "authoritative";
    source: string;
    version: string;
    note?: string;
  },
): Promise<void> {
  if (
    geometry.type !== "Polygon" &&
    geometry.type !== "MultiPolygon"
  ) {
    throw new Error("Boundary must be a Polygon or MultiPolygon.");
  }
  const geojson = JSON.stringify(geometry);
  await prisma.$executeRawUnsafe(
    `UPDATE neighbourhoods
     SET boundary_geom = ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)),
         boundary_status = $2,
         boundary_source = $3,
         boundary_version = $4,
         boundary_note = COALESCE($5, boundary_note)
     WHERE id = $6::"NeighbourhoodId"`,
    geojson,
    opts.status,
    opts.source,
    opts.version,
    opts.note ?? null,
    id,
  );
}
