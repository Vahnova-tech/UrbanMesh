# UrbanMesh Admin — field operations

Action-focused admin for reviewing, verifying, moderating, and resolving hazard reports.

**Community-supported ≠ field-verified.** Spatial corroboration (≥3 same-category reports within 15 m) does not prove a hazard was inspected. Field verification is recorded separately and audited.

## Capabilities (built)

| Area | Actions |
| --- | --- |
| Dashboard | Totals, pending queue, community-supported, field-verified, resolved, flagged, category breakdown, recent audit |
| Review queue | Search, filter, inspect evidence, contextual actions |
| Report detail | Evidence, map, nearby/cluster, audit history |
| Map | Geographic browse with status/category filters |
| Workflow | Verify in field, flag, reject, resolve, reopen, archive, restore, merge duplicate, edit category |

Reasons are required for reject, flag, archive, merge, resolve, and category edits. Destructive actions use confirmation dialogs. Consequential actions write to `admin_audit_logs`.

## Setup

1. Apply schema (once):

```bash
psql "$DATABASE_URL" -f apps/api/prisma/sql/admin_workflow.sql
# or from apps/api:
npx prisma db push
```

2. Set `ADMIN_API_TOKEN` in `apps/api/.env`. Production **must** set a strong secret.

3. Run:

```bash
npm install --prefix apps/admin
npm run dev:admin
```

Open [http://localhost:5175](http://localhost:5175) and sign in with the admin token.

## API

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/v1/admin/session` | Bearer auth check |
| GET | `/api/v1/admin/dashboard` | Stats + recent audit |
| GET | `/api/v1/admin/reports?review=queue\|all\|…` | List + summary (`q`, `category`) |
| GET | `/api/v1/admin/reports/:id` | Detail, nearby, cluster, audit |
| POST | `/api/v1/admin/reports/:id/actions/:action` | See actions below |

**Actions:** `approve_field`, `reject`, `flag`, `resolve`, `reopen`, `archive`, `restore`, `merge_duplicate`, `reset_queue`, `edit_category`

Back-compat: `POST …/approve`, `…/reject`, `…/reset`.

## Not yet

- Analytics charts / PDF evidence briefs
- User accounts & role management (no auth accounts yet)
- Settings UI for thresholds (env-driven today)
