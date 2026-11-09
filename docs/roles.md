# docs/roles.md

# Oruvia User Roles and Permissions

## 1. Purpose

This document defines the user roles within Oruvia, how roles are represented in the database, and the responsibilities and permissions associated with each role.

All role-related functionality must follow the definitions in this document.

## 2. Role Architecture (Separate Role Tables)

Oruvia supports four primary roles, each stored in its own dedicated table linked to the base `users` authentication table (`user_id`):

- **Seeker** (`seekers` table)
- **Agent** (`agents` table)
- **Landlord** (`landlords` table)
- **Admin** (`admins` table)

Every registered user receives a `seekers` record by default so they can discover properties, save favorites, and request inspections. Because each role lives in its own table with its own primary key (`seekers.id`, `agents.id`, `landlords.id`, `admins.id`), a Seeker can also onboard as an **Agent** and/or a **Landlord** without role or foreign-key conflicts.

## 3. Seeker (`seekers`)

A Seeker is a user looking to rent or purchase a property.

### Responsibilities

- Discover properties.
- Search and filter listings.
- View property details.
- Save favorite properties.
- Contact relevant property listers.
- Request property inspections.
- Manage inspection requests.
- Participate in eligible reviews.

### Permissions

- View published listings.
- Save and remove favorites (`favorites.seeker_id`).
- Create property inquiries (`conversations.seeker_id`).
- Request inspections (`inspections.seeker_id`).
- Manage their own inspection requests.
- Manage their own account and seeker profile.

A user who only has a `seekers` record must not be able to publish property listings or access administrative functionality until they create an `agents` or `landlords` profile.

## 4. Agent (`agents`)

An Agent is a real estate professional who represents or manages property listings.

### Responsibilities

- Publish property listings.
- Manage property information.
- Receive inquiries.
- Respond to inspection requests.
- Communicate with property seekers.
- Maintain their agent profile.
- Submit verification requests.

### Permissions

- Create property listings (`properties.agent_id`).
- View and manage their own listings.
- Edit their own listings.
- Delete their own listings.
- Manage inspection requests associated with their listings.
- Respond to inquiries.
- Manage their own agent profile.
- Submit verification documents.

Agents must not manage listings belonging to other users unless explicitly authorized.

## 5. Landlord (`landlords`)

A Landlord is a property owner who intends to rent or sell a property.

### Responsibilities

- Publish property listings.
- Maintain property information.
- Receive inquiries.
- Manage inspection requests.
- Communicate with property seekers.
- Update property availability.
- Submit verification requests.

### Permissions

- Create property listings (`properties.landlord_id`).
- View and manage their own listings.
- Edit their own listings.
- Delete their own listings.
- Mark properties as rented or sold.
- Manage inspection requests associated with their listings.
- Respond to inquiries.
- Manage their own landlord profile.
- Submit verification documents.

Landlords must not manage listings belonging to other users unless explicitly authorized.

## 6. Admin (`admins`)

An Admin is responsible for platform administration, moderation, and trust management.

### Responsibilities

- Manage users.
- Review verification requests.
- Moderate property listings.
- Review reported listings.
- Review reported users.
- Maintain marketplace integrity.

### Permissions

- View relevant user information.
- Review verification submissions.
- Approve or reject verification requests.
- Moderate listings.
- Review reports.
- Take appropriate administrative action.
- Manage platform users where authorized.

Administrative permissions must remain restricted to users with a valid record in the `admins` table.

## 7. General Permission Rules

- Users must only access functionality permitted by their active role records (`seekers`, `agents`, `landlords`, `admins`).
- Users must not modify resources owned by other users without authorization.
- Verification status (`verification_status` / `is_verified`) must not be self-modifiable.
- Administrative records (`admins`) must not be created or granted through ordinary user actions.
- Users must not access private information without authorization.
- Permissions should be enforced consistently across the platform.

## 8. Role Integrity

The role definitions in this document are authoritative.

Do not create additional roles or expand existing permissions without approval.

Any approved change to user roles or permissions must be reflected in this document.
