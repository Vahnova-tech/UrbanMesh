import path from "node:path";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { env } from "./lib/env.js";
import { reportsRouter } from "./modules/hazards/reports.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { lpdpRouter } from "./modules/reports/lpdp.routes.js";
import { clustersRouter } from "./modules/clusters/clusters.routes.js";
import { uploadsRouter } from "./modules/uploads/uploads.routes.js";
import { metaRouter } from "./modules/meta/meta.routes.js";

export function createApp() {
  const app = express();

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
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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
  app.use("/api/v1/reports", reportsRouter);
  app.use("/api/v1/clusters", clustersRouter);
  app.use("/api/v1/dashboard", dashboardRouter);
  app.use("/api/v1/lpdp", lpdpRouter);
  app.use("/api/v1/uploads", uploadsRouter);

  app.use(
    (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      console.error(err);
      const message = err instanceof Error ? err.message : "";
      const dbMissing =
        message.includes("DATABASE_URL") ||
        message.includes("Can't reach database") ||
        message.includes("P1001");
      res.status(dbMissing ? 503 : 500).json({
        error: dbMissing
          ? "UrbanMesh cannot reach PostgreSQL. Start Postgres with PostGIS, then in apps/api run npx prisma migrate dev and npm run db:seed."
          : "Something went wrong on the UrbanMesh API.",
      });
    },
  );

  return app;
}
