# Agent Account Module

## Overview

The Agent Account Module provides dedicated registration, email verification, session authentication, profile retrieval, and password management specifically for agent accounts (`agent_users`).

Per the architectural requirements, agents use separate database tables and independent authentication flows from seekers, landlords, and other prospective account types (e.g., admins). Agent tokens cannot authenticate as seekers or landlords, and seeker/landlord tokens cannot authenticate as agents.

---

## Architecture & Authentication Strategy

### Account Persistence
- **Table:** `agent_users`
  - `id`: UUID primary key (auto-generated via `uuid_generate_v4()`)
  - `full_name`: varchar(255)
  - `email`: varchar(255) with unique constraint and database index (`idx_agent_users_email`), normalized to lowercase
  - `password_hash`: varchar(255), hashed via `bcrypt` (10 salt rounds)
  - `is_email_verified`: boolean, default `false`
  - `email_verified_at`: timestamptz, nullable
  - `token_version`: integer, default `0` (used for session/token revocation)
  - `created_at` / `updated_at`: timestamptz

### Verification Codes
- **Table:** `agent_verification_codes`
  - `id`: UUID primary key
  - `agent_id`: UUID foreign key referencing `agent_users(id)` ON DELETE CASCADE
  - `code_hash`: varchar(255), salted HMAC-SHA256 hash of the 6-digit code
  - `purpose`: `EMAIL_VERIFICATION` | `PASSWORD_RESET`
  - `expires_at`: timestamptz (15-minute expiration window)
  - `attempts`: integer, default 0 (max 5 attempts before code is invalidated)
  - `max_attempts`: integer, default 5
  - `used_at`: timestamptz, nullable (single-use enforcement)
  - `created_at`: timestamptz
  - `idx_agent_codes_agent_purpose`: compound index on `(agent_id, purpose)`

### Authentication & Token Lifecycle
- **Strategy:** Stateless JWT Bearer tokens with database-backed token version checking (`AgentJwtStrategy`).
- **Audience & Issuer:** Signed with `issuer: 'oruvia-api'` and `audience: 'oruvia-agent'`.
- **Payload:** `{ sub: agent.id, email: agent.email, tokenVersion: agent.tokenVersion, accountType: 'agent' }`.
- **Login Requirement:** Agent email must be verified (`isEmailVerified === true`). Attempting to log in with an unverified account responds with `403 EMAIL_NOT_VERIFIED`.
- **Session/Token Invalidation:** When an agent changes their password (`/change-password`) or resets their password (`/reset-password`), `agent.tokenVersion` is atomically incremented. Existing JWTs with previous token versions are immediately rejected with `401 UNAUTHORIZED`.

### Account Isolation
- Agents, Landlords, and Seekers maintain strictly segregated account databases (`agent_users`, `landlord_users`, `seeker_users`).
- Users can register with the exact same email address as a seeker, a landlord, and an agent without collision or identity overlap.
- Separate Passport strategies and guards (`AgentJwtAuthGuard`, `LandlordJwtAuthGuard`, `SeekerJwtAuthGuard`) enforce that JWT audience mismatch (`oruvia-agent` vs `oruvia-landlord` vs `oruvia-seeker`) and `accountType` checks immediately reject cross-role access attempts with `401 UNAUTHORIZED`.

---

## Endpoints

All routes are mounted under `/api/v1/agents`.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/agents/register` | Public | Register a new unverified agent account and dispatch verification code |
| `POST` | `/api/v1/agents/verify-email` | Public | Verify agent email using 6-digit code |
| `POST` | `/api/v1/agents/resend-verification-code` | Public | Invalidate previous codes and send a new verification code (with 60s cooldown) |
| `POST` | `/api/v1/agents/login` | Public | Authenticate verified agent and return JWT access token |
| `POST` | `/api/v1/agents/change-password` | Bearer JWT (`AgentJwtAuthGuard`) | Change password; revokes all existing sessions/tokens |
| `POST` | `/api/v1/agents/forgot-password` | Public | Request password reset code (generic response prevents email enumeration) |
| `POST` | `/api/v1/agents/reset-password` | Public | Validate reset code and set new password; revokes existing sessions |
| `GET` | `/api/v1/agents/me` | Bearer JWT (`AgentJwtAuthGuard`) | Retrieve authenticated agent safe profile |

---

## Environment Variables

| Variable | Default | Required in Prod | Description |
|---|---|---|---|
| `JWT_SECRET` | `super-secret-seeker-jwt-key-for-dev-32chars` | Yes | Secret key used to sign and verify JWT tokens and HMAC code hashes |
| `JWT_EXPIRES_IN` | `1d` | No | Lifetime of access tokens (e.g., `1d`, `12h`, `3600s`) |
| `EMAIL_PROVIDER` | `console` | No | Provider mode: `console` (dev / test simulation) or `smtp` (real SMTP delivery via Nodemailer) |
| `EMAIL_FROM` | `noreply@oruvia.com` | Yes (if smtp) | Outbound sender email address |
| `SMTP_HOST` | _(empty)_ | Yes (if smtp) | Hostname or IP of the SMTP server |
| `SMTP_PORT` | `587` | No | SMTP server port |
| `SMTP_SECURE` | `false` | No | Boolean flag (`true` for port 465 SSL/TLS, `false` for STARTTLS) |
| `SMTP_USER` | _(empty)_ | Yes (if smtp) | SMTP username |
| `SMTP_PASS` | _(empty)_ | Yes (if smtp) | SMTP password |
| `TRUST_PROXY` | _(empty)_ | No | Number of reverse proxy hops or CIDRs |

---

## Security Protections

1. **Password Hashing:** Passwords hashed with bcrypt (10 rounds). Dummy password comparison performed for non-existent users during login to prevent timing-based user enumeration.
2. **Email Verification Before Login:** Unverified accounts receive `403 EMAIL_NOT_VERIFIED` on login attempts.
3. **Cryptographically Secure Codes:** 6-digit codes generated using `crypto.randomInt(100000, 1000000)` and hashed using salted HMAC-SHA256 (`crypto.createHmac`) with timing-safe comparison (`crypto.timingSafeEqual`).
4. **Attempt Limits & Expiry:** Codes expire after 15 minutes. Verification attempts are tracked atomically in database transactions with row-level locks (`pessimistic_write`); exceeding 5 attempts locks the code.
5. **Account-Based Cooldowns:** Requesting verification or reset codes enforces a 60-second cooldown per account to prevent email flooding.
6. **Account Enumeration Prevention:** Forgot password and resend verification code endpoints return identical generic responses regardless of whether the email is registered.
7. **Rate Limiting:** Auth endpoints throttled to 10 requests per minute per IP via `@Throttle({ auth: { limit: 10, ttl: 60000 } })`.
8. **Session Revocation:** Password changes and password resets increment `token_version`, immediately invalidating all previously issued JWT tokens.
9. **Safe Error Envelopes & Logging:** Sensitive credentials, codes, tokens, and passwords are never logged or echoed in responses.
