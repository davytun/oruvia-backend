# Oruvia Backend — Cloudflare Deployment Guide

## 1. Authenticate Wrangler

Log in to your Cloudflare account:

```bash
npx wrangler login
```

---

## 2. Provision Cloudflare Resources (First-Time Setup)

### 2.1 Create the D1 Database

```bash
npx wrangler d1 create oruvia-db
```

Copy the `database_id` printed in the terminal output and replace `"00000000-0000-0000-0000-000000000000"` in [`wrangler.jsonc`](../wrangler.jsonc):

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "oruvia-db",
    "database_id": "<your-real-d1-database-id>",
    "migrations_dir": "src/database/migrations"
  }
]
```

### 2.2 Create the R2 Bucket

```bash
npx wrangler r2 bucket create oruvia-media
```
*(Note: If R2 is not yet enabled on your Cloudflare account, you can temporarily comment out `r2_buckets` in `wrangler.jsonc` until media uploads are needed.)*

---

## 3. Apply Remote D1 Migrations

Once `database_id` is set in `wrangler.jsonc`, apply the database schema to your remote D1 instance:

```bash
npm run db:migrate:remote
```

---

## 4. Configure Production Secrets

Set the required `JWT_SECRET` in Cloudflare Workers (never commit real secrets to `wrangler.jsonc`):

```bash
npx wrangler secret put JWT_SECRET
```

Optional secrets (when email delivery is enabled):

```bash
npx wrangler secret put RESEND_API_KEY
```

---

## 5. Deploy to Cloudflare Workers

```bash
npm run deploy
```

Once deployed, your live endpoints will be available at:
- **API Root**: `https://<your-worker>.workers.dev/`
- **Interactive API Docs**: `https://<your-worker>.workers.dev/docs`
- **OpenAPI 3.1 Spec**: `https://<your-worker>.workers.dev/openapi.json`
- **Health Check**: `https://<your-worker>.workers.dev/api/v1/health`

