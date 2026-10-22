import type { Dataset } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import {
  isNeighbourhoodId,
  listNeighbourhoods,
  neighbourhoodOrDefault,
  type NeighbourhoodConfig,
  type NeighbourhoodId,
  NEIGHBOURHOODS,
} from "../../lib/neighbourhoods.js";
import { PACK_NARRATIVE } from "./catalogue.narrative.js";
import type {
  AccessTier,
  CatalogueDataset,
  ConcernCategory,
  DataKind,
  DataPackMeta,
} from "./catalogue.types.js";

export type {
  AccessTier,
  CatalogueDataset,
  ConcernCategory,
  DataKind,
  DataPackMeta,
  GlanceIndicator,
} from "./catalogue.types.js";

function parseRelatedLayers(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

export function mapDatasetRow(row: Dataset): CatalogueDataset {
  return {
    id: row.id,
    neighbourhood_id: row.neighbourhoodId,
    slug: row.slug,
    title: row.title,
    description: row.description,
    category: row.category,
    geographic_coverage: row.geographicCoverage,
    source_organization: row.sourceOrganization,
    source_url: row.sourceUrl,
    published_at: iso(row.publishedAt),
    acquired_at: iso(row.acquiredAt),
    observation_period: row.observationPeriod,
    last_updated: iso(row.lastUpdated),
    file_format: row.fileFormat,
    license: row.license,
    access_tier: row.accessTier,
    privacy_classification: row.privacyClassification as
      | "public"
      | "anonymized"
      | "sensitive",
    quality_notes: row.qualityNotes,
    methodology: row.methodology,
    download_available: row.downloadAvailable,
    data_kind: row.dataKind,
    related_layers: parseRelatedLayers(row.relatedLayersJson),
  };
}

export function mapNeighbourhoodRow(row: {
  id: NeighbourhoodId;
  displayName: string;
  centerLat: number;
  centerLng: number;
  bboxJson: string;
  boundaryStatus: string;
  boundarySource: string;
  boundaryNote: string;
  reportingMode: string;
  description: string;
}): NeighbourhoodConfig {
  const fallback = NEIGHBOURHOODS[row.id];
  let bbox = fallback.bbox;
  try {
    const parsed = JSON.parse(row.bboxJson) as number[];
    if (parsed.length === 4 && parsed.every((n) => typeof n === "number")) {
      bbox = parsed as [number, number, number, number];
    }
  } catch {
    /* keep fallback */
  }
  return {
    id: row.id,
    display_name: row.displayName,
    short_label: row.displayName,
    center: [row.centerLat, row.centerLng],
    bbox,
    boundary_status:
      row.boundaryStatus === "authoritative"
        ? "authoritative"
        : row.boundaryStatus === "provisional_osm"
          ? "provisional_osm"
          : "provisional_mvp",
    boundary_source: row.boundarySource,
    boundary_note: row.boundaryNote,
    reporting_mode:
      row.reportingMode === "community_planning"
        ? "community_planning"
        : "infrastructure_hazards",
    description: row.description,
  };
}

/** Prefer DB neighbourhoods; fall back to static config if empty. */
export async function listNeighbourhoodsFromDb(): Promise<NeighbourhoodConfig[]> {
  try {
    const rows = await prisma.neighbourhood.findMany({
      where: { active: true },
      orderBy: { displayName: "asc" },
    });
    if (rows.length === 0) return listNeighbourhoods();
    return rows
      .filter((r) => isNeighbourhoodId(r.id))
      .map((r) => mapNeighbourhoodRow(r));
  } catch {
    return listNeighbourhoods();
  }
}

export async function getNeighbourhoodFromDb(
  id: NeighbourhoodId,
): Promise<NeighbourhoodConfig> {
  try {
    const row = await prisma.neighbourhood.findUnique({ where: { id } });
    if (row) return mapNeighbourhoodRow(row);
  } catch {
    /* fall through */
  }
  return neighbourhoodOrDefault(id);
}

export async function listDatasetsForNeighbourhood(
  id: NeighbourhoodId,
  opts: { publishedOnly?: boolean } = {},
): Promise<CatalogueDataset[]> {
  const rows = await prisma.dataset.findMany({
    where: {
      neighbourhoodId: id,
      ...(opts.publishedOnly ? { published: true } : {}),
    },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });
  return rows.map(mapDatasetRow);
}

export async function listOpenDatasets(
  id: NeighbourhoodId,
): Promise<CatalogueDataset[]> {
  const all = await listDatasetsForNeighbourhood(id, { publishedOnly: true });
  return all.filter((d) => d.access_tier === "open");
}

export async function listConcernTaxonomy(
  id: NeighbourhoodId,
): Promise<ConcernCategory[]> {
  const rows = await prisma.concernType.findMany({
    where: { neighbourhoodId: id },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map((r) => ({
    code: r.code,
    label: r.label,
    description: r.description,
  }));
}

export async function getDataPack(id: NeighbourhoodId): Promise<DataPackMeta> {
  const narrative = PACK_NARRATIVE[id];
  const [packRow, datasets, taxonomy] = await Promise.all([
    prisma.dataPack.findFirst({
      where: { neighbourhoodId: id },
      orderBy: { publishedAt: "desc" },
    }),
    listDatasetsForNeighbourhood(id, { publishedOnly: true }),
    listConcernTaxonomy(id),
  ]);

  const status =
    packRow?.status === "published" ? ("published" as const) : ("draft" as const);

  return {
    neighbourhood_id: id,
    title: packRow?.title ?? (id === "kileleshwa"
      ? "Growing Better: Community-Led Planning for Kileleshwa"
      : "Kilimani hazard evidence"),
    subtitle: narrative.subtitle,
    version: packRow?.version ?? (id === "kileleshwa" ? "0.1.0-draft" : "1.0.0-pilot"),
    status,
    published_at: packRow?.publishedAt
      ? packRow.publishedAt.toISOString()
      : null,
    introduction: packRow?.summary ?? narrative.introduction,
    process_steps: narrative.process_steps,
    limitations: narrative.limitations,
    privacy_guidance: narrative.privacy_guidance,
    recommended_use: narrative.recommended_use,
    glance: narrative.glance,
    concern_taxonomy: taxonomy,
    datasets,
  };
}

/** Public catalogue: never expose restricted download URLs. */
export function redactDatasetForPublic(
  d: CatalogueDataset,
): CatalogueDataset & { download_url: null } {
  const restricted = d.access_tier === "restricted";
  return {
    ...d,
    download_available: restricted ? false : d.download_available,
    download_url: null,
  };
}
