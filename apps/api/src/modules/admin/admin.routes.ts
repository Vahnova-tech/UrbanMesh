import { Router } from "express";
import { asyncHandler, HttpError } from "../../lib/httpError.js";
import { env } from "../../lib/env.js";
import { adminRateLimit, requireAdmin } from "./adminAuth.js";
import { DISPROVE_REASONS } from "./disproveReasons.js";
import {
  applyAdminAction,
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
