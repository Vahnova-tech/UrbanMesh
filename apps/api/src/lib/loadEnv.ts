import { existsSync } from "node:fs";
import path from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

const envPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.env",
);

if (existsSync(envPath)) {
  loadEnvFile(envPath);
}

/** Render Postgres requires TLS. Internal URLs often omit sslmode. */
const databaseUrl = process.env.DATABASE_URL;
if (
  databaseUrl &&
  process.env.NODE_ENV === "production" &&
  !/[?&]sslmode=/i.test(databaseUrl)
) {
  process.env.DATABASE_URL = databaseUrl.includes("?")
    ? `${databaseUrl}&sslmode=require`
    : `${databaseUrl}?sslmode=require`;
}
