import { access, mkdir, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  DatasetAccessTier,
  DatasetDataKind,
  type Dataset,
} from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../lib/env.js";
import { HttpError } from "../../lib/httpError.js";
import {
  isNeighbourhoodId,
  type NeighbourhoodId,
} from "../../lib/neighbourhoods.js";
import { mapDatasetRow, type CatalogueDataset } from "./catalogue.data.js";

export const MAX_DATASET_BYTES = 50 * 1024 * 1024;

const ALLOWED_EXT = new Set([
  ".geojson",
  ".json",
  ".csv",
  ".gpkg",
  ".zip",
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".tif",
  ".tiff",
]);

export type DatasetValidation = {
  ok: boolean;
  format: string | null;
  checks: string[];
  errors: string[];
  preview?: unknown;
  archived?: boolean;
};

export type AdminDataset = CatalogueDataset & {
  published: boolean;
  archived: boolean;
  original_filename: string | null;
  has_file: boolean;
  validation: DatasetValidation | null;
  replace_of_id: string | null;
  file_format: string | null;
};

export type DatasetUploadMetadata = {
  slug?: string;
  title: string;
  description: string;
  category: string;
  geographic_coverage: string;
  source_organization: string;
  source_url?: string | null;
  license: string;
  access_tier: "open" | "restricted" | "synthetic";
  privacy_classification: "public" | "anonymized" | "sensitive";
  quality_notes: string;
  methodology?: string | null;
  data_kind: "real" | "derived" | "synthetic" | "reference";
  observation_period?: string | null;
  related_layers?: string[];
  publish?: boolean;
  replace_of_id?: string | null;
};

function slugify(raw: string): string {
  const s = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return s || `dataset-${randomUUID().slice(0, 8)}`;
}

function extOf(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return ext;
}

function parseValidation(raw: string | null | undefined): DatasetValidation | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DatasetValidation;
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function mergeValidation(
  existing: DatasetValidation | null,
  patch: Partial<DatasetValidation>,
): DatasetValidation {
  return {
    ok: patch.ok ?? existing?.ok ?? true,
    format: patch.format ?? existing?.format ?? null,
    checks: patch.checks ?? existing?.checks ?? [],
    errors: patch.errors ?? existing?.errors ?? [],
    preview: patch.preview !== undefined ? patch.preview : existing?.preview,
    archived: patch.archived ?? existing?.archived ?? false,
  };
}

function isArchived(row: Dataset): boolean {
  return parseValidation(row.validationJson)?.archived === true;
}

export function mapAdminDataset(row: Dataset): AdminDataset {
  const validation = parseValidation(row.validationJson);
  return {
    ...mapDatasetRow(row),
    published: row.published,
    archived: validation?.archived === true,
    original_filename: row.originalFilename,
    has_file: Boolean(row.storagePath),
    validation,
    replace_of_id: row.replaceOfId,
    file_format: row.fileFormat,
  };
}

