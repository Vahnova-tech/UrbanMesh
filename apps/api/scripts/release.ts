/**
 * Render / production boot: enable PostGIS, then apply the Prisma schema.
 * Safe to re-run. Does not insert demo incidents.
 */
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { env } from "../src/lib/env.js";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to release UrbanMesh.");
  }

  mkdirSync(env.photoStoragePath, { recursive: true });
  mkdirSync(env.lpdpStorageDir, { recursive: true });

  try {
    await prisma.$executeRawUnsafe("CREATE EXTENSION IF NOT EXISTS postgis");
    console.log("PostGIS extension is available.");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`Could not CREATE EXTENSION postgis (${message}). Continuing.`);
  }

  execSync("npx prisma db push --skip-generate", {
    stdio: "inherit",
    env: process.env,
  });
  console.log("Prisma schema is up to date.");
}

main()
  .catch((err) => {
    console.error("Release failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
