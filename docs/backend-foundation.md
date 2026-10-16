# Backend Foundation (Phase 1)

Shared infrastructure only. No business modules, entities, or auth exist yet.

## Project structure

```
src/
  main.ts                 Bootstrap: creates the app, applies configureApp(), listens on PORT
  app.setup.ts            Global pipeline shared by main.ts and e2e tests (see below)
  app.module.ts           Root module (ConfigModule, DatabaseModule, HealthModule)
  common/
    interfaces/           ApiSuccessResponse / ApiErrorResponse types (the response contract)
    middleware/           requestIdMiddleware + getRequestId()
    pipes/                createValidationPipe() (global ValidationPipe + error details)
    interceptors/         ResponseEnvelopeInterceptor, LoggingInterceptor
    filters/              AllExceptionsFilter (the only place errors become responses)
  config/
    env.validation.ts     Joi schema, defaults, and typed `Env` for all environment variables
  database/
    database.module.ts    TypeOrmModule.forRootAsync using validated config
    database.config.ts    buildDataSourceOptions(): single source of truth for the connection
    data-source.ts        DataSource export used only by the TypeORM CLI
    migrations/           Migration files live here (empty for now)
  health/                 GET /health (app up + PostgreSQL reachable)
test/                     e2e tests
  pipeline.e2e-spec.ts    Global pipeline via a probe controller (no database needed)
  app.e2e-spec.ts         Full AppModule incl. health (needs a reachable PostgreSQL)
```

`common/guards/` and `common/decorators/` are intentionally absent until authentication
exists; add them with the first feature that needs them.
## Local setup

Requirements: Node 20.11+, pnpm, a running PostgreSQL with an empty database.

```bash
pnpm install
copy .env.example .env     # macOS/Linux: cp .env.example .env
# edit .env: set DB_USERNAME, DB_PASSWORD, DB_NAME (and DB_HOST/DB_PORT if not default)
pnpm start:dev
curl http://localhost:3000/api/v1/health
```

### Environment variables

Validated at startup (`src/config/env.validation.ts`). The app refuses to start if validation fails.

