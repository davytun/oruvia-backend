# Listings Module (Phase 1 Core)

## Overview

The Listings Module is how **Agents and Landlords publish properties** for rent or sale and how **anyone browses them**. This phase covers the **core**: publish (create), public search with filters, and public detail, all behind the KYC **soft gate** on publishing.

Listings are a **business entity shared across roles**, deliberately held in a single table (see Build Decisions) so cross-role search and pagination work without UNIONs. The lister's identity is **referenced**, not embedded in a users table.

Out of scope for this phase (Phase 2 / later): lister dashboard (edit, mark rented/sold, delete), favourites, inspection booking, messaging, map view, and full-text/relevance search.

---

## Architecture & Data Model

### Single `listings` table
Every listing row carries a polymorphic owner reference and a snapshot of the lister's identity at publish time:

- `id`: UUID primary key (`uuid_generate_v4()`)
- `lister_type`: `agent` | `landlord` (CHECK enforced)
- `lister_id`: UUID referencing `agent_users(id)` / `landlord_users(id)` by convention (no cross-table FK — a deliberate deviation, see Build Decisions)
- `lister_display_name`: varchar(255), **snapshotted** at publish
- `lister_verified`: boolean, **snapshotted** at publish ("verified at time of listing")
- `title`: varchar(120)
- `listing_type`: `rent` | `sale` (CHECK enforced)
- `price`: bigint (whole naira, no kobo) · `currency`: varchar(3), default `NGN`
- `state` / `city`: varchar(60) · `address`: text, nullable
- `latitude` / `longitude`: double precision, nullable (future map view)
- `property_type`: one of `apartment`, `duplex`, `terrace`, `detached`, `semi_detached`, `bungalow`, `penthouse`, `land`, `other`
- `bedrooms` / `bathrooms`: int · `description`: text
- `amenities`: text[] (default `{}`) · `image_urls`: text[] (ordered, 3–10 public URLs)
- `status`: `active` | `rented` | `sold` (CHECK enforced) — **Core only ever writes `active`**
- `created_at` / `updated_at`: timestamptz · `deleted_at`: timestamptz (`@DeleteDateColumn`, created for Phase 2 soft-delete readiness)

### Indexes
`idx_listings_type_price (listing_type, price)`, `idx_listings_location (state, city)`, `idx_listings_property_type`, `idx_listings_lister (lister_id)`, and a partial `idx_listings_active` over `created_at` `WHERE status = 'active' AND deleted_at IS NULL` for the browsable set.

### Verified badge is a snapshot, not a join
The lister's display name and verification status are denormalized onto the row at publish. Search results and detail pages render the Verified badge with **no role-table join**, mirroring the denormalization rationale in `docs/kyc-module.md`.

---

## Photo Storage (public-image provider)

Listing photos are **public** — this is the opposite access model to KYC ID documents (which must never be public). A dedicated `ListingsStorageProvider` is therefore used rather than generalizing the KYC provider.

- **Cloudinary** (`LISTINGS_STORAGE_PROVIDER=cloudinary`): uploaded server-side via the signed REST API as `resource_type=image` with public delivery; the stored value is the Cloudinary `secure_url`. Uses folder `CLOUDINARY_LISTINGS_FOLDER` and reuses `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET`.
- **`local`** dev/test fallback (`LISTINGS_UPLOAD_DIR`): writes under the configured directory and returns a `/media/listings/<name>` placeholder path (static file serving is out of scope this phase). Rejected by env validation in production.
- Constraints: **3–10 photos**, each **≤ 5 MB**, MIME `image/jpeg | image/png | image/webp`. Photos arrive as multipart file parts, never as DTO string fields.
- The provider is selected by a `useFactory` keyed on `LISTINGS_STORAGE_PROVIDER`, mirroring `docs/kyc-module.md`'s provider shape.

---

## Environment Variables

| Variable | Default | Required in Prod | Description |
|---|---|---|---|
| `LISTINGS_STORAGE_PROVIDER` | `local` | Yes (must be `cloudinary`) | Photo storage backend: `cloudinary` or `local` (dev/test fallback; rejected in production) |
| `LISTINGS_UPLOAD_DIR` | `uploads/listings` | No | Storage root for the `local` provider |
| `CLOUDINARY_LISTINGS_FOLDER` | `oruvia/listings` | No | Public folder for listing photos |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | _(empty)_ | Yes (if any cloudinary provider) | Shared Cloudinary credentials (also used by KYC) |

