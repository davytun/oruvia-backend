# Oruvia API Reference

Base URL: `/api/v1`

All endpoints return JSON following the standard Oruvia response structure (`{ "success": true, "data": ... }` or `{ "success": false, "error": { "code", "message", "details" } }`).

---

## 1. Health & Status

### `GET /api/v1/health`
Returns service health and environment metadata.

**Response (`200 OK`)**
```json
{
  "success": true,
  "data": {
    "service": "Oruvia",
    "tagline": "Oruvia: Your path to a roof.",
    "environment": "development",
    "status": "healthy",
    "timestamp": "2026-11-09T14:40:52.798Z"
  }
}
```

---

## 2. Authentication (`/api/v1/auth`)

### 2.1 Register Account
`POST /api/v1/auth/register`

Creates a new `users` record and a `seekers` record. If `role` is `"agent"` or `"landlord"`, also creates the corresponding row in `agents` or `landlords`.

**Request Body**
```json
{
  "full_name": "Ada Okafor",
  "email": "ada@oruvia.ng",
  "password": "Password123!",
  "phone": "+2348012345678",
  "role": "seeker",
  "preferred_location": "Abeokuta, Ogun"
}
```
- `role` *(optional)*: `"seeker"` (default) | `"agent"` | `"landlord"`
- Optional Agent fields when `role = "agent"`: `agency_name`, `license_number`, `bio`, `whatsapp_number`
- Optional Landlord fields when `role = "landlord"`: `company_name`, `bio`, `whatsapp_number`

**Response (`201 Created`)**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "d8528bf2-8a42-4b02-9a59-349b241f3f19",
      "full_name": "Ada Okafor",
      "email": "ada@oruvia.ng",
      "phone": "+2348012345678",
      "avatar_url": null,
      "email_verified_at": null,
      "created_at": "2026-11-09T14:47:00.000Z",
      "updated_at": "2026-11-09T14:47:00.000Z",
      "profiles": {
        "seeker": {
          "id": "7c12a102-119b-48ea-89bc-02f1b2411c11",
          "preferred_location": "Abeokuta, Ogun",
          "created_at": "2026-11-09T14:47:00.000Z"
        },
        "agent": null,
        "landlord": null,
        "admin": null
      }
    },
    "access_token": "<jwt_access_token>",
    "refresh_token": "<random_refresh_token>",
    "expires_in": 900
  }
}
```

**Error Responses**
- `400 VALIDATION_FAILED`: Invalid or unknown fields.
- `409 CONFLICT`: Email is already registered.

---

### 2.2 Login
`POST /api/v1/auth/login`

Authenticates a user with email and password. Temporarily locks the account for 15 minutes after 5 consecutive failed attempts.

**Request Body**
```json
{
  "email": "ada@oruvia.ng",
  "password": "Password123!"
}
```

**Response (`200 OK`)**
Returns the same `{ user, access_token, refresh_token, expires_in }` payload as registration.

**Error Responses**
- `401 UNAUTHORIZED`: Invalid email or password.
- `403 FORBIDDEN`: Account suspended or temporarily locked due to failed login attempts.

---

### 2.3 Refresh Access Token
`POST /api/v1/auth/refresh`

Rotates the refresh token in the `sessions` table and issues a new short-lived access token.

**Request Body**
```json
{
  "refresh_token": "<refresh_token>"
}
```

**Response (`200 OK`)**
```json
{
  "success": true,
  "data": {
    "access_token": "<new_jwt_access_token>",
    "refresh_token": "<new_refresh_token>",
    "expires_in": 900
  }
}
```

---

### 2.4 Logout
`POST /api/v1/auth/logout`

Requires `Authorization: Bearer <access_token>`. Immediately revokes the current session in D1.

**Response (`200 OK`)**
```json
{
  "success": true,
  "data": {
    "logged_out": true
  }
}
```

---

## 3. Account & Role Profiles (`/api/v1/me`)

All `/api/v1/me` routes require `Authorization: Bearer <access_token>`.

### 3.1 Get Current Account & Role Profiles
`GET /api/v1/me`

Returns the authenticated user's details and all active role records (`seeker`, `agent`, `landlord`, `admin`).

---

### 3.2 Update Account & Seeker Profile
`PATCH /api/v1/me`

**Request Body** *(all fields optional)*
```json
{
  "full_name": "Adaeze Okafor",
  "phone": "+2348099998888",
  "avatar_url": "https://cdn.oruvia.ng/avatars/ada.png",
  "preferred_location": "Ikeja, Lagos"
}
```

**Response (`200 OK`)**: Updated user object with `profiles`.

---

### 3.3 Change Password
`PATCH /api/v1/me/password`

Verifies `current_password`, updates the password hash, and revokes all other active sessions for the user.

**Request Body**
```json
{
  "current_password": "Password123!",
  "new_password": "NewStrongPassword456!"
}
```

**Response (`200 OK`)**
```json
{
  "success": true,
  "data": {
    "updated": true
  }
}
```

---

### 3.4 Activate Agent Profile (Seeker Becoming an Agent)
`POST /api/v1/me/agent`

Creates a row in the `agents` table for the authenticated user while keeping their `seekers` (and any `landlords`) record intact.

**Request Body**
```json
{
  "agency_name": "Okafor Realty",
  "license_number": "OG-AG-2026-019",
  "bio": "Licensed residential agent in Ogun State.",
  "whatsapp_number": "+2348011112222"
}
```

**Response (`201 Created`)**: Updated user object with `profiles.agent` populated.
**Error (`409 CONFLICT`)**: Returned if the user already has an `agents` record.

---

### 3.5 Update Agent Profile
`PATCH /api/v1/me/agent`

Updates the user's `agents` record. Returns `404 NOT_FOUND` if the user has not activated an Agent profile yet.

---

### 3.6 Activate Landlord Profile (Seeker Becoming a Landlord)
`POST /api/v1/me/landlord`

Creates a row in the `landlords` table for the authenticated user while keeping their `seekers` (and any `agents`) record intact.

**Request Body**
```json
{
  "company_name": "Okafor Estates",
  "bio": "Direct property owner across Abeokuta.",
  "whatsapp_number": "+2348011112222"
}
```

**Response (`201 Created`)**: Updated user object with `profiles.landlord` populated.
**Error (`409 CONFLICT`)**: Returned if the user already has a `landlords` record.

---

### 3.7 Update Landlord Profile
`PATCH /api/v1/me/landlord`

Updates the user's `landlords` record. Returns `404 NOT_FOUND` if the user has not activated a Landlord profile yet.