function lookLikeCoordsPair(values: string[]): boolean {
  if (values.length < 2) return false;
  const a = Number(values[0]);
  const b = Number(values[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  // Accept lon/lat or lat/lon loosely within world bounds
  return Math.abs(a) <= 180 && Math.abs(b) <= 180;
}

function walkCoords(node: unknown, found: { ok: boolean; count: number }): void {
  if (found.count > 20) return;
  if (!Array.isArray(node)) return;
  if (
    node.length >= 2 &&
    typeof node[0] === "number" &&
    typeof node[1] === "number"
  ) {
    const lon = node[0];
    const lat = node[1];
    found.count += 1;
    if (
      !Number.isFinite(lon) ||
      !Number.isFinite(lat) ||
      Math.abs(lon) > 180 ||
      Math.abs(lat) > 90
    ) {
      found.ok = false;
    }
    return;
  }
  for (const child of node) walkCoords(child, found);
}

/** Light GeoJSON / CSV validation; other formats pass with format-only check. */
export function validateDatasetBuffer(
  buf: Buffer,
  originalFilename: string,
): DatasetValidation {
  const ext = extOf(originalFilename);
  const checks: string[] = [];
  const errors: string[] = [];
  let format: string | null = ext.replace(".", "") || null;
  let preview: unknown;

  if (!ALLOWED_EXT.has(ext) && ext !== "") {
    errors.push(`Unsupported file type: ${ext || "(none)"}`);
  }

  if (ext === ".geojson" || ext === ".json") {
    format = "geojson";
    try {
      const text = buf.toString("utf8");
      const json = JSON.parse(text) as {
        type?: string;
        features?: unknown[];
        geometry?: { type?: string; coordinates?: unknown };
        coordinates?: unknown;
      };
      checks.push("Parsed as JSON");
      const type = json.type ?? "";
      if (
        type !== "FeatureCollection" &&
        type !== "Feature" &&
        type !== "Point" &&
        type !== "MultiPoint" &&
        type !== "LineString" &&
        type !== "MultiLineString" &&
        type !== "Polygon" &&
        type !== "MultiPolygon" &&
        type !== "GeometryCollection"
      ) {
        errors.push("GeoJSON root type is missing or unrecognized.");
      } else {
        checks.push(`Root type: ${type}`);
      }

      const coordProbe: { ok: boolean; count: number } = { ok: true, count: 0 };
      if (type === "FeatureCollection" && Array.isArray(json.features)) {
        checks.push(`Feature count: ${json.features.length}`);
        preview = {
          type,
          feature_count: json.features.length,
          sample_properties:
            json.features[0] &&
            typeof json.features[0] === "object" &&
            json.features[0] !== null &&
            "properties" in json.features[0]
              ? (json.features[0] as { properties: unknown }).properties
              : null,
        };
        for (const f of json.features.slice(0, 5)) {
          if (f && typeof f === "object" && "geometry" in f) {
            const g = (f as { geometry?: { coordinates?: unknown } }).geometry;
            walkCoords(g?.coordinates, coordProbe);
          }
        }
      } else if (json.geometry?.coordinates) {
        walkCoords(json.geometry.coordinates, coordProbe);
        preview = { type, geometry_type: json.geometry.type };
      } else if (json.coordinates) {
        walkCoords(json.coordinates, coordProbe);
        preview = { type };
      }

      if (coordProbe.count === 0) {
        errors.push("No coordinate arrays found in GeoJSON.");
      } else if (!coordProbe.ok) {
        errors.push("One or more coordinates are out of valid lon/lat range.");
      } else {
        checks.push(`Sampled ${coordProbe.count} coordinate pair(s)`);
      }
    } catch {
      errors.push("File is not valid JSON/GeoJSON.");
    }
  } else if (ext === ".csv") {
    format = "csv";
    const text = buf.toString("utf8");
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
      errors.push("CSV is empty.");
    } else {
      const header = lines[0]!;
      const cols = header.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      if (cols.length < 1 || cols.every((c) => !c)) {
        errors.push("CSV header row is missing.");
      } else {
        checks.push(`Header columns: ${cols.length}`);
        preview = { columns: cols.slice(0, 20), row_count_estimate: lines.length - 1 };
      }
      const lower = cols.map((c) => c.toLowerCase());
      const hasLon = lower.some((c) =>
        ["lon", "lng", "longitude", "x"].includes(c),
      );
      const hasLat = lower.some((c) => ["lat", "latitude", "y"].includes(c));
      if (hasLon && hasLat) {
        checks.push("Lon/lat-like columns present");
      } else if (lines.length > 1) {
        const sample = lines[1]!.split(",").map((c) => c.trim());
        if (lookLikeCoordsPair(sample)) {
          checks.push("First data row looks like coordinate values");
        } else {
          checks.push("No lon/lat columns detected (allowed for non-spatial CSV)");
        }
      }
    }
  } else if (ext) {
    checks.push(`Accepted as ${ext.replace(".", "")} (no deep validation)`);
  } else {
    errors.push("Filename has no extension.");
  }

  return {
    ok: errors.length === 0,
    format,
    checks,
    errors,
    preview,
    archived: false,
  };
}

async function absoluteStoragePath(storagePath: string): Promise<string> {
  const root = path.resolve(env.datasetStoragePath);
  const resolved = path.resolve(root, storagePath);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new HttpError(400, "Invalid dataset storage path.");
  }
  return resolved;
}

