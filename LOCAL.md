# Run UrbanMesh locally

Requirements and steps to run the full stack on your machine (citizen PWA + county dashboard + API + PostGIS).

For what is shipped vs stubbed, see [`STATUS.md`](./STATUS.md).

---

## Requirements

| Requirement | Notes |
| --- | --- |
| **Node.js 20+** | Used by all three apps |
| **npm** | Comes with Node; install deps per app |
| **PostgreSQL 14+** with **PostGIS** | Spatial clustering (`ST_DWithin`) needs PostGIS |
| **~2 GB free disk** | Node modules + Chromium (Puppeteer) for LPDP PDFs |
| **Modern browser** | Chrome / Firefox / Edge; allow location when testing GPS |

Optional but useful:

| Optional | Why |
| --- | --- |
| **Docker** | Easiest way to run PostGIS without a system Postgres install |
| **`psql` client** | Handy to enable the extension / smoke-test the DB |

---

## Ports

| Service | Default URL |
| --- | --- |
| API | http://localhost:3001 |
| Citizen PWA | http://localhost:5173 |
| County dashboard | http://localhost:5174 |
| Postgres | `localhost:5432` (or another port if you map Docker differently) |

Leave `VITE_API_BASE` empty in the frontends when using `npm run dev` — Vite proxies `/api` to `:3001`.

---

## 1. Database (PostGIS)

### Option A — Docker (recommended)

```bash
docker run -d --name urbanmesh-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=urbanmesh \
  -p 5432:5432 \
  postgis/postgis:16-3.4
```

If port `5432` is already taken, map another host port (e.g. `-p 5433:5432`) and put that port in `DATABASE_URL`.

### Option B — Local Postgres

Create a database named `urbanmesh`, then:

```bash
psql "postgresql://postgres:postgres@localhost:5432/urbanmesh" \
  -c 'CREATE EXTENSION IF NOT EXISTS postgis;'
```

---

## 2. Environment files

```bash
cp apps/api/.env.example apps/api/.env
# optional:
cp apps/web/.env.example apps/web/.env
cp apps/dashboard/.env.example apps/dashboard/.env
```

Minimum API settings in `apps/api/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/urbanmesh?schema=public"
PORT=3001
CORS_ORIGINS="http://localhost:5173,http://localhost:5174"
CLUSTER_RADIUS_METERS=15
CLUSTER_THRESHOLD=3
```

If Docker mapped Postgres to **5433**:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/urbanmesh?schema=public"
```

Templates for every app: [`.env.example`](./.env.example), `apps/api/.env.example`, `apps/web/.env.example`, `apps/dashboard/.env.example`.

---

## 3. API

```bash
cd apps/api
npm install
npx prisma generate
npx prisma db push          # apply schema (no checked-in migrations folder yet)
npm run dev                 # http://localhost:3001
```

Smoke check:

```bash
curl http://localhost:3001/health
# → {"ok":true,"service":"urbanmesh-api"}
```

**LPDP PDF:** first generate may download Chromium via Puppeteer. On Linux you may need OS packages Puppeteer documents for headless Chrome.

---

## 4. Citizen PWA

```bash
cd apps/web
npm install
npm run dev                 # http://localhost:5173
```

---

## 5. County dashboard

```bash
cd apps/dashboard
npm install
npm run dev                 # http://localhost:5174
```

From the repo root you can also use:

```bash
npm run dev:api
npm run dev:web
npm run dev:dashboard
```

(still run `npm install` inside each app once).

---

## Verify the core loop

1. Open http://localhost:5173 — the map is empty until a resident reports.  
2. **Report a hazard** on Argwings Kodhek (or any Kilimani pin).  
3. Confirm API clustering: third same-category report within 15 m → verified.  
4. Open http://localhost:5174 — Overview / Live Map / Analytics should show metrics.  
5. **Policy Briefs** or LPDP Evidence → **Generate LPDP Brief** → download PDF.

Demo video of the loop: [`demo/UrbanMesh-demo.mp4`](./demo/UrbanMesh-demo.mp4).

---

## Common issues

| Symptom | Fix |
| --- | --- |
| API fails on start / Prisma connection error | Postgres not running, wrong `DATABASE_URL`, or PostGIS extension missing |
| `ST_DWithin` / raw SQL errors | Run `CREATE EXTENSION postgis;` on the database |
| Frontends load but empty map / API errors | Start API on `:3001`; check CORS and proxy |
| `prisma migrate dev` fails | Use `npx prisma db push` — this repo ships schema, not a migrations history |
| GPS / “Could not read GPS” | Browser blocked location; report flow still works by panning the map crosshair |
| LPDP generate fails | Puppeteer/Chromium deps missing; retry after install or run `npm run generate:lpdp` in `apps/api` |
| Photo step blocked | Photo is optional — description alone is enough to reach Review |

---

## What you need for a useful demo

| Piece | Required? |
| --- | --- |
| PostGIS + API | **Yes** — without these the UIs have no live reports |
| Citizen PWA (`apps/web`) | **Yes** for reporting / heatmap |
| County dashboard | **Yes** for metrics / LPDP |
| Real GPS outdoors | Optional — map pin works |
| Camera | Optional — photo recommended, not required |

This stack is a **local MVP**. It is not hardened for unsupervised public use (no auth, rate limit stubbed). See [`STATUS.md`](./STATUS.md) and [`roadmap.md`](./roadmap.md).