---

## Endpoints

Mounted under `/api/v1`. Write routes are role-nested like the KYC precedent; reads are public. Responses follow the standard envelope; the paginated payload lands inside `data` as `{ items, meta: { page, limit, total } }`.

### Public reads

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/listings` | Public | Search active listings. Filters: `listingType`, `minPrice`, `maxPrice`, `state`, `city`, `propertyType`, `bedrooms` (minimum). Pagination: `page` (≥1, default 1), `limit` (1–50, default 12). Newest first. |
| `GET` | `/api/v1/listings/:id` | Public | Listing detail (UUID-validated). Returns the snapshot Verified badge and lister display name. |

### Authenticated writes

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/agents/listings` | `AgentJwtAuthGuard` + `RequireVerifiedListerGuard` | Publish a listing (multipart: `photos` + scalar fields). Throttled 10/min. |
| `POST` | `/api/v1/landlords/listings` | `LandlordJwtAuthGuard` + `RequireVerifiedListerGuard` | Same shape for landlords. |

---

## Soft-Gate Enforcement

- `RequireVerifiedListerGuard` is the **second** guard on the write routes; it reads the role entity attached by the JWT strategy and allows only `verificationStatus === 'approved'`. Otherwise it throws `403 KYC_NOT_APPROVED` with the current status embedded so the frontend renders the correct CTA (`docs/kyc-module.md`).
- Browse and detail stay fully public — verification gates **publishing only**.

---

## Security Protections

1. **Strict DTOs:** `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`) rejects unexpected fields; scalars are validated by class-validator. Photos are never accepted as string fields.
2. **File constraints:** 3–10 photos, ≤ 5 MB each, JPEG/PNG/WebP only — validated per file before any storage call.
3. **Atomic media:** every photo is stored before the DB write; a null provider result responds `503 LISTING_MEDIA_UNAVAILABLE` and no row is written (an orphaned stored file is acceptable; a listing pointing at a missing photo is not).
4. **No ownership overreach:** the owner reference comes from the authenticated principal, never from the request body.
5. **Rate limiting:** publish routes throttled in line with auth endpoints (10/min per IP).
6. **Serializer-only responses:** the service maps rows through explicit serializers; the raw entity (and audit/soft-delete columns) never reaches clients.

### Error codes
| Code | HTTP | Where |
|---|---|---|
| `KYC_NOT_APPROVED` | 403 | Publish when the lister is not `approved` (status embedded) |
| `LISTING_PHOTOS_INSUFFICIENT` | 400 | Fewer than 3 photos |
| `LISTING_PHOTOS_EXCEEDED` | 400 | More than 10 photos |
| `LISTING_PHOTO_TYPE_INVALID` | 400 | Non-JPEG/PNG/WebP photo |
| `LISTING_PHOTO_TOO_LARGE` | 400 | A photo over 5 MB |
| `LISTING_MEDIA_UNAVAILABLE` | 503 | Storage provider returned no URL |
| `LISTING_NOT_FOUND` | 404 | Detail for a missing/non-active listing |

---

## Build Decisions (closed at implementation)

| Decision | Resolution |
|---|---|
| Placement | New top-level `src/listings/`; `ListingsModule` imported into `AppModule`; imports `AgentModule`/`LandlordModule` so the role JWT strategies resolve |
| Single table | One `listings` table with `(lister_type, lister_id)` owner reference. Unified cross-role search/pagination requires it; the isolation tenet (`docs/developer-guide.md`) targets **identity** tables, not business entities |
| Snapshot badge | `lister_display_name` + `lister_verified` copied at publish; no live join |
| Photo storage | Dedicated public-image `ListingsStorageProvider` (Cloudinary `secure_url`), separate from the private KYC provider |
| Migration | `src/database/migrations/1792161067220-CreateListingsTable.ts` (after the KYC tables) |
| Phase 2 readiness | `status` and `deleted_at` exist now; Core writes only `active` |

## Dependencies

- KYC module (`docs/kyc-module.md`) — the `RequireVerifiedLister` soft gate consumes `verification_status`.
- Existing: role JWT guards and decorators, `mail` module (unchanged), response envelope, global `ValidationPipe`, throttler.
