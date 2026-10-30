import {
  UseGuards,
  applyDecorators,
  type CanActivate,
  type Type,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  LISTING_DASHBOARD_THROTTLE_LIMIT,
  LISTING_NOT_FOUND_DESCRIPTION,
  LISTING_THROTTLE_BUCKET,
  LISTING_THROTTLE_TTL_MS,
} from '../listings.constants.js';

const UNAUTHORIZED_DESCRIPTION = 'Missing, invalid, or expired JWT token.';

/**
 * Shared decorator bundle for the Phase 2 lister-dashboard routes.
 * Everything is identical for agents and landlords except the role
 * guard, passed in here; docs previously duplicated per role are
 * maintained once.
 */
type RoleGuardRef = Type<CanActivate> | CanActivate;

const bundle = (roleGuard: RoleGuardRef) =>
  applyDecorators(
    UseGuards(roleGuard as Type<CanActivate>),
    Throttle({ [LISTING_THROTTLE_BUCKET]: { limit: LISTING_DASHBOARD_THROTTLE_LIMIT, ttl: LISTING_THROTTLE_TTL_MS } }),
    ApiBearerAuth('JWT-auth'),
    ApiUnauthorizedResponse({ description: UNAUTHORIZED_DESCRIPTION }),
  );

export const DashboardListRoute = (roleGuard: RoleGuardRef) =>
  applyDecorators(
    bundle(roleGuard),
    ApiOperation({
      summary: 'List my listings (dashboard)',
      description:
        'Paginated list of the authenticated lister\u2019s own listings across all statuses (optional `status` filter). Dashboard responses add `status` and `updatedAt` to the public detail shape; soft-deleted listings are excluded.',
    }),
    ApiOkResponse({ description: 'Paginated list of own listings.' }),
  );

export const DashboardUpdateStatusRoute = (roleGuard: RoleGuardRef) =>
  applyDecorators(
    bundle(roleGuard),
    ApiOperation({
      summary: 'Mark a listing rented or sold',
      description:
        'Updates the lifecycle status of an owned listing. The terminal status must match the listing type (rented for rent, sold for sale); rented/sold listings leave the public browsable set.',
    }),
    ApiOkResponse({ description: 'Status updated.' }),
    ApiBadRequestResponse({
      description:
        'Invalid UUID, validation failure, or LISTING_STATUS_TYPE_MISMATCH.',
    }),
    ApiNotFoundResponse({ description: LISTING_NOT_FOUND_DESCRIPTION }),
  );

export const DashboardUpdateRoute = (roleGuard: RoleGuardRef) =>
  applyDecorators(
    bundle(roleGuard),
    ApiOperation({
      summary: 'Edit an owned listing',
      description:
        'Partial update of whitelisted scalar fields. Photos, owner reference and the snapshot Verified badge are not editable.',
    }),
    ApiOkResponse({ description: 'Listing updated.' }),
    ApiBadRequestResponse({
      description: 'Invalid UUID, validation failure, or LISTING_STATUS_TYPE_MISMATCH.',
    }),
    ApiNotFoundResponse({ description: LISTING_NOT_FOUND_DESCRIPTION }),
  );

export const DashboardRemoveRoute = (roleGuard: RoleGuardRef) =>
  applyDecorators(
    bundle(roleGuard),
    ApiOperation({
      summary: 'Delete an owned listing (soft delete)',
      description:
        'Sets deleted_at, removing the listing from public search/detail and the dashboard. Recovery is out of scope.',
    }),
    ApiOkResponse({ description: 'Listing deleted.' }),
    ApiBadRequestResponse({ description: 'Invalid UUID.' }),
    ApiNotFoundResponse({ description: LISTING_NOT_FOUND_DESCRIPTION }),
  );
