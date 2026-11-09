# Oruvia API Reference

Base URL: `https://api.oruvia.workers.dev/api/v1`  
Interactive API Reference: `https://api.oruvia.workers.dev/docs`

Each role (**Seekers**, **Agents**, **Landlords**) has its own standalone database table (`seeker_users`, `agent_users`, `landlord_users`) and direct authentication endpoints:
- Seekers: `/api/v1/seekers/*`
- Agents: `/api/v1/agents/*`
- Landlords: `/api/v1/landlords/*`

---

## 1. Health Check
- `GET /api/v1/health`

---

## 2. Seekers (`/api/v1/seekers`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/seekers/register` | Public | Register a new Seeker account & send 6-digit verification code |
| `POST` | `/api/v1/seekers/verify-email` | Public | Verify Seeker email with 6-digit code |
| `POST` | `/api/v1/seekers/resend-verification-code` | Public | Resend 6-digit verification code (60s cooldown) |
| `POST` | `/api/v1/seekers/login` | Public | Authenticate Seeker & return JWT `access_token` |
| `POST` | `/api/v1/seekers/forgot-password` | Public | Send 6-digit password reset code |
| `POST` | `/api/v1/seekers/reset-password` | Public | Reset Seeker password with 6-digit code & revoke old tokens |
| `POST` | `/api/v1/seekers/change-password` | Bearer JWT | Change Seeker password & revoke old tokens |
| `GET` | `/api/v1/seekers/me` | Bearer JWT | Get current Seeker profile |
| `PATCH` | `/api/v1/seekers/me` | Bearer JWT | Update current Seeker profile |

---

## 3. Agents (`/api/v1/agents`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/agents/register` | Public | Register directly as an Agent & send 6-digit verification code |
| `POST` | `/api/v1/agents/verify-email` | Public | Verify Agent email with 6-digit code |
| `POST` | `/api/v1/agents/resend-verification-code` | Public | Resend 6-digit verification code (60s cooldown) |
| `POST` | `/api/v1/agents/login` | Public | Authenticate Agent & return JWT `access_token` |
| `POST` | `/api/v1/agents/forgot-password` | Public | Send 6-digit password reset code |
| `POST` | `/api/v1/agents/reset-password` | Public | Reset Agent password with 6-digit code & revoke old tokens |
| `POST` | `/api/v1/agents/change-password` | Bearer JWT | Change Agent password & revoke old tokens |
| `GET` | `/api/v1/agents/me` | Bearer JWT | Get current Agent profile |
| `PATCH` | `/api/v1/agents/me` | Bearer JWT | Update current Agent profile |

---

## 4. Landlords (`/api/v1/landlords`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/landlords/register` | Public | Register directly as a Landlord & send 6-digit verification code |
| `POST` | `/api/v1/landlords/verify-email` | Public | Verify Landlord email with 6-digit code |
| `POST` | `/api/v1/landlords/resend-verification-code` | Public | Resend 6-digit verification code (60s cooldown) |
| `POST` | `/api/v1/landlords/login` | Public | Authenticate Landlord & return JWT `access_token` |
| `POST` | `/api/v1/landlords/forgot-password` | Public | Send 6-digit password reset code |
| `POST` | `/api/v1/landlords/reset-password` | Public | Reset Landlord password with 6-digit code & revoke old tokens |
| `POST` | `/api/v1/landlords/change-password` | Bearer JWT | Change Landlord password & revoke old tokens |
| `GET` | `/api/v1/landlords/me` | Bearer JWT | Get current Landlord profile |
| `PATCH` | `/api/v1/landlords/me` | Bearer JWT | Update current Landlord profile |
