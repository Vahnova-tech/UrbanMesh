import { Router } from "express";
import { asyncHandler, HttpError } from "../../lib/httpError.js";
import { env } from "../../lib/env.js";
import { adminRateLimit, requireAdmin } from "./adminAuth.js";
import {
  applyAdminAction,
  getAdminReportDetail,
  getDashboardStats,
  listAdminReports,
  listAuditForIncident,
  type AdminAction,
  type ReviewStatus,
} from "./admin.service.js";

export const adminRouter = Router();

adminRouter.use(adminRateLimit);
adminRouter.use(requireAdmin);

adminRouter.get(
  "/session",
  asyncHandler(async (_req, res) => {
    res.json({
      ok: true,
      role: "admin",
      rules: {
        cluster_threshold: env.clusterThreshold,
        cluster_radius_meters: env.clusterRadiusMeters,
        note: "Community-supported (spatial) is not field-verified.",
      },
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
    ] as const;
    const review = (allowed as readonly string[]).includes(reviewRaw)
      ? (reviewRaw as ReviewStatus | "all" | "queue")
      : "queue";
    const limit = Number(req.query.limit ?? 300);
    const result = await listAdminReports({
      review,
      category: typeof req.query.category === "string" ? req.query.category : undefined,
      q: typeof req.query.q === "string" ? req.query.q : undefined,
      limit: Number.isFinite(limit) ? limit : 300,
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
  "reject",
  "flag",
  "resolve",
  "reopen",
  "archive",
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
    const incident = await applyAdminAction(req.params.id, "reject", {
      reason: typeof req.body?.note === "string" ? req.body.note : req.body?.reason,
    });
    res.json({ ok: true, action: "rejected", incident });
  }),
);

adminRouter.post(
  "/reports/:id/reset",
  asyncHandler(async (req, res) => {
    const incident = await applyAdminAction(req.params.id, "reset_queue", {});
    res.json({ ok: true, action: "reset", incident });
  }),
);