async function writeDatasetFile(
  neighbourhood: NeighbourhoodId,
  originalFilename: string,
  buf: Buffer,
): Promise<{ relativePath: string; absolutePath: string }> {
  const root = path.resolve(env.datasetStoragePath);
  const dir = path.join(root, neighbourhood);
  await mkdir(dir, { recursive: true });
  const safeBase = path
    .basename(originalFilename)
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(0, 120);
  const filename = `${randomUUID()}_${safeBase}`;
  const absolutePath = path.join(dir, filename);
  await writeFile(absolutePath, buf);
  const relativePath = path.join(neighbourhood, filename);
  return { relativePath, absolutePath };
}

function parseTier(raw: string): DatasetAccessTier {
  if (raw === "restricted") return DatasetAccessTier.restricted;
  if (raw === "synthetic") return DatasetAccessTier.synthetic;
  return DatasetAccessTier.open;
}

function parseKind(raw: string): DatasetDataKind {
  if (raw === "derived") return DatasetDataKind.derived;
  if (raw === "synthetic") return DatasetDataKind.synthetic;
  if (raw === "reference") return DatasetDataKind.reference;
  return DatasetDataKind.real;
}

export async function listAdminDatasets(
  neighbourhood?: NeighbourhoodId,
): Promise<AdminDataset[]> {
  const rows = await prisma.dataset.findMany({
    where: neighbourhood ? { neighbourhoodId: neighbourhood } : undefined,
    orderBy: [{ neighbourhoodId: "asc" }, { category: "asc" }, { title: "asc" }],
  });
  return rows.map(mapAdminDataset);
}

export async function saveUploadedDataset(
  buf: Buffer,
  originalFilename: string,
  neighbourhood: NeighbourhoodId,
  metadata: DatasetUploadMetadata,
): Promise<AdminDataset> {
  if (!isNeighbourhoodId(neighbourhood)) {
    throw new HttpError(400, "Unknown neighbourhood.");
  }
  if (!buf?.length) {
    throw new HttpError(400, "Attach a dataset file.");
  }
  if (buf.length > MAX_DATASET_BYTES) {
    throw new HttpError(400, "Dataset must be 50 MB or smaller.");
  }

  const validation = validateDatasetBuffer(buf, originalFilename);
  if (!validation.ok) {
    throw new HttpError(
      400,
      validation.errors[0] ?? "Dataset failed validation.",
    );
  }

  const { relativePath } = await writeDatasetFile(
    neighbourhood,
    originalFilename,
    buf,
  );

  let slug = slugify(metadata.slug?.trim() || metadata.title);
  const existing = await prisma.dataset.findUnique({
    where: {
      neighbourhoodId_slug: { neighbourhoodId: neighbourhood, slug },
    },
  });
  if (existing && !metadata.replace_of_id) {
    slug = `${slug}-${randomUUID().slice(0, 6)}`;
  }

  const replaceOfId = metadata.replace_of_id?.trim() || null;
  if (replaceOfId) {
    const prior = await prisma.dataset.findUnique({ where: { id: replaceOfId } });
    if (!prior || prior.neighbourhoodId !== neighbourhood) {
      throw new HttpError(400, "replace_of_id must reference a dataset in this neighbourhood.");
    }
  }

  const publish = Boolean(metadata.publish);
  const row = await prisma.dataset.create({
    data: {
      neighbourhoodId: neighbourhood,
      slug,
      title: metadata.title.trim(),
      description: metadata.description.trim(),
      category: metadata.category.trim() || "uncategorized",
      geographicCoverage: metadata.geographic_coverage.trim() || neighbourhood,
      sourceOrganization: metadata.source_organization.trim() || "UrbanMesh",
      sourceUrl: metadata.source_url?.trim() || null,
      publishedAt: publish ? new Date() : null,
      acquiredAt: new Date(),
      observationPeriod: metadata.observation_period?.trim() || null,
      lastUpdated: new Date(),
      fileFormat: validation.format,
      license: metadata.license.trim() || "TBD",
      accessTier: parseTier(metadata.access_tier),
      privacyClassification: metadata.privacy_classification || "public",
      qualityNotes: metadata.quality_notes.trim() || "Uploaded via admin.",
      methodology: metadata.methodology?.trim() || null,
      downloadAvailable: true,
      dataKind: parseKind(metadata.data_kind),
      published: publish,
      storagePath: relativePath,
      originalFilename: path.basename(originalFilename),
      validationJson: JSON.stringify(validation),
      relatedLayersJson: JSON.stringify(metadata.related_layers ?? []),
      replaceOfId,
    },
  });

  if (replaceOfId) {
    await archiveDataset(replaceOfId, "admin");
  }

  await prisma.adminAuditLog.create({
    data: {
      action: replaceOfId ? "dataset_replace" : "dataset_upload",
      actor: "admin",
      reason: row.title,
      afterJson: JSON.stringify({
        id: row.id,
        slug: row.slug,
        neighbourhood_id: row.neighbourhoodId,
        access_tier: row.accessTier,
        replace_of_id: replaceOfId,
      }),
    },
  });

  return mapAdminDataset(row);
}

