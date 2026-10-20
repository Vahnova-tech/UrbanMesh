# UrbanMesh Admin — field review

Approve or reject resident hazard reports. Rejection hides a report from the public citizen map and listings. Approval is a **field-review** mark and does not replace spatial community corroboration (≥3 same-category reports within 15 m).

## Setup

1. Apply DB columns (once):

```bash
psql "$DATABASE_URL" -f apps/api/prisma/sql/add_review_status.sql
# or from apps/api:
npx prisma db push
```

2. Set `ADMIN_API_TOKEN` in `apps/api/.env` (see `.env.example`).
   Production **must** set a strong secret — the API refuses to start without it when `NODE_ENV=production`.

3. Install and run:

```bash
npm install --prefix apps/admin
npm run dev:admin
```

Open [http://localhost:5175](http://localhost:5175) and sign in with the admin token.

## API

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/v1/admin/session` | Bearer auth check |
| GET | `/api/v1/admin/reports?review=pending\|approved\|rejected\|all` | Queue |
| POST | `/api/v1/admin/reports/:id/approve` | Body `{ note? }` |
| POST | `/api/v1/admin/reports/:id/reject` | Body `{ note? }` — hides from public |
| POST | `/api/v1/admin/reports/:id/reset` | Back to pending queue |
