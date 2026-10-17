# Seeker Account Module

## Overview

The Seeker Account Module provides dedicated registration, email verification, session authentication, profile retrieval, and password management specifically for seeker accounts (`seeker_users`).

Per the architectural requirements, seekers use separate database tables and independent authentication flows from other prospective account types (landlords, agents, admins).

---

## Architecture & Authentication Strategy

### Account Persistence
- **Table:** `seeker_users`
  - `id`: UUID primary key (auto-generated)
  - `full_name`: varchar(255)
  - `email`: varchar(255) with database unique index (`idx_seeker_users_email`)
  - `password_hash`: varchar(255), hashed via `bcrypt` (10 salt rounds)
  - `is_email_verified`: boolean, default `false`
  - `email_verified_at`: timestamptz, nullable
  - `token_version`: integer, default `0` (used for session/token revocation)
  - `created_at` / `updated_at`: timestamptz

### Verification Codes
- **Table:** `seeker_verification_codes`
  - `id`: UUID primary key
  - `seeker_id`: UUID foreign key referencing `seeker_users(id)` ON DELETE CASCADE
  - `code_hash`: varchar(255), bcrypt hash of the 6-digit code
  - `purpose`: `EMAIL_VERIFICATION` | `PASSWORD_RESET`
  - `expires_at`: timestamptz (15-minute expiration window)
  - `attempts`: integer, default 0 (max 5 attempts before code is invalidated)
  - `max_attempts`: integer, default 5
  - `used_at`: timestamptz, nullable (single-use enforcement)
  - `created_at`: timestamptz
  - `idx_seeker_codes_seeker_purpose`: compound index on `(seeker_id, purpose)`

### Authentication & Token Lifecycle
- **Strategy:** Stateless JWT Bearer tokens with database-backed token version checking (`SeekerJwtStrategy`).
- **Payload:** `{ sub: seeker.id, email: seeker.email, tokenVersion: seeker.tokenVersion, accountType: 'seeker' }`.
- **Login Requirement:** Seeker email must be verified (`isEmailVerified === true`). Attempting to log in with an unverified account responds with `403 EMAIL_NOT_VERIFIED`.
- **Session/Token Invalidation:** When a seeker changes their password (`/change-password`) or resets their password (`/reset-password`), `seeker.tokenVersion` is atomically incremented. Existing JWTs with previous token versions are immediately rejected with `401 UNAUTHORIZED`.

### Email Provider Abstraction
- Email delivery is abstracted through `MailService` implementing the `EmailSender` interface.
- By default (`EMAIL_PROVIDER=console`), email sending is safely simulated and logged locally without making real network calls or pretending external delivery succeeded.
- External providers (e.g. Resend, Sendgrid, AWS SES, or SMTP) can be plugged in by setting `EMAIL_PROVIDER` and registering their transport adapter.

---

## Endpoints

