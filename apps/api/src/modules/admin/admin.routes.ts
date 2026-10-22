import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import multer from "multer";
import { asyncHandler, HttpError, isUuid } from "../../lib/httpError.js";
import { env } from "../../lib/env.js";
import { isNeighbourhoodId } from "../../lib/neighbourhoods.js";
import { setBoundaryFromGeoJson } from "../catalogue/boundary.service.js";
import {
  archiveDataset,
  downloadRestricted,
  getDataQualityCounts,
  listAdminDatasets,
  MAX_DATASET_BYTES,
  publishDataset,
  restoreDataset,
  saveUploadedDataset,
  unpublishDataset,
  updateDatasetMetadata,
  type DatasetUploadMetadata,
} from "../catalogue/datasets.service.js";
import { refreshOsmLayers } from "../catalogue/layers.service.js";
import {
  applyConcernAction,
  isConcernAdminAction,
  listAdminConcerns,
  REVIEW_STATUSES,
  type ConcernReviewStatusValue,
} from "../concerns/concerns.service.js";
import { adminRateLimit, requireAdmin } from "./adminAuth.js";
import { DISPROVE_REASONS } from "./disproveReasons.js";
import {
  applyAdminAction,
  getAdminAnalytics,
  getAdminReportDetail,
  getDashboardStats,
  listAdminReports,
  listAuditForIncident,
  listGlobalAudit,
  type AdminAction,
  type ReviewStatus,
} from "./admin.service.js";

export const adminRouter = Router();

adminRouter.use(adminRateLimit);
adminRouter.use(requireAdmin);

const datasetUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DATASET_BYTES, files: 1 },
});

const boundaryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

function multerSingle(
  upload: ReturnType<typeof multer>,
  field: string,
  sizeMessage: string,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    upload.single(field)(req, res, (err: unknown) => {
      if (!err) {
        next();
        return;
      }
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({ error: sizeMessage });
        return;
      }
      res.status(400).json({ error: "The upload could not be read." });
    });
  };
}

function strField(
  body: Record<string, unknown>,
  key: string,
): string | undefined {
  const v = body[key];
  return typeof v === "string" ? v : undefined;
}

function boolField(raw: unknown): boolean | undefined {
  if (raw === true || raw === "true" || raw === "1") return true;
  if (raw === false || raw === "false" || raw === "0") return false;
  return undefined;
}

