# Admin Account Module

## Overview

The Admin Account Module provides dedicated administrative authentication, secure internal account provisioning, profile access, and password recovery for platform administrators (`admin_users`).

In accordance with Oruvia's multi-role identity isolation architecture:
- Admins maintain a dedicated database table (`admin_users`) completely segregated from seekers, landlords, and agents.
- **No public admin registration endpoint exists**. Admin accounts are provisioned exclusively through secure internal tooling.
- Admin JWTs are signed with `audience: 'oruvia-admin'`. Admin tokens cannot authenticate as seekers, landlords, or agents, and non-admin tokens cannot authenticate as admins.
- Admin accounts have an account status (`ACTIVE`, `SUSPENDED`, `INACTIVE`) checked during login and on every authenticated request.

---

## Architecture & Authentication Strategy

### Account Persistence
- **Table:** `admin_users`
  - `id`: UUID primary key (auto-generated via `uuid_generate_v4()`)
  - `full_name`: varchar(255)
  - `email`: varchar(255) with unique constraint and database index (`idx_admin_users_email`), normalized to lowercase
  - `password_hash`: varchar(255), hashed via `bcrypt` (10 salt rounds)
  - `status`: varchar(50), default `'ACTIVE'` (`ACTIVE`, `SUSPENDED`, `INACTIVE`)
  - `token_version`: integer, default `0` (used for session/token revocation)
  - `last_login_at`: timestamptz, nullable (updated on every successful login)
  - `created_at` / `updated_at`: timestamptz

### Password Recovery Codes
- **Table:** `admin_verification_codes`
  - `id`: UUID primary key
  - `admin_id`: UUID foreign key referencing `admin_users(id)` ON DELETE CASCADE
  - `code_hash`: varchar(255), salted HMAC-SHA256 hash of the 6-digit recovery code
  - `purpose`: `PASSWORD_RESET`
  - `expires_at`: timestamptz (15-minute expiration window)
  - `attempts`: integer, default 0 (max 5 attempts before code is invalidated)
  - `max_attempts`: integer, default 5
  - `used_at`: timestamptz, nullable (single-use enforcement)
  - `created_at`: timestamptz
  - `idx_admin_codes_admin_purpose`: compound index on `(admin_id, purpose)`

### Authentication & Token Lifecycle
- **Strategy:** Stateless JWT Bearer tokens with database-backed token version and status checking (`AdminJwtStrategy`).
- **Audience & Issuer:** Signed with `issuer: 'oruvia-api'` and `audience: 'oruvia-admin'`.
- **Payload:** `{ sub: admin.id, email: admin.email, tokenVersion: admin.tokenVersion, accountType: 'admin' }`.
- **Status Requirement:** Admin status must be `'ACTIVE'`. Inactive or suspended accounts receive `403 ADMIN_ACCOUNT_INACTIVE` on login attempts and `401 UNAUTHORIZED` on authenticated endpoints.
- **Session Revocation:** When an admin changes their password (`/change-password`) or resets their password (`/reset-password`), `admin.tokenVersion` is atomically incremented. Existing JWTs with previous token versions are immediately rejected with `401 UNAUTHORIZED`.

---

## Account Provisioning

To prevent unauthorized access, **there is no public registration endpoint for administrators**.

### CLI Bootstrap Tool
The repository includes a secure administrative bootstrap command:
```bash
pnpm admin:bootstrap
```

### Provisioning Safeguards
1. **No Passwords in CLI Arguments:** The bootstrap command refuses to run if passwords are provided via `argv` (to prevent exposure in `ps` process lists and shell histories).
2. **Interactive Masked Input:** When run in an interactive terminal, prompts for the password with masked/hidden characters.
3. **Automated/CI Provisioning:** In automated or container environments, reads credentials from environment variables:
   - `ADMIN_BOOTSTRAP_FULL_NAME`
   - `ADMIN_BOOTSTRAP_EMAIL`
   - `ADMIN_BOOTSTRAP_PASSWORD`
4. **Duplicate Safeguards:** The command prevents accidental duplicate creation by rejecting execution if an administrator account already exists (overrideable only with `ALLOW_MULTIPLE_ADMIN_BOOTSTRAP=true`).

---

## Endpoints

All admin authentication endpoints are mounted under `/api/v1/admin/auth`.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/admin/auth/login` | Public | Authenticate active admin, update `lastLoginAt`, and return JWT access token |
| `POST` | `/api/v1/admin/auth/forgot-password` | Public | Request 6-digit password recovery code (non-enumerating, 60s cooldown) |
| `POST` | `/api/v1/admin/auth/reset-password` | Public | Validate recovery code and set new password; revokes all existing sessions |
| `POST` | `/api/v1/admin/auth/change-password` | Bearer JWT (`AdminJwtAuthGuard`) | Change password; revokes all existing sessions/tokens |
| `GET` | `/api/v1/admin/auth/me` | Bearer JWT (`AdminJwtAuthGuard`) | Retrieve authenticated admin safe profile |

---

## Security Protections

1. **No Public Registration:** Admin accounts can only be provisioned internally.
2. **Account Status Enforcement:** Non-active (`SUSPENDED`, `INACTIVE`) accounts are blocked from logging in or making authenticated calls.
3. **Timing-Safe Password Checks:** Login performs dummy bcrypt comparisons for non-existent emails to prevent timing-based user enumeration.
4. **HMAC-SHA256 Recovery Codes:** Recovery codes are hashed with salted HMAC-SHA256 resisting CPU-exhaustion DoS attacks.
5. **Session Revocation:** Global token invalidation via `token_version` on password changes and resets.
6. **Rate Limiting:** Auth endpoints are throttled to 10 requests per minute per IP.
7. **Strict Cross-Role Token Isolation:** Enforced 4-way separation between seekers, landlords, agents, and administrators.
