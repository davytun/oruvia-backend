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

## 2. Public Catalog & Locations Discovery
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/locations` | Public | List active States and active Cities (Ogun -> Abeokuta, Sagamu) |
| `GET` | `/api/v1/property-types` | Public | List active Nigerian Property Types (`?category=residential\|commercial\|land`) |

---

## 3. Public Property Discovery (`/api/v1/listings`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/listings` | Public | Search & filter approved available listings (`?city_slug`, `?property_type_slug`, `?classification`, `?min_price`, `?max_price`, `?bedrooms`, `?q`, `?sort=newest\|price_asc\|price_desc`) |
| `GET` | `/api/v1/listings/:idOrSlug` | Public | Get full property details, Nigerian fee breakdown, photo gallery, video tour, and lister profile + badge |

---

## 4. Seekers (`/api/v1/seekers`)
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

## 5. Agents (`/api/v1/agents`)
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
| `POST` | `/api/v1/agents/listings/media` | Bearer JWT | Upload property photos / video to Cloudinary |
| `POST` | `/api/v1/agents/listings` | Bearer JWT | Create property listing with Nigerian fee breakdown (requires verified KYC, enters `pending_review`) |
| `GET` | `/api/v1/agents/listings` | Bearer JWT | List own property listings (`?moderation_status`, `?availability_status`) |
| `GET` | `/api/v1/agents/listings/:id` | Bearer JWT | Get single own property listing |
| `PATCH` | `/api/v1/agents/listings/:id` | Bearer JWT | Edit own property listing (resets `moderation_status` to `pending_review`) |
| `PATCH` | `/api/v1/agents/listings/:id/availability` | Bearer JWT | Update availability (`available`, `rented`, `sold`, `unavailable`) |
| `DELETE` | `/api/v1/agents/listings/:id` | Bearer JWT | Delete own property listing |

---

## 6. Landlords (`/api/v1/landlords`)
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
| `POST` | `/api/v1/landlords/listings/media` | Bearer JWT | Upload property photos / video to Cloudinary |
| `POST` | `/api/v1/landlords/listings` | Bearer JWT | Create property listing with Nigerian fee breakdown (requires verified KYC, enters `pending_review`) |
| `GET` | `/api/v1/landlords/listings` | Bearer JWT | List own property listings (`?moderation_status`, `?availability_status`) |
| `GET` | `/api/v1/landlords/listings/:id` | Bearer JWT | Get single own property listing |
| `PATCH` | `/api/v1/landlords/listings/:id` | Bearer JWT | Edit own property listing (resets `moderation_status` to `pending_review`) |
| `PATCH` | `/api/v1/landlords/listings/:id/availability` | Bearer JWT | Update availability (`available`, `rented`, `sold`, `unavailable`) |
| `DELETE` | `/api/v1/landlords/listings/:id` | Bearer JWT | Delete own property listing |

---

## 7. Admin (`/api/v1/admins`)
All Admin routes link together under `/api/v1/admins` using modular sub-routers (`auth`, `kyc`, `catalog`, `listings`).

### 7.1 Admin Auth & Super Admin Management
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/admins/login` | Public | Authenticate Admin (`super_admin` or `admin`) & return JWT `access_token` |
| `POST` | `/api/v1/admins/forgot-password` | Public | Send 6-digit password reset code |
| `POST` | `/api/v1/admins/reset-password` | Public | Reset Admin password with 6-digit code & revoke old tokens |
| `POST` | `/api/v1/admins/change-password` | `admin` / `super_admin` | Change Admin password & revoke old tokens |
| `GET` | `/api/v1/admins/me` | `admin` / `super_admin` | Get current Admin profile (includes `role`) |
| `PATCH` | `/api/v1/admins/me` | `admin` / `super_admin` | Update current Admin profile |
| `GET` | `/api/v1/admins` | **`super_admin` only** | List all Admin accounts (paginated) |
| `POST` | `/api/v1/admins` | **`super_admin` only** | Create a new `admin` account |
| `PATCH` | `/api/v1/admins/:id/status` | **`super_admin` only** | Suspend or unsuspend a regular `admin` account & revoke active tokens |

### 7.2 Admin KYC Verification (`/api/v1/admins/kyc`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/admins/kyc/agents` | `admin` / `super_admin` | List Agent KYC submissions (`?status=pending\|approved\|rejected`) |
| `GET` | `/api/v1/admins/kyc/agents/:id` | `admin` / `super_admin` | Get a single Agent KYC submission by ID |
| `PATCH` | `/api/v1/admins/kyc/agents/:id/review` | `admin` / `super_admin` | Approve or reject Agent KYC submission & activate `verification_badge` |
| `GET` | `/api/v1/admins/kyc/landlords` | `admin` / `super_admin` | List Landlord KYC submissions (`?status=pending\|approved\|rejected`) |
| `GET` | `/api/v1/admins/kyc/landlords/:id` | `admin` / `super_admin` | Get a single Landlord KYC submission by ID |
| `PATCH` | `/api/v1/admins/kyc/landlords/:id/review` | `admin` / `super_admin` | Approve or reject Landlord KYC submission & activate `verification_badge` |

