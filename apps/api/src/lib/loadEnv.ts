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

const DATABASE_ALIASES = [
  "DATABASE_URL",
  "DATABASE_PRIVATE_URL",
  "POSTGRES_URL",
  "POSTGRES_CONNECTION_STRING",
] as const;

function readEnv(key: string): string {
  return process.env[key]?.trim() ?? "";
}

const alias = DATABASE_ALIASES.find((key) => readEnv(key));
if (alias) {
  process.env.DATABASE_URL = readEnv(alias);
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
