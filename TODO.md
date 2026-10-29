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
- [ ] First entities and migrations (decide naming/ID conventions, e.g. UUIDs)
- [ ] Image/media storage for listings
- [x] KYC (identity verification for Agents/Landlords) — implemented per `docs/kyc-module.md` (Cloudinary storage + local dev fallback). Pending: run the `CreateKycTables` migration, and the `RequireVerifiedLister` soft-gate guard lands with the Listings module

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
