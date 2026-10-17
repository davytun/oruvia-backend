# Oruvia Backend — Developer Guide

This guide provides technical reference, architectural decisions, coding conventions, and operational workflows for engineers contributing to the Oruvia backend platform.

---

## 1. System Architecture & High-Level Principles

Oruvia is built on **NestJS**, **TypeScript (ES2023 / NodeNext)**, **PostgreSQL**, and **TypeORM**.

```
                  Client Request
                        │
                        ▼
            ┌───────────────────────┐
            │  requestIdMiddleware  │  Assigns or propagates x-request-id
            └───────────┬───────────┘
                        ▼
            ┌───────────────────────┐
            │    Helmet Security    │  Configured with relaxed CSP for /docs
            └───────────┬───────────┘
                        ▼
            ┌───────────────────────┐
            │   ThrottlerGuard      │  IP-based rate limiting (10 req/min auth)
            └───────────┬───────────┘
                        ▼
            ┌───────────────────────┐
            │  LoggingInterceptor   │  Times execution duration & logs method/path
            └───────────┬───────────┘
                        ▼
            ┌───────────────────────┐
            │    ValidationPipe     │  Strict class-validator parsing & whitelist
            └───────────┬───────────┘
                        ▼
            ┌───────────────────────┐
            │   SeekerJwtAuthGuard  │  Validates Bearer token & active tokenVersion
            └───────────┬───────────┘
                        ▼
            ┌───────────────────────┐
            │ Controller & Service  │  Domain business logic & TypeORM access
            └───────────┬───────────┘
                        ▼
     Success ───────────┴─────────── Failure
        │                               │
        ▼                               ▼
┌──────────────────────────────┐  ┌──────────────────────────────┐
│  ResponseEnvelopeInterceptor │  │     AllExceptionsFilter      │
│  Wraps in { success: true }  │  │  Formats structured error    │
└──────────────────────────────┘  └──────────────────────────────┘
```

### Key Architectural Tenets

1. **Role-Isolated Identity Architecture:** Separate account tables and independent authentication flows are maintained for each account type (`seeker_users`, future `landlord_users`, etc.). No shared polymorphic `users` table or shared role columns are used.
2. **Stateless JWT with Instant Invalidation:** Authentication utilizes stateless signed JWTs containing a numeric `tokenVersion`. Password changes, resets, or security logouts increment `tokenVersion` in PostgreSQL, immediately invalidating all active sessions across all devices.
3. **DoS-Resistant Code Verification:** Short numeric verification codes (6 digits) are hashed using salted HMAC-SHA256 rather than CPU-heavy algorithms like bcrypt. This prevents CPU-exhaustion denial-of-service attacks during brute-force or verification storms.
4. **Resilient Outbound Mail Architecture:** `MailService` abstracts outbound delivery, supporting both `console` (development/testing) and `smtp` (production via Nodemailer). Startup connection verification ensures configuration errors fail fast.
5. **Strict Response & Error Envelopes:** All responses, without exception, follow the standardized `{ success, data, requestId }` or `{ success: false, statusCode, code, message, details, requestId }` schema.

---

## 2. Interactive API Documentation (OpenAPI / Swagger)

Interactive OpenAPI / Swagger documentation is integrated directly into the application.

- **Swagger UI URL:** `http://localhost:3000/docs`
- **OpenAPI JSON Spec:** `http://localhost:3000/docs-json`
- **Global API Prefix:** `/api/v1`

### Swagger Features Included
- Bearer token authentication via the `JWT-auth` scheme.
- Full DTO schema introspection with field constraints, descriptions, and examples.
- Categorized tags: `Seekers Authentication` and `Health`.
- Content Security Policy (CSP) headers in Helmet are tailored to permit Swagger assets without compromising security.

---

## 3. Seeker Authentication Module

The Seeker module handles registration, email confirmation, secure login, password resets, and authenticated profile access.