function metadataFromBody(
  body: Record<string, unknown>,
): DatasetUploadMetadata {
  const relatedRaw = strField(body, "related_layers");
  let related_layers: string[] | undefined;
  if (relatedRaw) {
    try {
      const parsed = JSON.parse(relatedRaw) as unknown;
      if (Array.isArray(parsed)) {
        related_layers = parsed.filter(
          (x): x is string => typeof x === "string",
        );
      }
    } catch {
      related_layers = relatedRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  const tier = strField(body, "access_tier") ?? "open";
  const privacy = strField(body, "privacy_classification") ?? "public";
  const kind = strField(body, "data_kind") ?? "real";

  return {
    slug: strField(body, "slug"),
    title: strField(body, "title") ?? "",
    description: strField(body, "description") ?? "",
    category: strField(body, "category") ?? "uncategorized",
    geographic_coverage: strField(body, "geographic_coverage") ?? "",
    source_organization: strField(body, "source_organization") ?? "",
    source_url: strField(body, "source_url") ?? null,
    license: strField(body, "license") ?? "TBD",
    access_tier:
      tier === "restricted" || tier === "synthetic" || tier === "open"
        ? tier
        : "open",
    privacy_classification:
      privacy === "anonymized" ||
      privacy === "sensitive" ||
      privacy === "public"
        ? privacy
        : "public",
    quality_notes: strField(body, "quality_notes") ?? "",
    methodology: strField(body, "methodology") ?? null,
    data_kind:
      kind === "derived" ||
      kind === "synthetic" ||
      kind === "reference" ||
      kind === "real"
        ? kind
        : "real",
    observation_period: strField(body, "observation_period") ?? null,
    related_layers,
    publish: boolField(body.publish) ?? false,
    replace_of_id: strField(body, "replace_of_id") ?? null,
  };
}

adminRouter.get(
  "/session",
  asyncHandler(async (_req, res) => {
    res.json({
      ok: true,
      role: "admin",
      rules: {
        cluster_threshold: env.clusterThreshold,
        cluster_radius_meters: env.clusterRadiusMeters,
        note: "Community-supported (spatial) is not field-verified. Disproved and archived reports are excluded from public maps and corroboration.",
      },
      disprove_reasons: DISPROVE_REASONS,
    });
  }),
);

adminRouter.get(
  "/dashboard",
  asyncHandler(async (_req, res) => {
    res.json(await getDashboardStats());
  }),
);

adminRouter.get(
  "/analytics",
  asyncHandler(async (_req, res) => {
    res.json(await getAdminAnalytics());
  }),
);

adminRouter.get(
  "/audit",
  asyncHandler(async (req, res) => {
    const limit = Number(req.query.limit ?? 100);
    const audit = await listGlobalAudit(Number.isFinite(limit) ? limit : 100);
    res.json({ count: audit.length, audit });
  }),
);

adminRouter.get(
  "/disprove-reasons",
  asyncHandler(async (_req, res) => {
    res.json({ reasons: DISPROVE_REASONS });
  }),
);

adminRouter.get(
  "/reports",
  asyncHandler(async (req, res) => {
    const reviewRaw = String(req.query.review ?? "queue").toLowerCase();
    const allowed = [
      "queue",
      "all",
      "pending",
      "approved",
      "rejected",
      "flagged",
      "resolved",
      "archived",
      "disproved",
      "under_review",
    ] as const;
    const review = (allowed as readonly string[]).includes(reviewRaw)
      ? (reviewRaw as ReviewStatus | "all" | "queue")
      : "queue";
    const limit = Number(req.query.limit ?? 100);
    const offset = Number(req.query.offset ?? 0);
    const sortRaw = String(req.query.sort ?? "created_desc");
    const sort =
      sortRaw === "created_asc" || sortRaw === "updated_desc"
        ? sortRaw
        : "created_desc";
    const fieldRaw = String(req.query.field ?? "any");
    const field =
      fieldRaw === "verified" || fieldRaw === "unverified" ? fieldRaw : "any";
    const communityRaw = String(req.query.community ?? "any");
    const community =
      communityRaw === "supported" || communityRaw === "pending"
        ? communityRaw
        : "any";

    const result = await listAdminReports({
      review,
      category: typeof req.query.category === "string" ? req.query.category : undefined,
      q: typeof req.query.q === "string" ? req.query.q : undefined,
      field,
      community,
      sort,
      limit: Number.isFinite(limit) ? limit : 100,
      offset: Number.isFinite(offset) ? offset : 0,
    });
    res.json(result);
  }),
);

adminRouter.get(
  "/reports/:id",
  asyncHandler(async (req, res) => {
    res.json(await getAdminReportDetail(req.params.id));
  }),
);

adminRouter.get(
  "/reports/:id/audit",
  asyncHandler(async (req, res) => {
    const audit = await listAuditForIncident(req.params.id);
    res.json({ count: audit.length, audit });
  }),
);

const ACTIONS: AdminAction[] = [
  "approve_field",
  "disprove",
  "reject",
  "flag",
  "under_review",
  "resolve",
  "reopen",
  "archive",
  "delete",
  "restore",
  "merge_duplicate",
  "reset_queue",
  "edit_category",
];

adminRouter.post(
  "/reports/:id/actions/:action",
  asyncHandler(async (req, res) => {
    const action = req.params.action as AdminAction;
    if (!ACTIONS.includes(action)) {
      throw new HttpError(400, "Unknown admin action.");
    }
    const incident = await applyAdminAction(req.params.id, action, {
      reason: typeof req.body?.reason === "string" ? req.body.reason : undefined,
      note: typeof req.body?.note === "string" ? req.body.note : undefined,
      reasonCode:
        typeof req.body?.reason_code === "string"
          ? req.body.reason_code
          : undefined,
      category:
        typeof req.body?.category === "string" ? req.body.category : undefined,
      duplicateOfId:
        typeof req.body?.duplicate_of_id === "string"
          ? req.body.duplicate_of_id
          : undefined,
    });
    res.json({ ok: true, action, incident });
  }),
);

/** Back-compat aliases */
adminRouter.post(
  "/reports/:id/approve",
  asyncHandler(async (req, res) => {
    const incident = await applyAdminAction(req.params.id, "approve_field", {
      note: typeof req.body?.note === "string" ? req.body.note : undefined,
    });
    res.json({ ok: true, action: "approved", incident });
  }),
);

adminRouter.post(
  "/reports/:id/reject",
  asyncHandler(async (req, res) => {
    const incident = await applyAdminAction(req.params.id, "disprove", {
      reasonCode:
        typeof req.body?.reason_code === "string"
          ? req.body.reason_code
          : "other",
      note:
        typeof req.body?.note === "string"
          ? req.body.note
          : typeof req.body?.reason === "string"
            ? req.body.reason
            : "Disproved via legacy endpoint",
    });
    res.json({ ok: true, action: "disproved", incident });
  }),
);

adminRouter.post(
  "/reports/:id/reset",
  asyncHandler(async (req, res) => {
    const incident = await applyAdminAction(req.params.id, "reset_queue", {});
    res.json({ ok: true, action: "reset", incident });
  }),
);

adminRouter.get(
  "/concerns",
  asyncHandler(async (req, res) => {
    const statusRaw = String(req.query.status ?? "under_review").toLowerCase();
    const allowed = ["all", "queue", ...REVIEW_STATUSES] as const;
    const status = (allowed as readonly string[]).includes(statusRaw)
      ? (statusRaw as ConcernReviewStatusValue | "all" | "queue")
      : "under_review";
    const limit = Number(req.query.limit ?? 100);
    const offset = Number(req.query.offset ?? 0);
    const neighbourhoodRaw = req.query.neighbourhood;
    if (
      typeof neighbourhoodRaw === "string" &&
      neighbourhoodRaw.length > 0 &&
      !isNeighbourhoodId(neighbourhoodRaw)
    ) {
      throw new HttpError(400, "Unknown neighbourhood.");
    }

    const result = await listAdminConcerns({
      status,
      neighbourhood: isNeighbourhoodId(neighbourhoodRaw)
        ? neighbourhoodRaw
        : undefined,
      q: typeof req.query.q === "string" ? req.query.q : undefined,
      limit: Number.isFinite(limit) ? limit : 100,
      offset: Number.isFinite(offset) ? offset : 0,
    });
    res.json(result);
  }),
);

adminRouter.post(
  "/concerns/:id/action",
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) {
      throw new HttpError(404, "This concern is not on UrbanMesh.");
    }
    const action = req.body?.action;
    if (!isConcernAdminAction(action)) {
      throw new HttpError(
        400,
        "Action must be accept_for_publication, reject, archive, or under_review.",
      );
    }
    const concern = await applyConcernAction(req.params.id, action, {
      reason: typeof req.body?.reason === "string" ? req.body.reason : undefined,
    });
    res.json({ ok: true, action, concern });
  }),
);