export async function updateDatasetMetadata(
  id: string,
  patch: {
    title?: string;
    description?: string;
    category?: string;
    geographic_coverage?: string;
    source_organization?: string;
    source_url?: string | null;
    license?: string;
    access_tier?: "open" | "restricted" | "synthetic";
    privacy_classification?: "public" | "anonymized" | "sensitive";
    quality_notes?: string;
    methodology?: string | null;
    observation_period?: string | null;
    data_kind?: "real" | "derived" | "synthetic" | "reference";
    related_layers?: string[];
    download_available?: boolean;
    published?: boolean;
  },
  actor = "admin",
): Promise<AdminDataset> {
  const existing = await prisma.dataset.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Dataset not found.");

  const data: Record<string, unknown> = { lastUpdated: new Date() };
  if (patch.title !== undefined) data.title = patch.title.trim();
  if (patch.description !== undefined) data.description = patch.description.trim();
  if (patch.category !== undefined) data.category = patch.category.trim();
  if (patch.geographic_coverage !== undefined) {
    data.geographicCoverage = patch.geographic_coverage.trim();
  }
  if (patch.source_organization !== undefined) {
    data.sourceOrganization = patch.source_organization.trim();
  }
  if (patch.source_url !== undefined) {
    data.sourceUrl = patch.source_url?.trim() || null;
  }
  if (patch.license !== undefined) data.license = patch.license.trim();
  if (patch.access_tier !== undefined) {
    data.accessTier = parseTier(patch.access_tier);
  }
  if (patch.privacy_classification !== undefined) {
    data.privacyClassification = patch.privacy_classification;
  }
  if (patch.quality_notes !== undefined) {
    data.qualityNotes = patch.quality_notes.trim();
  }
  if (patch.methodology !== undefined) {
    data.methodology = patch.methodology?.trim() || null;
  }
  if (patch.observation_period !== undefined) {
    data.observationPeriod = patch.observation_period?.trim() || null;
  }
  if (patch.data_kind !== undefined) data.dataKind = parseKind(patch.data_kind);
  if (patch.related_layers !== undefined) {
    data.relatedLayersJson = JSON.stringify(patch.related_layers);
  }
  if (patch.download_available !== undefined) {
    data.downloadAvailable = patch.download_available;
  }
  if (patch.published !== undefined) {
    data.published = patch.published;
    if (patch.published && !existing.publishedAt) {
      data.publishedAt = new Date();
    }
  }

  const tierChanged =
    patch.access_tier !== undefined &&
    parseTier(patch.access_tier) !== existing.accessTier;

  const row = await prisma.dataset.update({ where: { id }, data });

  if (tierChanged) {
    await prisma.dataAccessLog.create({
      data: {
        datasetId: id,
        actor,
        action: `tier_change:${existing.accessTier}->${row.accessTier}`,
      },
    });
  }

  await prisma.adminAuditLog.create({
    data: {
      action: "dataset_update",
      actor,
      reason: row.title,
      beforeJson: JSON.stringify({
        access_tier: existing.accessTier,
        license: existing.license,
        published: existing.published,
        privacy: existing.privacyClassification,
      }),
      afterJson: JSON.stringify({
        access_tier: row.accessTier,
        license: row.license,
        published: row.published,
        privacy: row.privacyClassification,
      }),
    },
  });

  return mapAdminDataset(row);
}

