import { existsSync } from "node:fs";
import path from "node:path";
import type { Express, NextFunction, Request, Response } from "express";
import express from "express";
import { env } from "./env.js";

function sendIndex(dist: string) {
  return (_req: Request, res: Response) => {
    res.sendFile(path.join(dist, "index.html"));
  };
}

export function mountFrontends(app: Express) {
  const dashboardDist =
    env.dashboardDist && existsSync(path.join(env.dashboardDist, "index.html"))
      ? env.dashboardDist
      : null;
  const webDist =
    env.webDist && existsSync(path.join(env.webDist, "index.html"))
      ? env.webDist
      : null;

  if (dashboardDist) {
    app.use(
      "/planner",
      express.static(dashboardDist, { index: false, fallthrough: true }),
    );
    app.get(/^\/planner(?:\/.*)?$/, sendIndex(dashboardDist));
  }

  if (webDist) {
    app.use(express.static(webDist, { index: false, fallthrough: true }));
    app.get("*", (req: Request, res: Response, next: NextFunction) => {
      if (req.method !== "GET" && req.method !== "HEAD") {
        next();
        return;
      }
      const url = req.path;
      if (
        url.startsWith("/api") ||
        url.startsWith("/uploads") ||
        url.startsWith("/planner") ||
        url === "/health"
      ) {
        next();
        return;
      }
      res.sendFile(path.join(webDist, "index.html"));
    });
  }
}