# UrbanMesh Admin

Production admin for hazard report moderation: review queue, disprove, soft-delete, field inspection, resolution, map, analytics, and audit logs.

**Semantics**

| Status | Meaning |
| --- | --- |
| Community-supported | Spatial corroboration only (≥N within radius) — **not** field verification |
| Field-verified (`APPROVED`) | Admin recorded an on-site inspection |
| Disproved | Claim invalidated after review; evidence retained; excluded from public maps/clusters |
| Deleted / archived | Soft-deleted; recoverable; excluded from public views |
| Resolved | Issue addressed with a resolution note |

Disprove ≠ delete. Lack of corroboration alone is not grounds to disprove.

## Setup

```bash
# Schema (includes DISPROVED / UNDER_REVIEW)
psql "$DATABASE_URL" -f apps/api/prisma/sql/add_disproved_status.sql
# or
cd apps/api && npx prisma db push

# Required in production
ADMIN_API_TOKEN=<strong-secret>

npm install --prefix apps/admin
npm run dev:admin   # http://localhost:5175
```

## Navigation

Overview · Reports map · Review queue · All reports · Disproved · Deleted/archived · Resolved · Analytics · PDF (planner pipeline) · Audit logs · Users (token auth today) · Settings (read-only thresholds)

## Key API

| Method | Path |
| --- | --- |
| GET | `/api/v1/admin/dashboard` |
| GET | `/api/v1/admin/reports?review=&q=&category=&field=&community=&sort=&limit=&offset=` |
| GET | `/api/v1/admin/reports/:id` |
| GET | `/api/v1/admin/audit` |
| GET | `/api/v1/admin/disprove-reasons` |
| POST | `/api/v1/admin/reports/:id/actions/:action` |

Actions: `approve_field`, `disprove`, `delete` (archive), `under_review`, `flag`, `resolve`, `reopen`, `restore`, `merge_duplicate`, `edit_category`, `reset_queue`
