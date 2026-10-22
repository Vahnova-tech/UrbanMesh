import "./loadEnv.js";

/**
 * Runtime config. Render injects PORT, DATABASE_URL, and RENDER_EXTERNAL_URL.
 */

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function csvEnv(...parts: Array<string | undefined>): string {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const part of parts) {
    if (!part) continue;
    for (const item of part.split(",")) {
      const origin = item.trim().replace(/\/$/, "");
      if (!origin || seen.has(origin)) continue;
      seen.add(origin);
      values.push(origin);
    }
  }
  return values.join(",");
}

export const env = {
  port: intEnv("PORT", 3001),
  /** Render and Docker must bind all interfaces. */
  host: process.env.HOST ?? "0.0.0.0",
  databaseUrl: process.env.DATABASE_URL ?? "",

  clusterThreshold: intEnv("CLUSTER_THRESHOLD", 3),
  clusterRadiusMeters: intEnv("CLUSTER_RADIUS_METERS", 15),

  photoStoragePath: process.env.PHOTO_STORAGE_PATH ?? "./storage/photos",
  photoPublicBaseUrl: process.env.PHOTO_PUBLIC_BASE_URL ?? "",
  datasetStoragePath:
    process.env.DATASET_STORAGE_PATH ?? "./uploads/datasets",
  layerStoragePath: process.env.LAYER_STORAGE_PATH ?? "./uploads/layers",

  rateLimitWindowMs: intEnv("RATE_LIMIT_WINDOW_MS", 60_000),
  rateLimitMaxReports: intEnv("RATE_LIMIT_MAX_REPORTS", 10),

  lpdpStorageDir: process.env.LPDP_STORAGE_DIR ?? "./storage/lpdp",
  puppeteerExecutablePath: process.env.PUPPETEER_EXECUTABLE_PATH ?? "",

  webDist: process.env.WEB_DIST ?? "",
  dashboardDist: process.env.DASHBOARD_DIST ?? "",
  adminDist: process.env.ADMIN_DIST ?? "",

  /**
   * Bearer token for /api/v1/admin/*.
   * Local default is only allowed when NODE_ENV !== "production".
   */
  adminApiToken: process.env.ADMIN_API_TOKEN ?? "",

  corsOrigins: csvEnv(
    process.env.CORS_ORIGINS,
    process.env.RENDER_EXTERNAL_URL,
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
  ),

  nodeEnv: process.env.NODE_ENV ?? "development",
};

export const DEV_ADMIN_TOKEN = "urbanmesh-admin-dev";

export function resolveAdminToken(): string {
  const configured = env.adminApiToken.trim();
  if (configured) return configured;
  if (env.nodeEnv === "production") {
    throw new Error(
      "ADMIN_API_TOKEN is required in production. Set a strong secret before starting the API.",
    );
  }
  return DEV_ADMIN_TOKEN;
}