adminRouter.get(
  "/datasets",
  asyncHandler(async (req, res) => {
    const neighbourhoodRaw = req.query.neighbourhood;
    if (
      typeof neighbourhoodRaw === "string" &&
      neighbourhoodRaw.length > 0 &&
      !isNeighbourhoodId(neighbourhoodRaw)
    ) {
      throw new HttpError(400, "Unknown neighbourhood.");
    }
    const datasets = await listAdminDatasets(
      isNeighbourhoodId(neighbourhoodRaw) ? neighbourhoodRaw : undefined,
    );
    res.json({ count: datasets.length, datasets });
  }),
);

adminRouter.post(
  "/datasets",
  multerSingle(datasetUpload, "file", "Dataset must be 50 MB or smaller."),
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const neighbourhoodRaw =
      strField(body, "neighbourhood") ?? strField(body, "neighbourhood_id");
    if (!isNeighbourhoodId(neighbourhoodRaw)) {
      throw new HttpError(400, "neighbourhood is required (kilimani|kileleshwa).");
    }
    const file = req.file;
    if (!file?.buffer?.length) {
      throw new HttpError(400, "Attach a dataset file (field name: file).");
    }
    const meta = metadataFromBody(body);
    if (!meta.title.trim()) {
      throw new HttpError(400, "title is required.");
    }
    const dataset = await saveUploadedDataset(
      file.buffer,
      file.originalname || "upload.bin",
      neighbourhoodRaw,
      meta,
    );
    res.status(201).json({ ok: true, dataset });
  }),
);

