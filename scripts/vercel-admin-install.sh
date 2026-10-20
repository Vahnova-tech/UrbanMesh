#!/bin/sh
# Admin Vercel install. Works when Root Directory is apps/admin or repo root.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
npm install --prefix packages/shared
npm install --prefix apps/admin
