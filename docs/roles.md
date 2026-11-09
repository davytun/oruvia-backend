# docs/roles.md

# Oruvia User Roles and Permissions

## 1. Purpose

This document defines the user roles within Oruvia and the responsibilities and permissions associated with each role.

All role-related functionality must follow the definitions in this document.

## 2. User Roles

Oruvia supports four primary roles:

- Seeker
- Agent
- Landlord
- Admin

## 3. Seeker

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
- Save and remove favorites.
- Create property inquiries.
- Request inspections.
- Manage their own inspection requests.
- Manage their own account and profile.

A Seeker must not be able to manage property listings or access administrative functionality.

## 4. Agent

An Agent is a real estate professional who represents or manages property listings.

### Responsibilities

- Publish property listings.
- Manage property information.
- Receive inquiries.
- Respond to inspection requests.
- Communicate with property seekers.
- Maintain their profile.
- Submit verification requests.

### Permissions

- Create property listings.
- View and manage their own listings.
- Edit their own listings.
- Delete their own listings.
- Manage inspection requests associated with their listings.
- Respond to inquiries.
- Manage their own profile.
- Submit verification documents.

Agents must not manage listings belonging to other users unless explicitly authorized.

## 5. Landlord

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

- Create property listings.
- View and manage their own listings.
- Edit their own listings.
- Delete their own listings.
- Mark properties as rented or sold.
- Manage inspection requests associated with their listings.
- Respond to inquiries.
- Manage their own profile.
- Submit verification documents.

Landlords must not manage listings belonging to other users unless explicitly authorized.

## 6. Admin

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

Administrative permissions must remain restricted to authorized administrators.

## 7. General Permission Rules

- Users must only access functionality permitted by their role.
- Users must not modify resources owned by other users without authorization.
- Role assignments must not be self-modifiable.
- Verification status must not be self-modifiable.
- Administrative privileges must not be granted through ordinary user actions.
- Users must not access private information without authorization.
- Permissions should be enforced consistently across the platform.

## 8. Role Integrity

The role definitions in this document are authoritative.

Do not create additional roles or expand existing permissions without approval.

Any approved change to user roles or permissions must be reflected in this document.