export async function publishDataset(
  id: string,
  actor = "admin",
): Promise<AdminDataset> {
  const existing = await prisma.dataset.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Dataset not found.");
  if (isArchived(existing)) {
    throw new HttpError(400, "Restore the dataset before publishing.");
  }
  const validation = mergeValidation(parseValidation(existing.validationJson), {
    archived: false,
  });
  const row = await prisma.dataset.update({
    where: { id },
    data: {
      published: true,
      publishedAt: existing.publishedAt ?? new Date(),
      lastUpdated: new Date(),
      validationJson: JSON.stringify(validation),
    },
  });
  await prisma.adminAuditLog.create({
    data: {
      action: "dataset_publish",
      actor,
      reason: row.title,
      afterJson: JSON.stringify({ id: row.id, published: true }),
    },
  });
  return mapAdminDataset(row);
}

export async function unpublishDataset(
  id: string,
  actor = "admin",
): Promise<AdminDataset> {
  const existing = await prisma.dataset.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Dataset not found.");
  const row = await prisma.dataset.update({
    where: { id },
    data: { published: false, lastUpdated: new Date() },
  });
  await prisma.adminAuditLog.create({
    data: {
      action: "dataset_unpublish",
      actor,
      reason: row.title,
      afterJson: JSON.stringify({ id: row.id, published: false }),
    },
  });
  return mapAdminDataset(row);
}

export async function archiveDataset(
  id: string,
  actor = "admin",
): Promise<AdminDataset> {
  const existing = await prisma.dataset.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Dataset not found.");
  const validation = mergeValidation(parseValidation(existing.validationJson), {
    archived: true,
  });
  const row = await prisma.dataset.update({
    where: { id },
    data: {
      published: false,
      downloadAvailable: false,
      lastUpdated: new Date(),
      validationJson: JSON.stringify(validation),
    },
  });
  await prisma.adminAuditLog.create({
    data: {
      action: "dataset_archive",
      actor,
      reason: row.title,
      afterJson: JSON.stringify({ id: row.id, archived: true }),
    },
  });
  return mapAdminDataset(row);
}

export async function restoreDataset(
  id: string,
  actor = "admin",
): Promise<AdminDataset> {
  const existing = await prisma.dataset.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Dataset not found.");
  const validation = mergeValidation(parseValidation(existing.validationJson), {
    archived: false,
  });
  const row = await prisma.dataset.update({
    where: { id },
    data: {
      downloadAvailable: Boolean(existing.storagePath),
      lastUpdated: new Date(),
      validationJson: JSON.stringify(validation),
      // Leave unpublished until explicit publish
      published: false,
    },
  });
  await prisma.adminAuditLog.create({
    data: {
      action: "dataset_restore",
      actor,
      reason: row.title,
      afterJson: JSON.stringify({ id: row.id, archived: false, published: false }),
    },
  });
  return mapAdminDataset(row);
}

/**
 * Replace an existing dataset with a new uploaded file/version.
 * Keeps the original file on disk; archives the prior row.
 */
