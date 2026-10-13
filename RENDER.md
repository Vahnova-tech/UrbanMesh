# Deploy UrbanMesh on Render

One Docker web service serves the citizen PWA, the county planner at `/planner`, and `/api`. A Render Postgres instance stores incidents. PostGIS is enabled on first boot.

## What you get

| URL | App |
| --- | --- |
| `https://<service>.onrender.com/` | Citizen map and report flow |
| `https://<service>.onrender.com/planner` | County dashboard |
| `https://<service>.onrender.com/api/v1/…` | API |
| `https://<service>.onrender.com/health` | Liveness |

Photos and LPDP PDFs live on the attached disk at `/var/data`.

## Blueprint deploy

1. Push this repo to GitHub or GitLab.
2. In Render: **New → Blueprint**.
3. Select the repo. Render reads [`render.yaml`](./render.yaml).
4. Apply. First build installs Chromium and the three apps — expect several minutes.
5. Open the service URL. The map is empty until someone reports.

Render injects `DATABASE_URL` and `PORT`. The container listens on `0.0.0.0` and runs `npx tsx scripts/release.ts` (PostGIS + `prisma db push`) before `npx tsx src/server.ts`. Production start does not require a `.env` file.

## Plans

The blueprint uses **starter** for the web service and **basic-256mb** for Postgres. PostGIS is supported on current Render Postgres versions. A persistent disk is required so photos survive deploys. Free web instances sleep and are too small for LPDP Chromium.

## Custom domain

Point `urbanmesh.space` (or any host) at the Render service, then add that origin to `CORS_ORIGINS` if you also keep a separate frontend host. Same-origin on the Render URL needs no extra CORS.

## Local check of the production image

```bash
docker build -t urbanmesh .
docker run --rm -p 3001:3001 \
  -e PORT=3001 \
  -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/urbanmesh" \
  -e NODE_ENV=production \
  urbanmesh
```

Then open http://localhost:3001 and http://localhost:3001/planner.

## If release fails

| Symptom | Fix |
| --- | --- |
| `CREATE EXTENSION postgis` | Confirm the Render Postgres version is 13+ and the instance is not an old Starter PG12 |
| Prisma cannot reach the database | `DATABASE_URL` must be the Render connection string (blueprint wires this) |
| LPDP generate 503 | Chromium missing or out of memory — stay on starter or larger |
| Empty map after reboot | Disk not mounted — photos/PDFs on `/var/data` need the blueprint disk |
