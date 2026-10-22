import { Router } from "express";
import { asyncHandler, HttpError, isUuid } from "../../lib/httpError.js";
import {
  isNeighbourhoodId,
  neighbourhoodOrDefault,
} from "../../lib/neighbourhoods.js";
import { rateLimit } from "../../lib/rateLimit.js";
import {
  getConcernDetail,
  isEvidenceType,
  listPublicConcerns,
  submitConcern,
} from "./concerns.service.js";

export const concernsRouter = Router();

concernsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const neighbourhoodRaw = req.query.neighbourhood;
    if (
      typeof neighbourhoodRaw === "string" &&
      neighbourhoodRaw.length > 0 &&
      !isNeighbourhoodId(neighbourhoodRaw)
    ) {
      throw new HttpError(400, "Unknown neighbourhood.");
    }

    const includeSynthetic =
      String(req.query.include_synthetic ?? "") === "1" ||
      String(req.query.include_synthetic ?? "").toLowerCase() === "true";
    const limit = Number(req.query.limit ?? 200);

    const result = await listPublicConcerns({
      neighbourhood: isNeighbourhoodId(neighbourhoodRaw)
        ? neighbourhoodRaw
        : undefined,
      includeSynthetic,
      limit: Number.isFinite(limit) ? limit : 200,
    });
    res.json(result);
  }),
);

concernsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) {
      throw new HttpError(404, "This concern is not on UrbanMesh.");
    }
    const concern = await getConcernDetail(req.params.id);
    if (!concern) {
      throw new HttpError(404, "This concern is not on UrbanMesh.");
    }
    res.json({ concern });
  }),
);

concernsRouter.post(
  "/",
  rateLimit(),
  asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    const neighbourhood = isNeighbourhoodId(body.neighbourhood_id)
      ? body.neighbourhood_id
      : neighbourhoodOrDefault(body.neighbourhood_id).id;

    if (typeof body.concern_type_code !== "string") {
      throw new HttpError(400, "Choose a concern type.");
    }
    if (typeof body.title !== "string") {
      throw new HttpError(400, "A title is required.");
    }
    if (typeof body.description !== "string") {
      throw new HttpError(400, "A description is required.");
    }

    const evidence_type = body.evidence_type;
    if (evidence_type != null && !isEvidenceType(evidence_type)) {
      throw new HttpError(400, "Choose a valid evidence type.");
    }

    const lat =
      body.lat === null || body.lat === undefined || body.lat === ""
        ? null
        : Number(body.lat);
    const lng =
      body.lng === null || body.lng === undefined || body.lng === ""
        ? null
        : Number(body.lng);

    if (
      (lat != null && !Number.isFinite(lat)) ||
      (lng != null && !Number.isFinite(lng)) ||
      (lat == null) !== (lng == null)
    ) {
      throw new HttpError(
        400,
        "Provide both latitude and longitude, or omit location.",
      );
    }

    const result = await submitConcern({
      neighbourhood_id: neighbourhood,
      concern_type_code: body.concern_type_code,
      title: body.title,
      description: body.description,
      evidence_type: isEvidenceType(evidence_type) ? evidence_type : undefined,
      lat,
      lng,
      area_label:
        typeof body.area_label === "string" ? body.area_label : null,
      observed_at:
        typeof body.observed_at === "string" ? body.observed_at : null,
      source_ref: typeof body.source_ref === "string" ? body.source_ref : null,
    });

    res.status(201).json({
      ...result,
      message:
        "Concern received for evidence review. It is not published until accepted.",
    });
  }),
);
