import { Router, type Request, type Response, type NextFunction } from "express";
import { latLngToCell } from "h3-js";
import {
  ingestHazardReport,
  isHazardCategory,
} from "./ingestion.service.js";
import { listVerifiedIncidents } from "./verified.service.js";
import {
  getIncidentById,
  getIncidentEvidence,
  listIncidents,
  listNearbyIncidents,
} from "./listing.service.js";
import type { HazardReportInput } from "../../types/reports.js";
import { PhotoError, resolveStoredPhotoUrl } from "../uploads/photo.js";
import { rateLimit } from "../../lib/rateLimit.js";

const reportsRouter = Router();

reportsRouter.get(
  "/verified",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const incidents = await listVerifiedIncidents();
      res.json({ count: incidents.length, incidents });
    } catch (err) {
      next(err);
    }
  },
);

reportsRouter.get(
  "/nearby",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lat = Number(req.query.lat);
      const lng = Number(req.query.lng);
      const radius = Number(req.query.radius ?? 800);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        res.status(400).json({ error: "lat and lng are required" });
        return;
      }

      const result = await listNearbyIncidents(
        lat,
        lng,
        Number.isFinite(radius) && radius > 0 ? radius : 800,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

reportsRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const statusRaw = String(req.query.status ?? "all");
      const status =
        statusRaw === "verified" || statusRaw === "pending" || statusRaw === "all"
          ? statusRaw
          : "all";
      const category =
        typeof req.query.category === "string" && req.query.category.length > 0
          ? req.query.category
          : undefined;
      const corridor =
        typeof req.query.corridor === "string" && req.query.corridor.length > 0
          ? req.query.corridor
          : undefined;
      const limit = Number(req.query.limit ?? 500);

      const result = await listIncidents({
        status,
        category,
        corridor,
        limit: Number.isFinite(limit) ? limit : 500,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

reportsRouter.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const evidence = await getIncidentEvidence(req.params.id);
      if (!evidence) {
        res.status(404).json({ error: "Report not found" });
        return;
      }
      res.json(evidence);
    } catch (err) {
      next(err);
    }
  },
);

reportsRouter.post(
  "/:id/confirm",
  rateLimit(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const original = await getIncidentById(req.params.id);
      if (!original) {
        res.status(404).json({ error: "Report not found" });
        return;
      }

      const description =
        typeof req.body?.description === "string" &&
        req.body.description.trim().length > 0
          ? req.body.description.trim()
          : `Community confirmation: ${original.category_label} still present on ${original.corridor}.`;

      const result = await ingestHazardReport({
        category: original.category as HazardReportInput["category"],
        description,
        lat: original.lat,
        lng: original.lng,
        h3_index:
          original.h3_index || latLngToCell(original.lat, original.lng, 10),
        photo_url: null,
      });

      res.status(201).json({
        ...result,
        confirmed_of: original.id,
      });
    } catch (err) {
      next(err);
    }
  },
);

reportsRouter.post(
  "/",
  rateLimit(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { category, description, lat, lng, h3_index, photo_url } =
        req.body ?? {};

      if (!isHazardCategory(category)) {
        res.status(400).json({
          error: "Invalid or missing category",
          allowed: [
            "MOBILITY_SURFACE_DAMAGE",
            "NMT_PEDESTRIAN_HAZARD",
            "DRAINAGE_STORMWATER",
            "SEWER_SANITATION",
            "LIGHTING_SECURITY",
            "ILLEGAL_WASTE_DUMP",
          ],
        });
        return;
      }

      if (typeof description !== "string" || description.trim().length === 0) {
        res.status(400).json({ error: "description is required" });
        return;
      }

      const latitude = Number(lat);
      const longitude = Number(lng);

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        res.status(400).json({ error: "lat and lng must be valid coordinates" });
        return;
      }

      if (typeof h3_index !== "string" || h3_index.trim().length === 0) {
        res.status(400).json({ error: "h3_index is required" });
        return;
      }

      let storedPhoto: string | null = null;
      try {
        storedPhoto = await resolveStoredPhotoUrl(photo_url);
      } catch (err) {
        if (err instanceof PhotoError) {
          res.status(400).json({ error: err.message });
          return;
        }
        throw err;
      }

      const payload: HazardReportInput = {
        category,
        description: description.trim(),
        lat: latitude,
        lng: longitude,
        h3_index: h3_index.trim(),
        photo_url: storedPhoto,
      };

      const result = await ingestHazardReport(payload);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

export { reportsRouter };
