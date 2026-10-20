import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { resolveAdminToken } from "../../lib/env.js";
import { HttpError } from "../../lib/httpError.js";
import { rateLimit } from "../../lib/rateLimit.js";

function tokensEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // Still run a compare to reduce trivial timing oracles on length.
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  try {
    const expected = resolveAdminToken();
    const header = req.headers.authorization ?? "";
    const match = /^Bearer\s+(.+)$/i.exec(header);
    const token = match?.[1]?.trim() ?? "";
    if (!token || !tokensEqual(token, expected)) {
      next(new HttpError(401, "Admin sign-in required."));
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}

/** Stricter than citizen report limits — protects token guessing. */
export const adminRateLimit = rateLimit(30, 60_000);
