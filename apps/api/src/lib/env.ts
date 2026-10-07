import "./loadEnv.js";

/**
 * Runtime config aligned with roadmap.md:
 * - Wk 1–2: photo storage + rate limiting (pilot hardening)
 * - Wk 6 / risks: clustering radius & report count must be configurable
 */

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export const env = {
  port: intEnv("PORT", 3001),
  databaseUrl: process.env.DATABASE_URL ?? "",

  /** Same-category reports needed to auto-verify (roadmap default: 3). */
  clusterThreshold: intEnv("CLUSTER_THRESHOLD", 3),
  /** ST_DWithin radius in metres (roadmap default: 15). */
  clusterRadiusMeters: intEnv("CLUSTER_RADIUS_METERS", 15),

  /** Local photo directory served at /uploads/photos. */
  photoStoragePath: process.env.PHOTO_STORAGE_PATH ?? "./storage/photos",
  photoPublicBaseUrl: process.env.PHOTO_PUBLIC_BASE_URL ?? "",

  /** Applied to POST /uploads/photos and POST /reports. */
  rateLimitWindowMs: intEnv("RATE_LIMIT_WINDOW_MS", 60_000),
  rateLimitMaxReports: intEnv("RATE_LIMIT_MAX_REPORTS", 10),

  /** LPDP PDF output directory (relative to apps/api cwd unless absolute). */
  lpdpStorageDir: process.env.LPDP_STORAGE_DIR ?? "./storage/lpdp",

  /** Comma-separated browser origins allowed to call the API (PWA + dashboard). */
  corsOrigins:
    process.env.CORS_ORIGINS ??
    "http://localhost:5173,http://localhost:5174",

  nodeEnv: process.env.NODE_ENV ?? "development",
};
