/**
 * Render / production boot: enable PostGIS, apply Prisma schema, then
 * Kileleshwa datapack + concerns SQL, then catalogue seed. Safe to re-run.
 */
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../src/lib/env.js";
import { prisma } from "../src/lib/prisma.js";
import { seedCatalogueReference } from "../src/modules/catalogue/catalogue.seed.js";
import { ensureProvisionalBoundary } from "../src/modules/catalogue/boundary.service.js";
import { ensureSampleLayerIfNeeded } from "../src/modules/catalogue/layers.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlDir = path.resolve(__dirname, "../prisma/sql");
const sqlFiles = [
  path.join(sqlDir, "kileleshwa_datapack.sql"),
  path.join(sqlDir, "concerns.sql"),
];

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    const seen = Object.keys(process.env)
      .filter((key) => /DATABASE|POSTGRES|RENDER/i.test(key))
      .sort()
      .join(", ");
    throw new Error(
      `DATABASE_URL is missing (saw: ${seen || "no DATABASE/POSTGRES/RENDER keys"}). In Render: urbanmesh → Environment → Add Environment Variable → DATABASE_URL = Internal Database URL from the Postgres instance. Then Manual Deploy. A rebuild alone will not fix this.`,
    );
  }

  mkdirSync(env.photoStoragePath, { recursive: true });
  mkdirSync(env.lpdpStorageDir, { recursive: true });
  mkdirSync(env.datasetStoragePath, { recursive: true });
  mkdirSync(env.layerStoragePath, { recursive: true });

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

  for (const sqlFile of sqlFiles) {
    execSync(`npx prisma db execute --file "${sqlFile}"`, {
      stdio: "inherit",
      env: process.env,
    });
    console.log(`Applied ${path.basename(sqlFile)}.`);
  }

  await seedCatalogueReference();
  console.log("Catalogue reference rows upserted.");

  await ensureProvisionalBoundary("kileleshwa");
  console.log("Provisional Kileleshwa boundary ensured.");

  await ensureSampleLayerIfNeeded("kileleshwa");
  console.log("Boundary map layer registered (non-empty only).");
}

main()
  .catch((err) => {
    console.error("Release failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
