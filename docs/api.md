# Oruvia API Reference

Base URL: `https://api.oruvia.workers.dev/api/v1`  
Interactive API Reference: `https://api.oruvia.workers.dev/docs`

Each role (**Seekers**, **Agents**, **Landlords**, **Admins**) has its own standalone database table (`seeker_users`, `agent_users`, `landlord_users`, `admin_users`) and direct authentication endpoints:
- Seekers: `/api/v1/seekers/*`
- Agents: `/api/v1/agents/*`
- Landlords: `/api/v1/landlords/*`
- Admins: `/api/v1/admins/*`

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
| `GET` | `/api/v1/agents/me` | Bearer JWT | Get current Agent profile (includes `verification_badge`) |
| `PATCH` | `/api/v1/agents/me` | Bearer JWT | Update current Agent profile |
| `GET` | `/api/v1/agents/kyc` | Bearer JWT | Get Agent KYC status, badge tier, and submission details |
| `POST` | `/api/v1/agents/kyc` | Bearer JWT | Submit Agent KYC (`multipart/form-data`: `id_document`, `selfie`, optional `license_document`) |

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
| `GET` | `/api/v1/landlords/me` | Bearer JWT | Get current Landlord profile (includes `verification_badge`) |
| `PATCH` | `/api/v1/landlords/me` | Bearer JWT | Update current Landlord profile |
| `GET` | `/api/v1/landlords/kyc` | Bearer JWT | Get Landlord KYC status, badge tier, and submission details |
| `POST` | `/api/v1/landlords/kyc` | Bearer JWT | Submit Landlord KYC (`multipart/form-data`: `id_document`, `selfie`, `proof_document`) |

---

## 5. Admins (`/api/v1/admins`)
Following `docs/roles.md` (*"Administrative privileges must not be granted through ordinary user actions"*), there is no public admin self-registration endpoint. A root Admin is seeded, and authenticated Admins can provision additional Admin accounts.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/admins/login` | Public | Authenticate Admin & return JWT `access_token` |
| `POST` | `/api/v1/admins/forgot-password` | Public | Send 6-digit password reset code |
| `POST` | `/api/v1/admins/reset-password` | Public | Reset Admin password with 6-digit code & revoke old tokens |
| `POST` | `/api/v1/admins/change-password` | Bearer JWT (Admin) | Change Admin password & revoke old tokens |
| `GET` | `/api/v1/admins/me` | Bearer JWT (Admin) | Get current Admin profile |
| `PATCH` | `/api/v1/admins/me` | Bearer JWT (Admin) | Update current Admin profile |
| `GET` | `/api/v1/admins` | Bearer JWT (Admin) | List all Admin accounts (paginated) |
| `POST` | `/api/v1/admins` | Bearer JWT (Admin) | Create a new Admin account |
| `GET` | `/api/v1/admins/kyc/agents` | Bearer JWT (Admin) | List Agent KYC submissions (`?status=pending\|approved\|rejected`) |
| `PATCH` | `/api/v1/admins/kyc/agents/:id/review` | Bearer JWT (Admin) | Approve or reject Agent KYC submission & activate `verification_badge` |
| `GET` | `/api/v1/admins/kyc/landlords` | Bearer JWT (Admin) | List Landlord KYC submissions (`?status=pending\|approved\|rejected`) |
| `PATCH` | `/api/v1/admins/kyc/landlords/:id/review` | Bearer JWT (Admin) | Approve or reject Landlord KYC submission & activate `verification_badge` |
| `GET` | `/api/v1/admins/users/:role` | Bearer JWT (Admin) | List users by role (`seekers`, `agents`, `landlords`) |
| `PATCH` | `/api/v1/admins/users/:role/:id/status` | Bearer JWT (Admin) | Suspend or unsuspend a user account & revoke active tokens on suspension |

---

## 6. KYC Badges for Listing Cards (`verification_badge`)
| Role | KYC Proof Submitted | `verification_badge` | Listing Card UI Badge |
|---|---|---|---|
| Any | Unverified / Pending / Rejected | `null` | *(No badge)* |
| Agent | Government ID + Selfie | `'verified_agent'` | **Verified Agent** |
| Agent | Government ID + Selfie + CAC / License Document | `'licensed_agent'` | **Licensed Agent** |
| Landlord | Government ID + Selfie + Utility Bill (`utility_bill`) | `'verified_landlord'` | **Verified Landlord** |
| Landlord | Government ID + Selfie + Title Document (`c_of_o`, `deed_of_assignment`, `survey_plan`, `governors_consent`) | `'verified_owner'` | **Verified Property Owner** |

---

## 7. Pre-Verified Demo & Tester Accounts (`Password123!`)
| Role | Email | Password | `verification_status` | `verification_badge` |
|---|---|---|---|---|
| **Super Admin** | `admin@oruvia.ng` | `Password123!` | N/A | N/A |
| **Agent (Licensed)** | `agent.verified@oruvia.ng` | `Password123!` | `approved` | `licensed_agent` |
| **Agent (Standard)** | `agent.standard@oruvia.ng` | `Password123!` | `approved` | `verified_agent` |
| **Agent (Pending KYC)** | `agent.pending@oruvia.ng` | `Password123!` | `pending` | `null` (qualifies for `licensed_agent`) |
| **Landlord (Property Owner)** | `landlord.verified@oruvia.ng` | `Password123!` | `approved` | `verified_owner` |
| **Landlord (Address Proof)** | `landlord.standard@oruvia.ng` | `Password123!` | `approved` | `verified_landlord` |
| **Landlord (Pending KYC)** | `landlord.pending@oruvia.ng` | `Password123!` | `pending` | `null` (qualifies for `verified_owner`) |
| **Seeker** | `seeker.demo@oruvia.ng` | `Password123!` | N/A | N/A |