### Endpoints Reference

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/seekers/register` | Public | Register an unverified seeker account and dispatch verification email |
| `POST` | `/api/v1/seekers/verify-email` | Public | Confirm account with 6-digit code (marks seeker as verified) |
| `POST` | `/api/v1/seekers/resend-verification-code` | Public | Request fresh verification code (generic response to avoid enumeration) |
| `POST` | `/api/v1/seekers/login` | Public | Authenticate seeker; returns JWT token + seeker profile |
| `POST` | `/api/v1/seekers/change-password` | Bearer JWT | Change password; revokes all previously issued tokens |
| `POST` | `/api/v1/seekers/forgot-password` | Public | Request 6-digit password reset code (generic response) |
| `POST` | `/api/v1/seekers/reset-password` | Public | Reset password with valid code; revokes all previous tokens |
| `GET` | `/api/v1/seekers/me` | Bearer JWT | Retrieve safe seeker profile |

### Verification & Reset Code Rules
- **Format:** 6-digit cryptographically secure random integers (`crypto.randomInt(100000, 1000000)`).
- **Storage:** Stored in `seeker_verification_codes` as salted HMAC-SHA256 (`<16-byte-hex-salt>:<sha256-hmac>`). Backward compatibility for bcrypt verification is preserved.
- **Expiry:** 15 minutes (`CODE_EXPIRY_MS = 15 * 60 * 1000`).
- **Attempt Limit:** 5 attempts maximum (`MAX_VERIFICATION_ATTEMPTS = 5`). Exceeding this limit burns the code.
- **Account Cooldown:** 60-second cooldown per account prevents inbox flooding.

---

## 4. Email Delivery & React Email Templates

Outbound emails are managed through `src/mail/`.

### Provider Options
Configured via the `EMAIL_PROVIDER` environment variable:
- `console`: Simulates delivery without external network requests. Logs delivery metadata in non-production environments without exposing sensitive codes.
- `smtp`: Live delivery via Nodemailer. A reusable `Transporter` is initialized and verified at startup (`await transporter.verify()`). Startup fails immediately if credentials or hosts are invalid.

### Templates
Templates are constructed with **React Email** (`@react-email/components`) and rendered with `@react-email/render`:
- `src/mail/templates/verification.email.tsx`: Registration email verification.
- `src/mail/templates/password-reset.email.tsx`: Password recovery email.
- **Features:** Responsive HTML layout, brand header, high-contrast code box, expiration notice, instructions, security disclaimers, and matching plain-text fallback.

---

## 5. Environment Configuration

All environment variables are parsed and validated at startup using Joi in `src/config/env.validation.ts`.

| Variable | Type | Default | Required | Purpose |
|---|---|---|---|---|
| `NODE_ENV` | string | `development` | No | `development`, `test`, or `production` |
| `PORT` | number | `3000` | No | HTTP listening port |
| `CORS_ORIGINS` | string | `""` | No | Comma-separated allowed origins (empty disables CORS) |
| `DB_HOST` | string | `localhost` | No | PostgreSQL host |
| `DB_PORT` | number | `5432` | No | PostgreSQL port |
| `DB_USERNAME` | string | - | **Yes** | PostgreSQL user |
| `DB_PASSWORD` | string | - | **Yes** | PostgreSQL password |
| `DB_NAME` | string | - | **Yes** | PostgreSQL database name |
| `DB_SSL` | boolean | `false` | No | Set `true` for TLS managed databases (e.g. Neon) |
| `DB_LOGGING` | boolean | `false` | No | Enables TypeORM query/migration logging |
| `JWT_SECRET` | string | dev default | **Yes (prod)** | Min 32 characters; default forbidden in production |
| `JWT_EXPIRES_IN` | string | `1d` | No | JWT access token lifetime |
| `EMAIL_PROVIDER`| string | `console` | No | `console` or `smtp` |
| `EMAIL_FROM` | string | `noreply@oruvia.com`| No | Default outbound sender address |
| `SMTP_HOST` | string | `""` | **If smtp** | SMTP server hostname |
| `SMTP_PORT` | number | `587` | No | SMTP port (e.g., 587, 465) |
| `SMTP_SECURE` | boolean | `false` | No | `true` for SSL (port 465), `false` for STARTTLS |
| `SMTP_USER` | string | `""` | **If smtp** | SMTP authentication username |
| `SMTP_PASS` | string | `""` | **If smtp** | SMTP authentication password |
| `TRUST_PROXY` | string | `""` | No | Reverse proxy hop count (e.g. `1` for ALB/Cloudflare) |

---

## 6. Development & Quality Assurance Workflows

### Setup & Local Execution
```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Run development server with watch mode
pnpm start:dev

# Run TypeORM migrations
pnpm migration:run
```

### Quality Assurance Commands
```bash
# Code style and linting (oxlint)
pnpm lint

# Unit tests (Vitest)
pnpm test

# End-to-end integration tests (Vitest)
pnpm test:e2e

# Production build
pnpm build
```

---

## 7. Security Best Practices for Contributors

1. **Never Log Sensitive Information:** Passwords, tokens, verification codes, reset codes, and SMTP credentials must never be written to application logs. Automatic redaction via Pino is configured as defense-in-depth, but source code must avoid logging raw credentials.
2. **Prevent Account Enumeration:** Public endpoints for password resets and verification code resends must always return a consistent, generic success response regardless of whether the account exists in the database.
3. **Safe DTO Serialization:** Always expose entities using explicit serializer methods (e.g. `SeekersService.toProfile()`) rather than returning raw TypeORM entities, ensuring internal hashes and audit columns never reach clients.
4. **Atomic Delivery Guarantee:** Outbound messages must only be registered as delivered after transport operations resolve successfully.

---

## 8. Structured Logging & Observability

Oruvia utilizes **Pino** through `nestjs-pino` as its foundational logging engine, guaranteeing high throughput, minimal overhead, and non-blocking asynchronous I/O.

### Lifecycle & Single Log Principle
- **Success Requests:** Successfully handled HTTP requests emit exactly one completion log via `LoggingInterceptor` capturing method, sanitized path (excluding query parameters), response status code, duration in milliseconds, client IP, and request ID.
- **Failed Requests:** Exceptions and error responses bypass normal interceptor flow and are logged exactly once by `AllExceptionsFilter`. Client errors (4xx) are logged at `warn` level; internal server errors (5xx) are logged at `error` level with full server-side stack traces.
- **Zero Duplication:** `autoLogging: false` is configured in `pinoHttp` to avoid redundant logs from multiple Express middleware and interceptor stages.

### Sensitive Data Redaction
Pino is configured with strict field redaction rules. The following paths are automatically sanitized and replaced with `[REDACTED]`:
- Passwords & password hashes (`password`, `passwordHash`, `password_hash`)
- Tokens & session versions (`token`, `accessToken`, `refreshToken`, `tokenVersion`, `token_version`)
- Verification & reset codes (`code`, `verificationCode`, `resetCode`)
- Sensitive headers (`authorization`, `cookie`, `set-cookie`)
- Secrets & database passwords (`JWT_SECRET`, `SMTP_PASS`, `DB_PASSWORD`)
- SQL error parameters are stripped before serialization to prevent sensitive query parameters from leaking into logs.

### Production vs Development Formatting
- **Production (`NODE_ENV=production`):** Emits structured single-line JSON with ISO-8601 timestamps, log level labels (`info`, `warn`, `error`), `service: "oruvia-backend"`, and `environment`.
- **Development (`NODE_ENV=development`):** Pipes to `pino-pretty` with colored output, human-readable timestamps, and clear context prefixes.

