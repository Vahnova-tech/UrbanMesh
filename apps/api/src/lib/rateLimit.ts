import type { NextFunction, Request, Response } from "express";
import { env } from "./env.js";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  max = env.rateLimitMaxReports,
  windowMs = env.rateLimitWindowMs,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip ?? req.socket.remoteAddress ?? "unknown"}:${req.path}`;
    const now = Date.now();
    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    if (current.count >= max) {
      res.status(429).json({
        error: "Too many requests. Wait a minute before sending another photo or report.",
      });
      return;
    }
    current.count += 1;
    next();
  };
}
