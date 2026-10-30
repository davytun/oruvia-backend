/**
 * Constants and response types for the Listings module (Phase 1 Core +
 * Phase 2 lister dashboard). See docs/listings-module.md for the full spec.
 */

export type ListerType = 'agent' | 'landlord';

/** Name of the throttler bucket shared by authenticated write routes (registered in AppModule). */
export const LISTING_THROTTLE_BUCKET = 'auth';
export const LISTING_THROTTLE_TTL_MS = 60_000;
export const LISTING_PUBLISH_THROTTLE_LIMIT = 10;
export const LISTING_DASHBOARD_THROTTLE_LIMIT = 30;

export const LISTING_TYPES = ['rent', 'sale'] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

export const PROPERTY_TYPES = [
  'apartment',
  'duplex',
  'terrace',
  'detached',
  'semi_detached',
  'bungalow',
  'penthouse',
  'land',
  'other',
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const LISTING_STATUSES = ['active', 'rented', 'sold'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

/** Terminal (delisting) status allowed per listing type — rented for rent, sold for sale. */
export const LISTING_TERMINAL_STATUS: Record<ListingType, ListingStatus> = {
  rent: 'rented',
  sale: 'sold',
};

/** Single-construct 404 payload; the dashboard deliberately mirrors it for foreign rows. */
export const LISTING_NOT_FOUND = {
  code: 'LISTING_NOT_FOUND',
  message: 'Listing not found',
} as const;

export const LISTING_NOT_FOUND_DESCRIPTION =
  'Listing not found (LISTING_NOT_FOUND). Also returned for listings owned by another lister.';

export const LISTING_MIN_PHOTOS = 3;
export const LISTING_MAX_PHOTOS = 10;
export const LISTING_MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export const LISTING_ALLOWED_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

/** Extension whitelist applied to the validated MIME type of each photo. */
export const LISTING_MIME_EXTENSIONS: ReadonlyMap<string, string> = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

export const LISTING_DEFAULT_PAGE_SIZE = 12;
export const LISTING_MAX_PAGE_SIZE = 50;

export interface ListingResponse {
  id: string;
  title: string;
  listingType: ListingType;
  price: number;
  currency: string;
  state: string;
  city: string;
  propertyType: PropertyType;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  imageUrls: string[];
  listerType: ListerType;
  listerDisplayName: string;
  listerVerified: boolean;
  createdAt: Date;
}

export interface ListingDetailResponse extends ListingResponse {
  description: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

/** Dashboard (owner) view: detail plus the lifecycle fields never exposed publicly. */
export interface ListingDashboardResponse extends ListingDetailResponse {
  status: ListingStatus;
  updatedAt: Date;
}