### 7.3 Admin Locations & Nigerian House Types (`/api/v1/admins/locations`, `/api/v1/admins/property-types`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/admins/locations/states` | `admin` / `super_admin` | List all States (including inactive) |
| `POST` | `/api/v1/admins/locations/states` | `admin` / `super_admin` | Add a new State for geographic expansion |
| `PATCH` | `/api/v1/admins/locations/states/:id` | `admin` / `super_admin` | Update or activate/deactivate a State |
| `GET` | `/api/v1/admins/locations/cities` | `admin` / `super_admin` | List all Cities (`?state_id`) |
| `POST` | `/api/v1/admins/locations/cities` | `admin` / `super_admin` | Add a new City to a State |
| `PATCH` | `/api/v1/admins/locations/cities/:id` | `admin` / `super_admin` | Update or activate/deactivate a City |
| `GET` | `/api/v1/admins/property-types` | `admin` / `super_admin` | List all Nigerian Property Types |
| `POST` | `/api/v1/admins/property-types` | `admin` / `super_admin` | Create a new Nigerian Property Type |
| `PATCH` | `/api/v1/admins/property-types/:id` | `admin` / `super_admin` | Update or activate/deactivate a Property Type |

### 7.4 Admin Listing Moderation (`/api/v1/admins/listings`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/admins/listings` | `admin` / `super_admin` | List all listings (`?moderation_status=pending_review\|approved\|rejected\|suspended`, `?city_id`, `?lister_role`) |
| `GET` | `/api/v1/admins/listings/:id` | `admin` / `super_admin` | Inspect single listing with lister & badge details |
| `PATCH` | `/api/v1/admins/listings/:id/review` | `admin` / `super_admin` | Approve, reject, or suspend listing & notify lister by email |

---

## 8. Nigerian Fee Breakdown & Pricing Formula
Every listing stores and displays:
$$\text{Total Initial Package} = \text{Base Price} + \text{Agency Fee} + \text{Legal / Agreement Fee} + \text{Caution Deposit} + \text{Service Charge}$$

---

## 9. KYC Badges for Listing Cards (`verification_badge`)
| Role | KYC Proof Submitted | `verification_badge` | Listing Card UI Badge |
|---|---|---|---|
| Any | Unverified / Pending / Rejected | `null` | *(No badge)* |
| Agent | Government ID + Selfie | `'verified_agent'` | **Verified Agent** |
| Agent | Government ID + Selfie + CAC / License Document | `'licensed_agent'` | **Licensed Agent** |
| Landlord | Government ID + Selfie + Utility Bill (`utility_bill`) | `'verified_landlord'` | **Verified Landlord** |
| Landlord | Government ID + Selfie + Title Document (`c_of_o`, `deed_of_assignment`, `survey_plan`, `governors_consent`) | `'verified_owner'` | **Verified Property Owner** |

---

## 10. Pre-Verified Demo & Tester Accounts (`Password123!`)
| Role | Email | Password | `verification_status` | `verification_badge` |
|---|---|---|---|---|
| **Super Admin** | `admin@oruvia.ng` | `Password123!` | `super_admin` | N/A |
| **Regular Admin** | `kyc.admin@oruvia.ng` | `Password123!` | `admin` | N/A |
| **Agent (Licensed)** | `agent.verified@oruvia.ng` | `Password123!` | `approved` | `licensed_agent` |
| **Agent (Standard)** | `agent.standard@oruvia.ng` | `Password123!` | `approved` | `verified_agent` |
| **Agent (Pending KYC)** | `agent.pending@oruvia.ng` | `Password123!` | `pending` | `null` (qualifies for `licensed_agent`) |
| **Landlord (Property Owner)** | `landlord.verified@oruvia.ng` | `Password123!` | `approved` | `verified_owner` |
| **Landlord (Address Proof)** | `landlord.standard@oruvia.ng` | `Password123!` | `approved` | `verified_landlord` |
| **Landlord (Pending KYC)** | `landlord.pending@oruvia.ng` | `Password123!` | `pending` | `null` (qualifies for `verified_owner`) |
| **Seeker** | `seeker.demo@oruvia.ng` | `Password123!` | N/A | N/A |