adminRouter.patch(
  "/datasets/:id",
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) {
      throw new HttpError(404, "Dataset not found.");
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const tier = strField(body, "access_tier");
    const privacy = strField(body, "privacy_classification");
    const kind = strField(body, "data_kind");
    let related_layers: string[] | undefined;
    if (Array.isArray(body.related_layers)) {
      related_layers = body.related_layers.filter(
        (x): x is string => typeof x === "string",
      );
    } else if (typeof body.related_layers === "string") {
      try {
        const parsed = JSON.parse(body.related_layers) as unknown;
        if (Array.isArray(parsed)) {
          related_layers = parsed.filter(
            (x): x is string => typeof x === "string",
          );
        }
      } catch {
        related_layers = body.related_layers
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }

    const dataset = await updateDatasetMetadata(req.params.id, {
      title: strField(body, "title"),
      description: strField(body, "description"),
      category: strField(body, "category"),
      geographic_coverage: strField(body, "geographic_coverage"),
      source_organization: strField(body, "source_organization"),
      source_url:
        body.source_url === null
          ? null
          : strField(body, "source_url"),
      license: strField(body, "license"),
      access_tier:
        tier === "open" || tier === "restricted" || tier === "synthetic"
          ? tier
          : undefined,
      privacy_classification:
        privacy === "public" ||
        privacy === "anonymized" ||
        privacy === "sensitive"
          ? privacy
          : undefined,
      quality_notes: strField(body, "quality_notes"),
      methodology:
        body.methodology === null
          ? null
          : strField(body, "methodology"),
      observation_period:
        body.observation_period === null
          ? null
          : strField(body, "observation_period"),
      data_kind:
        kind === "real" ||
        kind === "derived" ||
        kind === "synthetic" ||
        kind === "reference"
          ? kind
          : undefined,
      related_layers,
      download_available: boolField(body.download_available),
      published: boolField(body.published),
    });
    res.json({ ok: true, dataset });
  }),
);

adminRouter.post(
  "/datasets/:id/publish",
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) {
      throw new HttpError(404, "Dataset not found.");
    }
    const dataset = await publishDataset(req.params.id);
    res.json({ ok: true, dataset });
  }),
);

adminRouter.post(
  "/datasets/:id/unpublish",
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) {
      throw new HttpError(404, "Dataset not found.");
    }
    const dataset = await unpublishDataset(req.params.id);
    res.json({ ok: true, dataset });
  }),
);

adminRouter.post(
  "/datasets/:id/archive",
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) {
      throw new HttpError(404, "Dataset not found.");
    }
    const dataset = await archiveDataset(req.params.id);
    res.json({ ok: true, dataset });
  }),
);

adminRouter.post(
  "/datasets/:id/restore",
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) {
      throw new HttpError(404, "Dataset not found.");
    }
    const dataset = await restoreDataset(req.params.id);
    res.json({ ok: true, dataset });
  }),
);

