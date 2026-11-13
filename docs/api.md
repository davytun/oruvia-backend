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

---

## 11. Inspection Booking System & Scheduling

Oruvia provides a full-lifecycle inspection scheduling system supporting:
- **Physical Inspections** on-site with address and lister phone/WhatsApp contact.
- **Virtual Inspections** with dual method support: `live_video_call` (meeting link) and `recorded_walkthrough` (video tour link) for fallback in low-bandwidth network areas.
- **Hybrid Availability**: Weekly recurring windows (Mon–Sat 09:00–17:00 WAT default), blocked calendar dates, and manual confirmation.
- **Reschedule Negotiation**: Two-way propose / accept / reject workflow.
- **Audit Timeline**: Immutable event log tracking every action (`requested`, `confirmed`, `declined`, `reschedule_proposed`, `reschedule_accepted`, `cancelled`, `completed`, `no_show`, `admin_rescheduled`, `admin_cancelled`, `admin_status_override`).
- **Offline Inspection Fee**: Optional fee set by lister, marked `paid` or `waived` offline.
- **Cron Automation**: Hourly trigger sending 24h reminders and expiring unconfirmed past bookings.

### Endpoints Summary

#### Public
- `GET /api/v1/listings/:idOrSlug/inspection-slots?from=&to=` — Calculate open inspection slots.

#### Seeker (`/api/v1/seekers/inspections`)
- `POST /api/v1/seekers/inspections` — Request an inspection (`listing_id`, `mode`, `virtual_method`, `scheduled_at`, `note`).
- `GET /api/v1/seekers/inspections` — List my bookings (`?status=&listing_id=&page=&per_page=`).
- `GET /api/v1/seekers/inspections/:id` — Get booking detail with lister contact and audit timeline.
- `POST /api/v1/seekers/inspections/:id/reschedule` — Propose a new date & time (`proposed_at`, `reason`).
- `POST /api/v1/seekers/inspections/:id/reschedule/accept` — Accept lister's proposed time.
- `POST /api/v1/seekers/inspections/:id/reschedule/reject` — Reject lister's proposed time.
- `POST /api/v1/seekers/inspections/:id/cancel` — Cancel booking (`reason`).

#### Lister (`/api/v1/{agents|landlords}/...`)
- `GET /inspection-settings` & `PUT /inspection-settings` — Manage slot duration, max per slot, min notice hours, virtual acceptance.
- `GET /inspection-availability` & `PUT /inspection-availability` — Manage weekly recurring availability windows.
- `GET /inspection-blocked-dates`, `POST /inspection-blocked-dates`, `DELETE /inspection-blocked-dates/:id` — Blocked calendar dates.
- `PATCH /listings/:id/inspection-options` — Configure listing inspection fee and allowed modes without triggering re-review.
- `GET /inspections` & `GET /inspections/:id` — Incoming inspection requests.
- `POST /inspections/:id/confirm` — Confirm booking (`meeting_link`, `recorded_video_url`, `lister_note`).
- `POST /inspections/:id/decline` — Decline booking with reason.
- `POST /inspections/:id/reschedule` — Propose new time to seeker.
- `POST /inspections/:id/reschedule/accept` & `POST /inspections/:id/reschedule/reject` — Handle seeker reschedule proposals.
- `POST /inspections/:id/cancel` — Cancel booking.
- `PATCH /inspections/:id/virtual-details` — Switch virtual method or update link/video for network fallback.
- `POST /inspections/:id/complete` — Mark inspection completed.
- `POST /inspections/:id/no-show` — Mark seeker absent.
- `PATCH /inspections/:id/fee` — Update offline fee status (`paid`, `waived`, `unpaid`).

#### Admin (`/api/v1/admins/inspections`)
- `GET /api/v1/admins/inspections` — Platform-wide inspection list with multi-role filters.
- `GET /api/v1/admins/inspections/:id` — Full details of both parties and audit timeline.
- `POST /api/v1/admins/inspections/:id/cancel` — Admin cancellation with audit reason.
- `POST /api/v1/admins/inspections/:id/reschedule` — Direct administrative reschedule.
- `PATCH /api/v1/admins/inspections/:id/status` — Status override for dispute resolution.
- `PATCH /api/v1/admins/inspections/:id/fee` — Offline fee status override.

---

## 12. Favorites & Saved Properties

#### Seeker (`/api/v1/seekers/favorites`)
- `GET /api/v1/seekers/favorites` — List saved properties (paginated, newest first; optional `?availability_status=`). Keeps taken properties (`rented`, `sold`, `unavailable`) in the list so seekers know when a shortlisted property is no longer available.
- `POST /api/v1/seekers/favorites` — Save a property to favorites (`listing_id`, idempotent).
- `POST /api/v1/seekers/favorites/toggle` — Toggle save/unsave for a property (`listing_id`).
- `DELETE /api/v1/seekers/favorites/:listingId` — Remove a property from favorites.

#### Public Listings Enrichment
- `GET /api/v1/listings` and `GET /api/v1/listings/:idOrSlug` return `favorites_count` (integer) and `is_favorited` (boolean, computed when a valid Seeker Bearer token is sent).

---

## 13. Inquiries & Messaging (with Real-Time WebSockets)

#### Seeker (`/api/v1/seekers/inquiries`)
- `POST /api/v1/seekers/inquiries` — Start or continue a property inquiry (`listing_id`, `subject?`, `message`). Re-opens if closed, broadcasts over WebSocket, and emails lister.
- `GET /api/v1/seekers/inquiries` — List conversations (`?status=&listing_id=&unread_only=&page=&per_page=`).
- `GET /api/v1/seekers/inquiries/unread-count` — Total unread message count.
- `GET /api/v1/seekers/inquiries/:id` — Get conversation & messages (`?after=` optional; auto-marks lister messages read & broadcasts `messages_read`). Includes `whatsapp_url` & `ws_path`.
- `POST /api/v1/seekers/inquiries/:id/messages` — Send follow-up message.
- `POST /api/v1/seekers/inquiries/:id/close` — Close conversation.

#### Lister (`/api/v1/{agents|landlords}/inquiries`)
- `GET /api/v1/{role}/inquiries` — List incoming conversations (`?status=&listing_id=&unread_only=&page=&per_page=`).
- `GET /api/v1/{role}/inquiries/unread-count` — Total unread message count.
- `GET /api/v1/{role}/inquiries/:id` — Get conversation & messages (`?after=` optional; auto-marks seeker messages read). Includes `whatsapp_url` & `ws_path`.
- `POST /api/v1/{role}/inquiries/:id/messages` — Reply to seeker (auto-transitions `open` -> `responded`, pushes WS event, emails seeker).
- `POST /api/v1/{role}/inquiries/:id/close` — Close conversation.

#### Real-Time WebSocket (`/api/v1/inquiries/:id/ws`)
- Upgrades to Cloudflare Durable Object WebSocket room (`InquiryRoom`) using `?token=<jwt>` or `Authorization: Bearer <jwt>`.
- Pushes `connected`, `new_message`, `typing`, `messages_read`, `presence`, and `inquiry_closed` events.

#### Admin Read-Only Oversight (`/api/v1/admins/inquiries`)
- `GET /api/v1/admins/inquiries` — List platform-wide inquiries (`?status=&listing_id=&lister_role=`).
- `GET /api/v1/admins/inquiries/:id` — Read-only view of full conversation & messages.