| Variable | Default | Notes |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development` \| `test` \| `production` |
| `PORT` | `3000` | |
| `CORS_ORIGINS` | _(empty)_ | Comma-separated origins. Empty = CORS disabled |
| `DB_HOST` | `localhost` | |
| `DB_PORT` | `5432` | |
| `DB_USERNAME` | **required** | |
| `DB_PASSWORD` | **required** | |
| `DB_NAME` | **required** | |
| `DB_SSL` | `false` | `true` enables TLS with certificate verification |
| `DB_LOGGING` | `false` | `true` also logs TypeORM warnings and migrations (errors always logged) |

`.env*` files are git-ignored; only `.env.example` is committed.

## Database and migrations

- PostgreSQL via TypeORM, configured in `database.config.ts`. `synchronize` is always `false`.
- Entities are discovered from `**/*.entity.js`, migrations from `src/database/migrations`
  (compiled to `dist/`).
- Migration commands run against the compiled build (no `ts-node`) and read `.env` through
  `node --env-file`. Each command except `create` runs `nest build` first.

```bash
pnpm migration:create src/database/migrations/<Name>    # empty migration
pnpm migration:generate src/database/migrations/<Name>  # diff entities vs. database
pnpm migration:run
pnpm migration:revert
pnpm migration:show
```

## API conventions

All routes are prefixed with `/api/v1`. Every response carries an `X-Request-Id` header.

**Success** (any 2xx with a body) is wrapped by `ResponseEnvelopeInterceptor`:

```json
{ "success": true, "data": { "status": "ok", "database": "up" }, "requestId": "b1f0…" }
```

- Handlers return the plain resource; the envelope is added globally. No result → `data: null`.
- Not wrapped: streams, `StreamableFile`, `Buffer`, 204/205/304, and handlers that write the
  response themselves via `@Res()`.
- Pagination convention (when the first list endpoint exists): return
  `{ items: [...], meta: { page, limit, total } }` as the handler result, so it lands inside `data`.

**Errors** (all of them: `HttpException`s, validation, unknown routes, body-parser errors,
unhandled exceptions) are produced by `AllExceptionsFilter`:

```json
{
  "success": false,
  "statusCode": 400,
  "code": "VALIDATION_FAILED",
  "message": "Validation failed",
  "details": [{ "field": "email", "messages": ["email must be an email"] }],
  "requestId": "b1f0…",
  "timestamp": "2026-01-01T12:00:00.000Z"
}
```

- `details` appears only for validation failures (nested fields use dotted paths, and
  submitted values are never echoed).
- `code` is stable and machine-readable. By default it is the HTTP status name
  (`NOT_FOUND`, `CONFLICT`, `SERVICE_UNAVAILABLE`, …). Services can supply a domain code:
  `throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email already registered' })`.
- Expected errors: throw Nest's built-in exceptions; their status is preserved (never turned into 500).
- Unexpected errors → `500 INTERNAL_SERVER_ERROR` / `"Internal server error"`. No stack, SQL,
  paths or secrets reach the client; the real error and stack are logged with the request ID.
- Other codes: `MALFORMED_REQUEST` (400, invalid JSON / bad URL encoding), `PAYLOAD_TOO_LARGE` (413).
- To log a 5xx's underlying error without exposing it, pass it as the exception's cause:
  `new ServiceUnavailableException('Database unavailable', { cause: error })`.

**Health:** `GET /api/v1/health` → `200` with `data: { status: "ok", database: "up" }`, or
`503 SERVICE_UNAVAILABLE` when `SELECT 1` against PostgreSQL fails.

## Global request pipeline

Configured in `src/app.setup.ts`, in this order for an incoming request:

1. `requestIdMiddleware`: reuses a valid inbound `X-Request-Id` (8–128 chars of
   `A-Za-z0-9._-`), otherwise generates a UUID; sets the response header and `res.locals.requestId`.
2. `helmet()` security headers.
3. JSON/urlencoded body parsers (`100kb` limit; multipart uploads will get their own limits later).
4. CORS: off unless `CORS_ORIGINS` is set; only listed origins; `X-Request-Id` is exposed.
5. Guards: none yet (auth guards will be added with authentication).
6. Interceptors (request in order, response in reverse): `LoggingInterceptor` (times the handler,
   logs successes) → `ResponseEnvelopeInterceptor`.
7. `ValidationPipe`: `whitelist`, `forbidNonWhitelisted`, `transform`; failures → 400 `VALIDATION_FAILED`.
8. Route handler.
9. On any error at any step: `AllExceptionsFilter` (logs once, writes the error body).

Also: `enableShutdownHooks()` so SIGTERM/SIGINT close the HTTP server and DB pool cleanly, and
startup retries the database 3 times, then exits.

### Logging

- Nest's default logger. Successful request: `[requestId] GET /api/v1/health 200 12ms`.
  Failed request (logged only by the filter): `warn` for 4xx, `error` with stack for 5xx.
- Only method, path (never the query string), status, code and request ID are logged. Request
  bodies, headers, cookies and tokens are never logged. Parser error messages (which can quote
  the body) are replaced before logging. Env validation errors name variables but never values.

## Status

| Implemented | Planned (see [TODO.md](../TODO.md)) |
| --- | --- |
| Env validation, `.env.example`, git-ignore rules | Authentication and token lifecycle |
| `/api/v1` prefix, helmet, CORS, body limits, shutdown hooks | Users and business modules |
| TypeORM/PostgreSQL connection, migration tooling | First entities and migrations |
| Request IDs (`X-Request-Id` header, middleware, logs) | Guards, authorization, rate limiting |
| Global `ValidationPipe` with sanitized per-field details | Structured (JSON) logging, redaction policy |
| Standard success envelope and error contract with stable codes | Dedicated test database strategy |
| Observability/timing interceptor + safe error logging | CI/CD, deployment config |
| `GET /api/v1/health` with real DB check | Swagger/OpenAPI setup |
| Unit tests + DB-free pipeline e2e + DB e2e | |

