#!/bin/sh
# Works whether Vercel Root Directory is repo root, apps/web, or apps/admin.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
npm install --prefix apps/web
