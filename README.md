# UrbanMesh

**Crowdsourced walkability & safety intelligence for Kilimani — feeding Nairobi County’s Local Physical Development Plan (LPDP).**

Residents report mobility and infrastructure hazards in real time. When enough nearby reports agree, the platform **self-verifies** a spatial cluster, paints a live Walkability & Safety Heatmap, and compiles an LPDP policy brief for county planners.

Grounded in Kilimani’s scale: **~50,457 residents across 16.1 km²** (2019 census context), with pilot corridors on **Argwings Kodhek Road** and the **Kirichwa Kubwa** river corridor.

Living product snapshot: **[`STATUS.md`](./STATUS.md)** · Run locally: **[`LOCAL.md`](./LOCAL.md)** · 90-day pilot plan: **[`roadmap.md`](./roadmap.md)**

---

## Why it isn’t another complaint box

UrbanMesh is **not** an open inbox of unverified grievances. Trust is programmatic:

| Rule | Behaviour |
| --- | --- |
| **Self-verifying filter** | ≥ **3** same-category reports within **15 metres** (`PostGIS ST_DWithin` on geography) → `is_verified = true` + shared `cluster_id` |
| **Heatmap gate** | Only **verified** clusters feed the walkability & safety density layer |
| **Policy gate** | LPDP PDF entries are verified clusters labelled **“3+ Confirmed Citizen Reports”** |
| **Scoped hazards** | Six tangible point-hazard types only — no crime logs, no water-rationing schedules, no personal profiles |

That triangulation of **community reports + spatial clustering + planner-facing evidence** is the product differentiator.

---

## Operating constraints (Nairobi / Kilimani)

| Constraint | How UrbanMesh responds |
| --- | --- |
| **Low bandwidth** | Mobile-first PWA; lazy-loaded map bundle; Leaflet + compact Tailwind; report shell paints before the map chunk |
| **Privacy / security** | No public citizen profiles; reports on-device for “My Reports”; taxonomy excludes sensitive social/crime domains |
| **Trust** | Auto-verify is a **priority signal**, not unreviewed publish — community moderation stays in the pilot plan |
| **Planner utility** | One-click A4 LPDP policy brief from live verified clusters |

---

## Three workflows

| Discipline | Surface | What it does |
| --- | --- | --- |
| **Civic design & front-end** | `apps/web` | Citizen PWA — GPS report flow + live heatmap |
| **Geospatial & spatial planning** | `apps/api` + PostGIS / H3 | Geometry ingest, 15 m clustering, verified clusters |
| **Data systems & policy automation** | `apps/dashboard` + LPDP PDF | Ward metrics + Puppeteer A4 policy brief |

---

## Architecture

```text
Citizen PWA (:5173)  ──┐
County Dashboard (:5174) ──┼──► Express API (:3001)
                           │         │
                           │         ├── Prisma → PostgreSQL + PostGIS
                           │         ├── H3 cell indexes (res 10)
                           │         └── Puppeteer → LPDP PDF
                           │
                    storage/lpdp/UrbanMesh-LPDP-Policy-Brief.pdf
```

### Monorepo layout

```text
UrbanMesh/
├── apps/
│   ├── web/                 # Citizen PWA (React, Vite, Leaflet, Tailwind)
│   ├── dashboard/           # County planner console (React, Recharts)
│   └── api/                 # Express + Prisma + PostGIS + Puppeteer
├── LOCAL.md                 # Requirements & how to run locally
├── STATUS.md                # What is shipped / stubbed / missing
├── roadmap.md               # 90-day pilot plan
└── README.md
```

---

## Tech stack

| Layer | Choices |
| --- | --- |
| Citizen / dashboard UI | React 19, Vite, TypeScript, Tailwind CSS |
| Maps | Leaflet, react-leaflet, leaflet.heat |
| Charts | Recharts |
| Spatial index | Uber H3 (`h3-js`, resolution 10) |
| API | Node.js, Express, TypeScript |
| ORM / DB | Prisma, PostgreSQL, PostGIS |
| Documents | Puppeteer (HTML → A4 PDF) |

---

## Hazard categories (strict scope)

| Enum | Plain-language label |
| --- | --- |
| `MOBILITY_SURFACE_DAMAGE` | Pothole / Broken Road Surface |
| `NMT_PEDESTRIAN_HAZARD` | Blocked Walkway / Pedestrian Barrier |
| `DRAINAGE_STORMWATER` | Flooding / Clogged Drain |
| `SEWER_SANITATION` | Open Manhole / Sewer Leak |
| `LIGHTING_SECURITY` | Unlit Street / Broken Light |
| `ILLEGAL_WASTE_DUMP` | Illegal Dumping / Waste Pile |

Out of scope by design: crime reporting, water rationing, personal identity, anonymous doxxing surfaces.

