import path from "node:path";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { env } from "./lib/env.js";
import { toPublicError } from "./lib/httpError.js";
import { reportsRouter } from "./modules/hazards/reports.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { lpdpRouter } from "./modules/reports/lpdp.routes.js";
import { clustersRouter } from "./modules/clusters/clusters.routes.js";
import { uploadsRouter } from "./modules/uploads/uploads.routes.js";
import { metaRouter } from "./modules/meta/meta.routes.js";
import { catalogueRouter } from "./modules/catalogue/catalogue.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { mountFrontends } from "./lib/serveFrontends.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);

  app.use((req: Request, res: Response, next: NextFunction) => {
    const allowed = env.corsOrigins
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
    const origin = req.headers.origin;
    if (origin && allowed.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization",
      );
    }
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(express.json({ limit: "256kb" }));
  app.use(
    "/uploads/photos",
    express.static(path.resolve(env.photoStoragePath), {
      fallthrough: true,
      setHeaders(res) {
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Cache-Control", "public, max-age=86400");
      },
    }),
  );

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "urbanmesh-api" });
  });

  app.use("/api/v1/meta", metaRouter);
  app.use("/api/v1/catalogue", catalogueRouter);
  app.use("/api/v1/reports", reportsRouter);
  app.use("/api/v1/clusters", clustersRouter);
  app.use("/api/v1/dashboard", dashboardRouter);
  app.use("/api/v1/lpdp", lpdpRouter);
  app.use("/api/v1/uploads", uploadsRouter);
  app.use("/api/v1/admin", adminRouter);

  app.use("/api", (_req: Request, res: Response) => {
    res.status(404).json({ error: "That UrbanMesh endpoint does not exist." });
  });

  mountFrontends(app);

  app.use(
    (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (res.headersSent) {
        _next(err);
        return;
      }
      const syntax =
        err instanceof SyntaxError ||
        (err && typeof err === "object" && "type" in err && (err as { type?: string }).type === "entity.parse.failed");
      if (syntax) {
        res.status(400).json({ error: "The report could not be read. Send it again." });
        return;
      }
      if (err && typeof err === "object" && "type" in err && (err as { type?: string }).type === "entity.too.large") {
        res.status(413).json({ error: "That request is too large. Shorten the description and try again." });
        return;
      }
      console.error(err);
      const { status, error } = toPublicError(err);
      res.status(status).json({ error });
    },
  );

  return app;
}