All routes are mounted under `/api/v1/seekers`.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/seekers/register` | Public | Register a new unverified seeker account and dispatch verification code |
| `POST` | `/api/v1/seekers/verify-email` | Public | Verify seeker email using 6-digit code |
| `POST` | `/api/v1/seekers/resend-verification-code` | Public | Invalidate previous codes and send a new verification code |
| `POST` | `/api/v1/seekers/login` | Public | Authenticate verified seeker and return JWT access token |
| `POST` | `/api/v1/seekers/change-password` | Bearer JWT | Change password; revokes all existing sessions/tokens |
| `POST` | `/api/v1/seekers/forgot-password` | Public | Request password reset code (never discloses if email exists) |
| `POST` | `/api/v1/seekers/reset-password` | Public | Validate reset code and set new password; revokes existing sessions |
| `GET` | `/api/v1/seekers/me` | Bearer JWT | Retrieve authenticated seeker safe profile |

---

## Environment Variables

| Variable | Default | Required in Prod | Description |
|---|---|---|---|
| `JWT_SECRET` | `super-secret-seeker-jwt-key-for-dev-32chars` | Yes | Secret key used to sign and verify seeker JWT tokens (min 32 chars in production) |
| `JWT_EXPIRES_IN` | `1d` | No | Lifetime of access tokens (e.g., `1d`, `12h`, `3600s`) |
| `EMAIL_PROVIDER` | `console` | No | Provider mode: `console` (in-memory test / dev simulation) or `smtp` (real SMTP delivery via Nodemailer) |
| `EMAIL_FROM` | `noreply@oruvia.com` | Yes (if smtp) | Default outbound sender address or formatted address (e.g. `Oruvia <noreply@oruvia.com>`) |
| `SMTP_HOST` | _(empty)_ | Yes (if smtp) | Hostname or IP of the SMTP server |
| `SMTP_PORT` | `587` | No | SMTP server port (e.g., `587`, `465`, `2525`) |
| `SMTP_SECURE` | `false` | No | Boolean flag (`true` for port 465 SSL/TLS, `false` for 587 STARTTLS) |
| `SMTP_USER` | _(empty)_ | Yes (if smtp) | SMTP username or service account identifier |
| `SMTP_PASS` | _(empty)_ | Yes (if smtp) | SMTP password or API token |
| `TRUST_PROXY` | _(empty)_ | No | Number of reverse proxy hops or CIDRs (e.g., `1` behind ALB/Cloudflare). Empty disables trust proxy to prevent client IP spoofing via `X-Forwarded-For`. |

---

## Email Delivery & Templates

- **Provider Modes:** Configured via `EMAIL_PROVIDER`:
  - `console`: Simulates delivery in development and test environments by logging metadata without leaking codes or payloads.
  - `smtp`: Live SMTP delivery via Nodemailer with reusable transporter and startup connection verification (`transporter.verify()`). If the connection cannot be established, startup fails fast with a clear diagnostic message.
- **Responsive Templates with React Email:** Email templates are built with `@react-email/components` and rendered with `@react-email/render`, providing clean responsive HTML designs alongside accessible plaintext alternatives.
- **Delivered Emails:**
  - `EMAIL_VERIFICATION`: 6-digit registration activation code with a 15-minute expiry, instructions, and non-disclosure security notice.
  - `PASSWORD_RESET`: 6-digit password reset code with a 15-minute expiry, instructions, and security notice.
- **Security & Privacy:**
  - Verification and reset codes are never logged to console or monitoring streams.
  - SMTP passwords and sensitive payloads are kept strictly outside error logs.
  - Deliveries that fail are never recorded in `sentMessages` or marked as successfully delivered.
  - Endpoint responses never reveal account existence (generic success envelopes returned).

## Rate Limiting & Abuse Prevention

- **IP-Based Throttling:** Built on `@nestjs/throttler` with `ThrottlerGuard`. Global limit is 100 req/min; seeker auth endpoints (`/register`, `/login`, `/verify-email`, `/resend-verification-code`, `/forgot-password`, `/reset-password`, `/change-password`) are throttled at 10 req/min per IP.
- **Account-Based Cooldown:** A 60-second minimum cooldown is enforced at the database level for code generation on a single seeker account, preventing inbox flooding regardless of client IP rotation.
- **Single-Node vs Multi-Instance Limitation:** Current rate limiting uses an in-memory storage driver. For horizontal scaling across multiple container replicas or instances, a shared store (such as Redis via `@nest-lab/throttler-storage-redis`) must be configured to share rate-limit buckets across instances.

---

## Response & Error Contract Conventions

All endpoints adhere to the existing foundation contracts:
- **Success:** Enveloped in `{ success: true, data: ..., requestId: "..." }`.
- **Validation Failure (400):** `{ success: false, statusCode: 400, code: "VALIDATION_FAILED", message: "Validation failed", details: [{ field: "...", messages: [...] }] }`.
- **Rate Limit Exceeded (429):** `{ success: false, statusCode: 429, code: "TOO_MANY_REQUESTS", message: "Too many requests, please try again later." }`.
- **Business Errors:**
  - Duplicate email: `409 EMAIL_ALREADY_REGISTERED`
  - Unverified login: `403 EMAIL_NOT_VERIFIED`
  - Bad credentials: `401 INVALID_CREDENTIALS`
  - Unauthorized: `401 UNAUTHORIZED`
  - Invalid / expired code: `400 INVALID_VERIFICATION_CODE` / `400 VERIFICATION_CODE_EXPIRED`
  - Code attempt limit exceeded: `400 TOO_MANY_ATTEMPTS`