---

## Crowdsource verification (self-verifying filter)

On every `POST /api/v1/reports`:

1. Store the report as a PostGIS `geometry(Point, 4326)`  
2. Find same-category incidents within **15 metres** (`ST_DWithin` on geography)  
3. If **≥ 3** reports match → set `is_verified = true` and assign a shared `cluster_id`  
4. Response status:
   - `"Verified Cluster Created"`
   - `"Incident Logged - Pending Verification"`

The database starts empty. Verification appears only after three same-category resident reports land within 15 metres.

---

## Prerequisites & local setup

**Full requirements and step-by-step local run guide:** **[`LOCAL.md`](./LOCAL.md)**  
(PostGIS / Docker, env files, `prisma db push`, ports, smoke checks, common issues.)

Quick checklist:

- **Node.js** 20+  
- **PostgreSQL** 14+ with the **PostGIS** extension  
- Chromium deps for Puppeteer (LPDP PDF generation)

### Quick start (summary)

1. Start PostGIS and copy `apps/api/.env.example` → `apps/api/.env`  
2. `cd apps/api && npm install && npx prisma generate && npx prisma db push && npm run dev` → `:3001`  
3. `cd apps/web && npm install && npm run dev` → `:5173`  
4. `cd apps/dashboard && npm install && npm run dev` → `:5174`  

Details, Docker one-liner, and troubleshooting are in [`LOCAL.md`](./LOCAL.md).

---

## API reference

Base URL: `http://localhost:3001`

### Reports

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/v1/reports` | Ingest geotagged hazard + run clustering |
| `GET` | `/api/v1/reports` | All reports (filter `status`, `category`, `limit`) |
| `GET` | `/api/v1/reports/nearby` | Reports near `lat` / `lng` |
| `GET` | `/api/v1/reports/verified` | Verified incidents for the heatmap |
| `GET` | `/api/v1/reports/:id` | Evidence pack |
| `POST` | `/api/v1/reports/:id/confirm` | Nearby confirmation |
| `POST` | `/api/v1/uploads/photos` | Store a citizen photo |

### Dashboard & clusters

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/v1/dashboard/metrics` | Totals, corridors, category, ward, trend |
| `GET` | `/api/v1/clusters` | Verified spatial clusters |
| `GET` | `/api/v1/meta` | Thresholds, corridors, ward boxes |
| `GET` | `/health` | Liveness |

### LPDP policy brief

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/v1/lpdp/generate` | Compile verified clusters → A4 PDF |
| `GET` | `/api/v1/lpdp/latest.pdf` | Download latest brief |

**CLI:** `cd apps/api && npm run generate:lpdp`

---

## Demo walkthrough (for video / stakeholders)

Punchy path (aim ≤ 2–3 minutes on camera):

1. Open the **citizen map** (empty until someone reports)  
2. File three same-category geotagged hazards within 15 m on **Argwings Kodhek**  
3. Show **Verified Cluster Created** when the rule fires  
4. County dashboard → **Generate LPDP PDF** → download the structured brief  

---

## Deploy (Vercel — citizen PWA)

Install/build always run via [`scripts/vercel-citizen-*.sh`](./scripts) so the citizen app builds whether Root Directory is `.`, `apps/web`, or (mistakenly) `apps/admin`.

In Vercel → Project → Settings → General / Build & Development:

1. Prefer **Root Directory** empty (repo root) or `apps/web`
2. Clear any **Override** on Install / Build Command (let `vercel.json` drive them)
3. **Env:** `VITE_API_BASE` = public API URL  

`apps/admin` is a separate moderation UI (local / API-hosted), not the Vercel citizen site.

---

## Environment variables

See [`.env.example`](./.env.example) and `apps/*/.env.example`. Key knobs: `CLUSTER_RADIUS_METERS`, `CLUSTER_THRESHOLD`, `CORS_ORIGINS`, `VITE_API_BASE`.

---

## 90-day pilot

Path from working MVP to a supervised street pilot (KCF hosting, reporter cohort, county LPDP desk):

- **[`STATUS.md`](./STATUS.md)** — what is live vs stubbed  
- **[`roadmap.md`](./roadmap.md)** — Foundation → Community pilot → Validate & handover  

---

## Product surfaces

| Focus | Surface |
| --- | --- |
| Civic design & front-end | PWA UX, report flow, map |
| Geospatial & spatial planning | PostGIS, H3, clustering thresholds, taxonomy |
| Data systems & policy automation | Dashboard metrics, LPDP PDF pipeline, docs |

---

## Licence & attribution

Built for community evidence and Nairobi County planning workflows — an operational input to the Kilimani LPDP, **not** a statutory plan amendment by itself.

UrbanMesh · Nairobi · Kilimani
