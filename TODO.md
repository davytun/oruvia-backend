# TODO

Future decisions and work. None of this is implemented in Phase 1.

## Authentication
- [ ] Choose strategy per PRD (email and/or phone OTP) and the OTP provider
- [ ] Token lifecycle: access/refresh lifetimes, rotation, revocation, storage
- [ ] Password hashing policy (`bcrypt` is already installed)
- [ ] Decide what to do with the currently installed `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`

## Business modules
- [ ] Users and roles (Seeker, Agent, Landlord, Admin)
- [ ] Listings, search and filters, favourites, inspection booking, messaging
  - [x] Listings Phase 1 Core (publish, public search + filters, detail, verified soft-gate) — implemented per `docs/listings-module.md`. Migrations applied. Phase 2 deferrals: favourites, inspection booking, messaging, map view
  - [x] Listings Phase 2 Lister Dashboard (list own, edit scalars, mark rented/sold, soft delete) — implemented per `docs/listings-module.md`. No migration needed (`status`/`deleted_at` already existed). Pending Phase 2: favourites, inspection booking, messaging, photo replacement on edit, restore of soft-deleted
  - [ ] Favourites, inspection booking, messaging (Phase 2)
- [ ] First entities and migrations (decide naming/ID conventions, e.g. UUIDs)
- [x] Image/media storage for listings — public-image `ListingsStorageProvider` (Cloudinary `secure_url` + local dev fallback), delivered with Listings Phase 1 Core
- [x] KYC (identity verification for Agents/Landlords) — implemented per `docs/kyc-module.md` (Cloudinary storage + local dev fallback). Migrations applied, and the `RequireVerifiedLister` soft-gate guard landed with the Listings module

## Validation and authorization
- [ ] Per-feature DTOs and validation rules
- [ ] Role-based authorization and ownership checks
- [ ] Rate limiting / abuse protection on public endpoints
- [ ] Decide pagination conventions in code (types) once the first list endpoint exists

## Logging and observability
- [ ] `@nestjs/observe` was removed from the app (not needed in development). If wanted in production, re-add it only when `NODE_ENV=production`, with real credentials from env
- [ ] Structured logging and request IDs; redaction policy for sensitive fields
- [ ] Split health into liveness vs. readiness if the platform needs it

## Testing and deployment
- [ ] Testing strategy: DB for e2e (dedicated test database or containers), fixtures
- [ ] CI pipeline (lint, build, unit, e2e)
- [ ] Deployment target, `trust proxy` setting, TLS/`DB_SSL` for the managed database
- [ ] Production migration process (run `migration:run` as a release step)
- [x] Remove the scaffold `AppController`/`AppService` ("Hello World")
- [ ] Swagger/OpenAPI setup (`@nestjs/swagger` is installed)
