#!/bin/sh
# Admin Vercel build. Works when Root Directory is apps/admin or repo root.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
npm run build --prefix apps/admin