adminRouter.get(
  "/datasets/:id/download",
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) {
      throw new HttpError(404, "Dataset not found.");
    }
    const file = await downloadRestricted(req.params.id, "admin");
    res.setHeader("Content-Type", file.mime);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.filename.replace(/"/g, "")}"`,
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");
    res.sendFile(file.absolutePath);
  }),
);

adminRouter.post(
  "/neighbourhoods/:id/boundary",
  multerSingle(
    boundaryUpload,
    "file",
    "Boundary GeoJSON must be 10 MB or smaller.",
  ),
  asyncHandler(async (req, res) => {
    if (!isNeighbourhoodId(req.params.id)) {
      throw new HttpError(404, "Unknown neighbourhood.");
    }
    const file = req.file;
    if (!file?.buffer?.length) {
      throw new HttpError(400, "Attach a GeoJSON file (field name: file).");
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    let parsed: unknown;
    try {
      parsed = JSON.parse(file.buffer.toString("utf8"));
    } catch {
      throw new HttpError(400, "Boundary file is not valid JSON.");
    }

    type Geom = {
      type: string;
      coordinates?: unknown;
      geometry?: { type: string; coordinates?: unknown };
      features?: Array<{ geometry?: { type: string; coordinates?: unknown } }>;
    };
    const obj = parsed as Geom;
    let geometry: { type: string; coordinates?: unknown } | null = null;
    if (obj.type === "FeatureCollection" && Array.isArray(obj.features)) {
      const g = obj.features[0]?.geometry;
      if (g) geometry = g;
    } else if (obj.type === "Feature" && obj.geometry) {
      geometry = obj.geometry;
    } else if (obj.type === "Polygon" || obj.type === "MultiPolygon") {
      geometry = obj;
    }
    if (
      !geometry ||
      (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")
    ) {
      throw new HttpError(
        400,
        "Boundary must be a Polygon or MultiPolygon GeoJSON.",
      );
    }

    const statusRaw = strField(body, "status") ?? "provisional_osm";
    const status =
      statusRaw === "authoritative" ? "authoritative" : "provisional_osm";
    const source =
      strField(body, "source") ??
      (status === "authoritative"
        ? "Admin-uploaded authoritative boundary"
        : "Admin-uploaded OSM / provisional boundary");
    const version =
      strField(body, "version") ?? new Date().toISOString().slice(0, 10);
    const note = strField(body, "note");

    await setBoundaryFromGeoJson(
      req.params.id,
      geometry as {
        type: "Polygon" | "MultiPolygon";
        coordinates: unknown;
      },
      { status, source, version, note },
    );

    res.json({
      ok: true,
      neighbourhood_id: req.params.id,
      status,
      source,
      version,
    });
  }),
);

adminRouter.post(
  "/neighbourhoods/:id/layers/refresh",
  asyncHandler(async (req, res) => {
    if (!isNeighbourhoodId(req.params.id)) {
      throw new HttpError(404, "Unknown neighbourhood.");
    }
    try {
      const result = await refreshOsmLayers(req.params.id);
      res.json({ ok: true, neighbourhood_id: req.params.id, ...result });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Layer refresh failed.";
      throw new HttpError(400, message);
    }
  }),
);

adminRouter.get(
  "/data-quality",
  asyncHandler(async (_req, res) => {
    res.json(await getDataQualityCounts());
  }),
);

adminRouter.post(
  "/data-packs",
  asyncHandler(async (req, res) => {
    const neighbourhoodId = String(req.body?.neighbourhood_id ?? "");
    if (!isNeighbourhoodId(neighbourhoodId)) {
      throw new HttpError(400, "neighbourhood_id must be kilimani or kileleshwa.");
    }
    const version = String(req.body?.version ?? "").trim();
    const title = String(req.body?.title ?? "").trim();
    if (!version || !title) {
      throw new HttpError(400, "version and title are required.");
    }
    const datasetIds = Array.isArray(req.body?.dataset_ids)
      ? req.body.dataset_ids.filter((x: unknown): x is string => typeof x === "string")
      : [];
    const layerKeys = Array.isArray(req.body?.layer_keys)
      ? req.body.layer_keys.filter((x: unknown): x is string => typeof x === "string")
      : [];
    const { publishDataPackVersion } = await import(
      "../catalogue/planning.service.js"
    );
    const pack = await publishDataPackVersion({
      neighbourhoodId,
      version,
      title,
      datasetIds,
      layerKeys,
      methodology:
        typeof req.body?.methodology === "string"
          ? req.body.methodology
          : undefined,
      summary:
        typeof req.body?.summary === "string" ? req.body.summary : undefined,
      actor: "admin",
    });
    res.status(201).json({
      ok: true,
      pack: {
        id: pack.id,
        neighbourhood_id: pack.neighbourhoodId,
        version: pack.version,
        title: pack.title,
        status: pack.status,
        published_at: pack.publishedAt?.toISOString() ?? null,
      },
    });
  }),
);

adminRouter.get(
  "/data-packs/:neighbourhood/:version/export",
  asyncHandler(async (req, res) => {
    if (!isNeighbourhoodId(req.params.neighbourhood)) {
      throw new HttpError(404, "Unknown neighbourhood.");
    }
    const { exportDataPackManifest } = await import(
      "../catalogue/planning.service.js"
    );
    try {
      const result = await exportDataPackManifest(
        req.params.neighbourhood,
        req.params.version,
      );
      res.json({ ok: true, ...result });
    } catch (err) {
      throw new HttpError(
        404,
        err instanceof Error ? err.message : "Export failed.",
      );
    }
  }),
);
