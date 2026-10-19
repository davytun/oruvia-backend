# Oruvia Backend

Backend REST API service for the Oruvia Housing Platform. Built with **NestJS**, **PostgreSQL**, **TypeORM**, and **TypeScript (NodeNext)**.

---

## Features & Architecture

- **Multi-Role Identity Isolation:** Separate account tables and independent authentication flows (`seeker_users`, future `landlord_users`, etc.). No shared polymorphic user tables or conflated permissions.
- **Stateless JWT with Instant Invalidation:** Fast stateless authorization with database-backed `tokenVersion` increments for global session revocation on password changes and resets.
- **Cryptographic Verification Codes:** Salted HMAC-SHA256 hashed 6-digit codes resisting CPU-exhaustion DoS attacks with a 15-minute expiry, 5-attempt threshold, and 60-second cooldown protection.
- **Flexible Email Engine:** Outbound mail abstraction supporting in-memory simulation (`EMAIL_PROVIDER=console`) and live SMTP delivery (`EMAIL_PROVIDER=smtp`) with **React Email** responsive HTML and plain-text templates.
- **Interactive OpenAPI / Swagger Documentation:** Integrated Swagger UI available at [`/docs`](http://localhost:3000/docs) with Bearer token authentication and schema models.
- **Standardized Response Envelope:** Every response adheres to a strict contract with end-to-end distributed tracing via `x-request-id`.

---

## Quick Start

### Prerequisites
- Node.js `20.11+`
- pnpm `9+`
- PostgreSQL `16+`

### 1. Installation
```bash
git clone <repo-url>
cd oruvia
pnpm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and fill in your database credentials:
```bash
cp .env.example .env
```

| Variable | Default | Required | Purpose |
|---|---|---|---|
| `PORT` | `3000` | No | HTTP listening port |
| `DB_HOST` | `localhost` | No | PostgreSQL host |
| `DB_PORT` | `5432` | No | PostgreSQL port |
| `DB_USERNAME` | - | **Yes** | PostgreSQL user |
| `DB_PASSWORD` | - | **Yes** | PostgreSQL password |
| `DB_NAME` | `oruvia` | **Yes** | PostgreSQL database name |
| `DB_SSL` | `false` | No | Set `true` for TLS managed databases (e.g. Neon) |
| `JWT_SECRET` | dev default | **Yes in prod** | Min 32 chars (dev default rejected in prod) |
| `EMAIL_PROVIDER` | `console` | No | `console` (dev/test) or `smtp` (production) |
| `SMTP_HOST` | - | **If smtp** | Outbound SMTP host (e.g., SendGrid, Mailgun, Postmark) |
| `SMTP_PORT` | `587` | No | SMTP port (e.g. 587, 465) |
| `SMTP_SECURE` | `false` | No | `true` for SSL, `false` for STARTTLS |
| `SMTP_USER` | - | **If smtp** | SMTP username |
| `SMTP_PASS` | - | **If smtp** | SMTP password |

### 3. Run Migrations
```bash
pnpm migration:run
```

### 4. Start Development Server
```bash
pnpm start:dev
```

The server will be available at `http://localhost:3000`.

---

## Interactive API Documentation

Once the server is running, explore and test the endpoints interactively via Swagger UI:

- **Swagger UI:** [`http://localhost:3000/docs`](http://localhost:3000/docs)
- **OpenAPI JSON Spec:** [`http://localhost:3000/docs-json`](http://localhost:3000/docs-json)

---

## Seeker API Reference

All seeker endpoints are under the global prefix `/api/v1/seekers`:

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/seekers/register` | Public | Register seeker account and dispatch verification code |
| `POST` | `/api/v1/seekers/verify-email` | Public | Validate 6-digit code and activate seeker account |
| `POST` | `/api/v1/seekers/resend-verification-code` | Public | Request fresh verification code (non-enumerating) |
| `POST` | `/api/v1/seekers/login` | Public | Authenticate; returns JWT access token and seeker profile |
| `POST` | `/api/v1/seekers/change-password` | Bearer JWT | Change password; revokes all existing JWT sessions |
| `POST` | `/api/v1/seekers/forgot-password` | Public | Request password reset code (non-enumerating) |
| `POST` | `/api/v1/seekers/reset-password` | Public | Reset password with valid code; revokes all previous tokens |
| `GET` | `/api/v1/seekers/me` | Bearer JWT | Retrieve authenticated seeker profile |

---

## Landlord API Reference

All landlord endpoints are under the global prefix `/api/v1/landlords`:

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/landlords/register` | Public | Register landlord account and dispatch verification code |
| `POST` | `/api/v1/landlords/verify-email` | Public | Validate 6-digit code and activate landlord account |
| `POST` | `/api/v1/landlords/resend-verification-code` | Public | Request fresh verification code (non-enumerating) |
| `POST` | `/api/v1/landlords/login` | Public | Authenticate; returns JWT access token and landlord profile |
| `POST` | `/api/v1/landlords/change-password` | Bearer JWT | Change password; revokes all existing JWT sessions |
| `POST` | `/api/v1/landlords/forgot-password` | Public | Request password reset code (non-enumerating) |
| `POST` | `/api/v1/landlords/reset-password` | Public | Reset password with valid code; revokes all previous tokens |
| `GET` | `/api/v1/landlords/me` | Bearer JWT | Retrieve authenticated landlord profile |

---

## Agent API Reference

All agent endpoints are under the global prefix `/api/v1/agents`:

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/agents/register` | Public | Register agent account and dispatch verification code |
| `POST` | `/api/v1/agents/verify-email` | Public | Validate 6-digit code and activate agent account |
| `POST` | `/api/v1/agents/resend-verification-code` | Public | Request fresh verification code (non-enumerating) |
| `POST` | `/api/v1/agents/login` | Public | Authenticate; returns JWT access token and agent profile |
| `POST` | `/api/v1/agents/change-password` | Bearer JWT | Change password; revokes all existing JWT sessions |
| `POST` | `/api/v1/agents/forgot-password` | Public | Request password reset code (non-enumerating) |
| `POST` | `/api/v1/agents/reset-password` | Public | Reset password with valid code; revokes all previous tokens |
| `GET` | `/api/v1/agents/me` | Bearer JWT | Retrieve authenticated agent profile |

---

## Testing & Quality Assurance

```bash
# Code style and lint check (oxlint)
pnpm lint

# Unit tests with Vitest (100% passing)
pnpm test

# End-to-end integration tests (Vitest + Supertest)
pnpm test:e2e

# Compile production bundle
pnpm build
```

---

## Documentation Index

- [Developer Guide & Architecture](docs/developer-guide.md): Deep-dive architectural patterns, security model, and contribution guide.
- [Seeker Account Module](docs/seeker-account-module.md): Detailed specifications, rate limiting, and code lifecycle for the seeker module.
- [Landlord Account Module](docs/landlord-account-module.md): Detailed specifications, account isolation, and code lifecycle for the landlord module.
- [Agent Account Module](docs/agent-account-module.md): Detailed specifications, account isolation, and code lifecycle for the agent module.
- [Backend Foundation](docs/backend-foundation.md): Foundation pipeline, middlewares, filters, and interceptor contracts.


