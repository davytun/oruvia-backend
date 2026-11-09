# Oruvia Backend — Developer Architecture Guide

**Tagline:** Oruvia: Your path to a roof.

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Cloudflare Workers |
| Web Framework | Hono (`^4.13.x`) |
| Database | Cloudflare D1 (SQLite) + Drizzle ORM (`drizzle-orm`, `drizzle-kit`) |
| File Storage | Cloudflare R2 (`BUCKET` binding) |
| Validation | Zod (`zod` + `@hono/zod-validator`) |
| Authentication | JWT (`hono/jwt`, HS256) + Web Crypto PBKDF2-SHA256 + D1 Sessions |
| Email Templates | React Email (`@react-email/components`, `@react-email/render`) |
| API Testing | Hono CLI (`@hono/cli`) |

---

## 2. Project Directory Structure

```text
oruvia-backend/
├── docs/
│   ├── requirements.md      # Product requirements & MVP scope
│   ├── roles.md             # Role definitions & separate role tables rules
│   ├── architecture.md      # Developer setup, architecture & conventions
│   └── api.md               # REST API endpoint reference
├── src/
│   ├── config/              # App constants, Hono factory & environment bindings
│   ├── controllers/         # Thin HTTP handlers (parse request -> call service -> send response)
│   ├── database/            # Drizzle D1 instance, middleware & SQL migrations
│   ├── middleware/          # Auth middleware & global error/notFound handlers
│   ├── models/              # Drizzle SQLite table definitions
│   ├── routes/              # Hono route definitions mounted under /api/v1
│   ├── services/            # All business logic & database operations
│   ├── templates/           # React Email transactional templates
│   ├── utils/               # Error classes, response formatters, crypto & Zod schemas
│   └── index.ts             # Application entrypoint
├── drizzle.config.ts        # Drizzle Kit configuration
├── wrangler.jsonc           # Cloudflare Workers, D1 & R2 configuration
└── package.json
```

---

## 3. Core Engineering Conventions

1. **Business Logic Lives in Services (`src/services/`)**
   - Controllers (`src/controllers/`) must remain thin: read input from `c.req`, call a service function, and return `sendSuccess`, `sendCreated`, or `sendPaginated`.
   - Services (`src/services/`) contain all validation rules, database queries, and domain logic, throwing `AppError` subclasses when errors occur.
2. **Concrete Code (No Generic Wrappers)**
   - Keep utility and service functions concrete and straightforward without over-engineered TypeScript generic wrappers.
3. **Separate Table per Role (`users` + `seekers`, `agents`, `landlords`, `admins`)**
   - `users` stores only authentication and core identity (`id`, `full_name`, `email`, `phone`, `password_hash`, `avatar_url`, `is_suspended`, login lockout state).
   - Every role has its own table (`seekers`, `agents`, `landlords`, `admins`) with its own `id` and a unique `user_id` referencing `users.id`.
   - Every new account receives a `seekers` record on registration and can also create an `agents` and/or `landlords` record without role or foreign-key conflicts.

---

## 4. Standardized API Response Structure

### 4.1 Single Resource / Action Success (`200 OK` / `201 Created`)

```json
{
  "success": true,
  "data": {
    "id": "usr_91238a",
    "full_name": "Alex Rivera",
    "email": "alex@example.com"
  }
}
```

### 4.2 Paginated List Success (`200 OK`)

```json
{
  "success": true,
  "data": [
    { "id": "prop_1", "title": "2 Bedroom Flat in Abeokuta" }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total_records": 154,
    "total_pages": 8
  }
}
```

### 4.3 Error Response (`4xx` / `5xx`)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The request entity contains invalid parameters.",
    "details": [
      {
        "field": "email",
        "issue": "The email address provided is already registered."
      },
      {
        "field": "password",
        "issue": "Password must be at least 8 characters long."
      }
    ]
  }
}
```

Standard error codes (`src/utils/errors.ts`):
- `BAD_REQUEST` (`400`)
- `VALIDATION_FAILED` (`400`)
- `UNAUTHORIZED` (`401`)
- `FORBIDDEN` (`403`)
- `NOT_FOUND` (`404`)
- `CONFLICT` (`409`)
- `UNPROCESSABLE_ENTITY` (`422`)
- `TOO_MANY_REQUESTS` (`429`)
- `INTERNAL_SERVER_ERROR` (`500`)

---

## 5. Local Development & Commands

### 5.1 Environment Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.dev.vars` from `.dev.vars.example`:
   ```bash
   cp .dev.vars.example .dev.vars
   ```
   Ensure `JWT_SECRET` is set to a secret string (at least 16+ characters).
3. Apply local D1 migrations:
   ```bash
   npm run db:migrate:local
   ```

### 5.2 Key Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start local Cloudflare Workers dev server (`wrangler dev`) |
| `npm run typecheck` | Run TypeScript compiler check (`tsc --noEmit`) |
| `npm run cf-typegen` | Regenerate `worker-configuration.d.ts` from `wrangler.jsonc` |
| `npm run db:generate` | Generate SQL migrations from Drizzle models in `src/models/` |
| `npm run db:migrate:local` | Apply migrations to local D1 database |
| `npm run db:migrate:remote` | Apply migrations to remote Cloudflare D1 database |
| `npx hono routes` | List all registered Hono routes |
| `npx hono request /api/v1/health` | Send an in-process test request using local bindings |

