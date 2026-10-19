# UrbanMesh — Product Status

**Stage:** Working MVP (demo-ready)  
**As of:** 19 October 2026  
**Pilot:** not started — see [`roadmap.md`](./roadmap.md)

UrbanMesh is a three-app prototype for Kilimani walkability & safety intelligence. Citizens can log geotagged hazards, the API auto-clusters nearby same-category reports (≥3 within 15 m) as **community-supported**, and county planners can read ward metrics and export an LPDP evidence PDF. It is **not** yet ready for unsupervised public reporting.

---

## Verdict

| Question | Answer |
| --- | --- |
| Can we run the end-to-end demo? | **Yes** — PWA report + heatmap + dashboard + LPDP PDF (map starts empty) |
| Can residents use it unsupervised on the street? | **Not yet** — rate limiting stubbed; moderation and installable PWA hardening remain |
| Can the county treat output as operational evidence? | **Not yet** — empty until real reports, approximate ward boxes, no named LPDP desk access |
| What is the next product job? | Harden the reporting path (Phase 1), then put real Kilimani reporters on Argwings Kodhek and Kirichwa Kubwa |

---

## What’s live

| Surface | Port | What works today |
| --- | --- | --- |
| Citizen web (`apps/web`) | `:5173` | Mobile map home, report flow, reports list, my reports, hazard evidence |
| County dashboard (`apps/dashboard`) | `:5174` | Overview, live map, clusters, analytics, LPDP evidence workspace |
| API (`apps/api`) | `:3001` | Report ingest + PostGIS clustering, community-supported listings, metrics, LPDP generate + download |
| Database | Postgres + PostGIS | `incidents` table, six hazard categories, `is_verified` / `cluster_id` |
| Seed | `npm run db:seed` | Clears `incidents` — no authored demo reports |

**Community-supported rule (live):** same category, `ST_DWithin` on geography, default **≥ 3 reports within 15 m**. Env-configurable via `CLUSTER_RADIUS_METERS` / `CLUSTER_THRESHOLD`. This is spatial corroboration, not a field inspection.

---

## Capability matrix

| Capability | Status | Notes |
| --- | --- | --- |
| GPS hazard report | **Shipped** | Geolocation required |
| Six-category taxonomy (scoped) | **Shipped** | No crime / rationing domains |
| PostGIS 15 m community support | **Shipped** | Auto-cluster + shared `cluster_id` |
| Client-side H3 index | **Shipped** | `h3-js` resolution 10 |
| Community-supported heatmap | **Shipped** | Leaflet.heat |
| Ward / category metrics | **Shipped** | Approximate bbox “wards” |
| LPDP A4 PDF | **Shipped** | Puppeteer HTML → PDF |
| Authored demo incidents | **Removed** | Map and LPDP stay empty until residents report |
| Photo upload | **Shipped** | `POST /api/v1/uploads/photos` |
| CORS | **Shipped** | `CORS_ORIGINS` |
| Low-bandwidth PWA posture | **Partial** | Lazy map; manifest present; no service worker yet |
| Rate limiting | **Stubbed** | Env only |
| Auth / planner ACL | **Missing** | Open local APIs |
| Moderation queue | **Missing** | Auto-verify is the only gate |
| Official ward polygons | **Missing** | Hardcoded boxes |

---

## Demo vs pilot

Current end-to-end contract:

1. File three same-category reports within 15 m  
2. Heatmap shows the new community-supported cluster  
3. Dashboard metrics + **Generate LPDP PDF**  

The 90-day pilot still needs partners (KCF, county LPDP desk), a reporter cohort, and Phase 1 hardening.

---

## Product risks (engineering)

| Risk | Why it matters |
| --- | --- |
| Unauthenticated ingest + PDF generation | Spam can inflate community-supported clusters |
| Rate-limit config unused | Documented but not enforced |
| Cluster id re-anchored on new matches | LPDP cluster identity can shift |
| Approximate wards | Not official Nairobi planning units |

---

## Remaining product gaps (this pass)

UI copy now says **Pending** vs **Community-supported**. These are still not built:

| Gap | Why it stays out |
| --- | --- |
| Field-verified / Resolved statuses | Schema only has `is_verified` + `cluster_id`. Those labels appear only on About and the LPDP methodology, never as live badges. |
| Auth / planner ACL | Dashboard and report ingest remain open. |
| Moderation or resolution queue | No status PATCH; no planner actions beyond viewing and compiling evidence. |
| Official Nairobi ward polygons | Labels are approximate bounding boxes. |
| Gallery upload / offline report queue | Camera photo is optional and already shipped; gallery and offline queue are out of product rules. |
| Photo disk 404s | Uploaded files live on the API host disk. If the disk is missing or rotated, `photo_url` still 404s. |
| Production API routing | Vercel still proxies `/api` on urbanmesh.space to the Render API. |

Do not seed production. Empty maps and zero charts are real until residents report.

---

## How to update this file

When a capability changes, update **Status** / **Notes** here and keep [`roadmap.md`](./roadmap.md) about what the pilot still has to prove.
