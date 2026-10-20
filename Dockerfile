FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    chromium \
    fonts-liberation \
    openssl \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    WEB_DIST=/app/apps/web/dist \
    DASHBOARD_DIST=/app/apps/dashboard/dist \
    PHOTO_STORAGE_PATH=/var/data/photos \
    LPDP_STORAGE_DIR=/var/data/lpdp \
    HOST=0.0.0.0

WORKDIR /app

# Shared package must exist before npm ci (file:../../packages/shared).
COPY packages/shared packages/shared

COPY apps/api/package.json apps/api/package-lock.json apps/api/
COPY apps/web/package.json apps/web/package-lock.json apps/web/
COPY apps/dashboard/package.json apps/dashboard/package-lock.json apps/dashboard/

RUN npm ci --prefix apps/api \
  && npm ci --include=dev --prefix apps/web \
  && npm ci --include=dev --prefix apps/dashboard

COPY apps/api apps/api
COPY apps/web apps/web
COPY apps/dashboard apps/dashboard
COPY packages/shared packages/shared

RUN mkdir -p /var/data/photos /var/data/lpdp \
  && npx --prefix apps/api prisma generate --schema apps/api/prisma/schema.prisma \
  && npm run build --prefix apps/web \
  && VITE_BASE=/planner/ npm run build --prefix apps/dashboard

WORKDIR /app/apps/api
EXPOSE 10000
CMD ["sh", "-c", "npx tsx scripts/release.ts && npx tsx src/server.ts"]