export async function replaceDatasetVersion(
  replaceOfId: string,
  buf: Buffer,
  originalFilename: string,
  metadata: Omit<DatasetUploadMetadata, "replace_of_id">,
): Promise<AdminDataset> {
  const prior = await prisma.dataset.findUnique({ where: { id: replaceOfId } });
  if (!prior) throw new HttpError(404, "Dataset to replace not found.");
  return saveUploadedDataset(buf, originalFilename, prior.neighbourhoodId, {
    ...metadata,
    slug: metadata.slug || `${prior.slug}-v${Date.now().toString(36)}`,
    title: metadata.title || prior.title,
    description: metadata.description || prior.description,
    category: metadata.category || prior.category,
    geographic_coverage:
      metadata.geographic_coverage || prior.geographicCoverage,
    source_organization:
      metadata.source_organization || prior.sourceOrganization,
    source_url:
      metadata.source_url !== undefined ? metadata.source_url : prior.sourceUrl,
    license: metadata.license || prior.license,
    access_tier: metadata.access_tier || prior.accessTier,
    privacy_classification:
      metadata.privacy_classification ||
      (prior.privacyClassification as "public" | "anonymized" | "sensitive"),
    quality_notes: metadata.quality_notes || prior.qualityNotes,
    methodology:
      metadata.methodology !== undefined
        ? metadata.methodology
        : prior.methodology,
    data_kind: metadata.data_kind || prior.dataKind,
    observation_period:
      metadata.observation_period !== undefined
        ? metadata.observation_period
        : prior.observationPeriod,
    replace_of_id: replaceOfId,
    publish: metadata.publish ?? false,
  });
}

/**
 * Resolve a stored dataset file for admin download.
 * Always writes DataAccessLog when access_tier is restricted.
 * Open/synthetic downloads may also be logged with action download_open.
 */
export async function downloadRestricted(
  id: string,
  actor = "admin",
): Promise<{
  absolutePath: string;
  filename: string;
  mime: string;
  accessTier: DatasetAccessTier;
}> {
  const row = await prisma.dataset.findUnique({ where: { id } });
  if (!row) throw new HttpError(404, "Dataset not found.");
  if (!row.storagePath) {
    throw new HttpError(404, "No file is stored for this dataset.");
  }
  if (isArchived(row)) {
    throw new HttpError(410, "This dataset version is archived.");
  }

  const absolutePath = await absoluteStoragePath(row.storagePath);
  try {
    await access(absolutePath, constants.R_OK);
  } catch {
    throw new HttpError(404, "Dataset file is missing on disk.");
  }

  const action =
    row.accessTier === DatasetAccessTier.restricted
      ? "download_restricted"
      : "download_open";

  // Always audit restricted; also record open downloads for admin trail.
  if (
    row.accessTier === DatasetAccessTier.restricted ||
    row.accessTier === DatasetAccessTier.open ||
    row.accessTier === DatasetAccessTier.synthetic
  ) {
    await prisma.dataAccessLog.create({
      data: { datasetId: id, actor, action },
    });
  }

  const filename =
    row.originalFilename || path.basename(row.storagePath) || "dataset";
  const ext = extOf(filename);
  const mime =
    ext === ".geojson" || ext === ".json"
      ? "application/geo+json"
      : ext === ".csv"
        ? "text/csv"
        : ext === ".pdf"
          ? "application/pdf"
          : ext === ".zip"
            ? "application/zip"
            : "application/octet-stream";

  return { absolutePath, filename, mime, accessTier: row.accessTier };
}

