import type { NextFunction, Request, RequestHandler, Response } from "express";
import { env } from "./env.js";

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    void fn(req, res, next).catch(next);
  };
}

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isDev(): boolean {
  return env.nodeEnv !== "production";
}

function codeOf(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    return String((err as { code: unknown }).code);
  }
  return "";
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : "";
}

export function toPublicError(err: unknown): { status: number; error: string } {
  if (err instanceof HttpError) {
    return { status: err.status, error: err.message };
  }

  const code = codeOf(err);
  const message = messageOf(err);

  if (
    code === "P1001" ||
    /Can't reach database|ECONNREFUSED|connect ECONNREFUSED|P1001/i.test(message)
  ) {
    return {
      status: 503,
      error: isDev()
        ? "UrbanMesh cannot reach PostgreSQL. Start Postgres with PostGIS, then refresh."
        : "Kilimani records are unavailable. Try again shortly.",
    };
  }

  if (
    code === "P2021" ||
    /relation ["']?incidents["']? does not exist/i.test(message)
  ) {
    return {
      status: 503,
      error: isDev()
        ? "The incidents table is missing. In apps/api run npx prisma db push."
        : "Kilimani records are unavailable. Try again shortly.",
    };
  }

  if (code === "P1000" || /DATABASE_URL/i.test(message)) {
    return {
      status: 503,
      error: isDev()
        ? "DATABASE_URL is missing or rejected. Check apps/api/.env."
        : "Kilimani records are unavailable. Try again shortly.",
    };
  }

  return {
    status: 500,
    error: "Something went wrong on the UrbanMesh API.",
  };
}
