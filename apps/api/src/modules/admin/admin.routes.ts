import { Router } from "express";
import { asyncHandler } from "../../lib/httpError.js";
import { adminRateLimit, requireAdmin } from "./adminAuth.js";
import {
  listAdminReports,
  setReviewStatus,
  type ReviewStatus,
} from "./admin.service.js";

export const adminRouter = Router();

adminRouter.use(adminRateLimit);
adminRouter.use(requireAdmin);

adminRouter.get(
  "/session",
  asyncHandler(async (_req, res) => {
    res.json({ ok: true, role: "admin" });
  }),
);

adminRouter.get(
  "/reports",
  asyncHandler(async (req, res) => {
    const reviewRaw = String(req.query.review ?? "pending").toLowerCase();
    const review =
      reviewRaw === "approved" ||
      reviewRaw === "rejected" ||
      reviewRaw === "pending" ||
      reviewRaw === "all"
        ? (reviewRaw as ReviewStatus | "all")
        : "pending";
    const limit = Number(req.query.limit ?? 200);
    const result = await listAdminReports({
      review,
      limit: Number.isFinite(limit) ? limit : 200,
    });
    res.json(result);
  }),
);

adminRouter.post(
  "/reports/:id/approve",
  asyncHandler(async (req, res) => {
    const note =
      typeof req.body?.note === "string" ? req.body.note : undefined;
    const incident = await setReviewStatus(req.params.id, "APPROVED", note);
    res.json({ ok: true, action: "approved", incident });
  }),
);

adminRouter.post(
  "/reports/:id/reject",
  asyncHandler(async (req, res) => {
    const note =
      typeof req.body?.note === "string" ? req.body.note : undefined;
    const incident = await setReviewStatus(req.params.id, "REJECTED", note);
    res.json({ ok: true, action: "rejected", incident });
  }),
);

adminRouter.post(
  "/reports/:id/reset",
  asyncHandler(async (req, res) => {
    const incident = await setReviewStatus(req.params.id, "PENDING", null);
    res.json({ ok: true, action: "reset", incident });
  }),
);