export async function getDataQualityCounts(): Promise<{
  generated_at: string;
  datasets: {
    total: number;
    by_category: { category: string; count: number }[];
    by_tier: { tier: string; count: number }[];
    missing_metadata: number;
    unpublished: number;
    archived: number;
    with_file: number;
    synthetic: number;
  };
  concerns: {
    awaiting_review: number;
    accepted: number;
    rejected: number;
    archived: number;
    synthetic: number;
  };
  packs: {
    total: number;
    by_status: { status: string; count: number }[];
    versions: { neighbourhood_id: string; version: string; status: string }[];
  };
  layers: {
    total: number;
    published: number;
    stale_or_never_refreshed: number;
    by_neighbourhood: {
      neighbourhood_id: string;
      count: number;
      refreshed_at_latest: string | null;
    }[];
  };
}> {
  const [
    datasets,
    concerns,
    packs,
    layers,
  ] = await Promise.all([
    prisma.dataset.findMany(),
    prisma.concern.findMany({
      select: { reviewStatus: true, synthetic: true },
    }),
    prisma.dataPack.findMany({
      select: {
        neighbourhoodId: true,
        version: true,
        status: true,
      },
      orderBy: [{ neighbourhoodId: "asc" }, { version: "asc" }],
    }),
    prisma.mapLayer.findMany({
      select: {
        neighbourhoodId: true,
        published: true,
        refreshedAt: true,
      },
    }),
  ]);

  const byCategory = new Map<string, number>();
  const byTier = new Map<string, number>();
  let missingMetadata = 0;
  let unpublished = 0;
  let archived = 0;
  let withFile = 0;
  let syntheticDatasets = 0;

  for (const d of datasets) {
    byCategory.set(d.category, (byCategory.get(d.category) ?? 0) + 1);
    byTier.set(d.accessTier, (byTier.get(d.accessTier) ?? 0) + 1);
    if (!d.published) unpublished += 1;
    if (isArchived(d)) archived += 1;
    if (d.storagePath) withFile += 1;
    if (d.accessTier === "synthetic" || d.dataKind === "synthetic") {
      syntheticDatasets += 1;
    }
    const missing =
      !d.title?.trim() ||
      !d.description?.trim() ||
      !d.license?.trim() ||
      !d.sourceOrganization?.trim() ||
      !d.qualityNotes?.trim() ||
      d.license.toLowerCase().startsWith("tbd");
    if (missing) missingMetadata += 1;
  }

  const concernCounts = {
    awaiting_review: 0,
    accepted: 0,
    rejected: 0,
    archived: 0,
    synthetic: 0,
  };
  for (const c of concerns) {
    if (c.reviewStatus === "under_review") concernCounts.awaiting_review += 1;
    if (c.reviewStatus === "accepted") concernCounts.accepted += 1;
    if (c.reviewStatus === "rejected") concernCounts.rejected += 1;
    if (c.reviewStatus === "archived") concernCounts.archived += 1;
    if (c.synthetic) concernCounts.synthetic += 1;
  }

  const packByStatus = new Map<string, number>();
  for (const p of packs) {
    packByStatus.set(p.status, (packByStatus.get(p.status) ?? 0) + 1);
  }

  const layerByNh = new Map<
    string,
    { count: number; latest: Date | null; published: number }
  >();
  let publishedLayers = 0;
  let stale = 0;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  for (const l of layers) {
    if (l.published) publishedLayers += 1;
    if (!l.refreshedAt || l.refreshedAt.getTime() < thirtyDaysAgo) stale += 1;
    const cur = layerByNh.get(l.neighbourhoodId) ?? {
      count: 0,
      latest: null as Date | null,
      published: 0,
    };
    cur.count += 1;
    if (l.published) cur.published += 1;
    if (l.refreshedAt && (!cur.latest || l.refreshedAt > cur.latest)) {
      cur.latest = l.refreshedAt;
    }
    layerByNh.set(l.neighbourhoodId, cur);
  }

  return {
    generated_at: new Date().toISOString(),
    datasets: {
      total: datasets.length,
      by_category: [...byCategory.entries()]
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
      by_tier: [...byTier.entries()]
        .map(([tier, count]) => ({ tier, count }))
        .sort((a, b) => b.count - a.count),
      missing_metadata: missingMetadata,
      unpublished,
      archived,
      with_file: withFile,
      synthetic: syntheticDatasets,
    },
    concerns: concernCounts,
    packs: {
      total: packs.length,
      by_status: [...packByStatus.entries()].map(([status, count]) => ({
        status,
        count,
      })),
      versions: packs.map((p) => ({
        neighbourhood_id: p.neighbourhoodId,
        version: p.version,
        status: p.status,
      })),
    },
    layers: {
      total: layers.length,
      published: publishedLayers,
      stale_or_never_refreshed: stale,
      by_neighbourhood: [...layerByNh.entries()].map(
        ([neighbourhood_id, v]) => ({
          neighbourhood_id,
          count: v.count,
          refreshed_at_latest: v.latest ? v.latest.toISOString() : null,
        }),
      ),
    },
  };
}
