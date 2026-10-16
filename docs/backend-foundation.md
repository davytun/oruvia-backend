# Backend Foundation (Phase 1)

Shared infrastructure only. No business modules, entities, or auth exist yet.

## Project structure

```
src/
  main.ts                 Bootstrap: creates the app, applies configureApp(), listens on PORT
  app.setup.ts            Global config shared by main.ts and e2e tests (prefix, helmet, CORS, pipes…)
  app.module.ts           Root module (ConfigModule, DatabaseModule, HealthModule)
  config/
    env.validation.ts     Joi schema, defaults, and typed `Env` for all environment variables
  database/
    database.module.ts    TypeOrmModule.forRootAsync using validated config
    database.config.ts    buildDataSourceOptions(): single source of truth for the connection
    data-source.ts        DataSource export used only by the TypeORM CLI
    migrations/           Migration files live here (empty for now)
  health/                 GET /health (app up + PostgreSQL reachable)
test/                     e2e tests (need a reachable PostgreSQL)
```

`app.controller.ts` / `app.service.ts` are the untouched Nest scaffold (`GET /api/v1` → "Hello World!").

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

All routes are prefixed with `/api/v1`.

**Success:** return the resource (or an object) directly with the proper HTTP status.
No global response-wrapping interceptor. For collections that need pagination, return
`{ "data": [...], "meta": { "page": 1, "limit": 20, "total": 134 } }`.

**Errors:** Nest's built-in exception handling already produces one consistent shape for
every error (`HttpException`, validation failures, unknown routes, and unhandled
exceptions), so no custom filter is added:

```json
{ "statusCode": 400, "error": "Bad Request", "message": ["name must be a string"] }
```

- `message` is a `string`, or a `string[]` for validation errors.
- Unhandled errors return `{ "statusCode": 500, "message": "Internal server error" }`;
  details are logged server-side only, never returned.
- Throw Nest's built-in exceptions (`NotFoundException`, `ConflictException`, …) from services.

**Health:** `GET /api/v1/health` → `200 { "status": "ok", "database": "up" }`, or
`503` in the standard error format when `SELECT 1` against PostgreSQL fails.

## Global validation and security

Configured in `src/app.setup.ts`:

- `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, and `transform` all `true`.
- `helmet()` default security headers.
- JSON/urlencoded body limit: `100kb` (multipart uploads will get their own limits later).
- CORS is off unless `CORS_ORIGINS` is set; only listed origins are allowed.
- `enableShutdownHooks()` so SIGTERM/SIGINT close the HTTP server and DB pool cleanly.
- Startup retries the database 3 times, then exits.
- Logging: only Nest's default logger; request bodies and headers are never logged.
  Env validation errors name variables but never print values.

## Status

| Implemented | Planned (see [TODO.md](../TODO.md)) |
| --- | --- |
| Env validation, `.env.example`, git-ignore rules | Authentication and token lifecycle |
| `/api/v1` prefix, helmet, CORS, body limits, shutdown hooks | Users and business modules |
| TypeORM/PostgreSQL connection, migration tooling | First entities and migrations |
| Global `ValidationPipe` | Authorization, rate limiting |
| Standard error format (built-in Nest behaviour) | Structured logging, observability |
| `GET /api/v1/health` with real DB check | CI/CD, deployment config |
