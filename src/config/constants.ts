/**
 * Oruvia Domain Constants
 */

export const ACCOUNT_TYPES = {
  SEEKER: 'seeker',
  AGENT: 'agent',
  LANDLORD: 'landlord',
  ADMIN: 'admin',
} as const

export type AccountType = (typeof ACCOUNT_TYPES)[keyof typeof ACCOUNT_TYPES]

export const CODE_PURPOSES = {
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
  PASSWORD_RESET: 'PASSWORD_RESET',
} as const

export type CodePurpose = (typeof CODE_PURPOSES)[keyof typeof CODE_PURPOSES]

export const LISTING_CLASSIFICATIONS = {
  RENT: 'rent',
  SALE: 'sale',
} as const

export const PROPERTY_TYPES = {
  APARTMENT: 'apartment',
  SELF_CONTAIN: 'self_contain',
  MINI_FLAT: 'mini_flat',
  DUPLEX: 'duplex',
  BUNGALOW: 'bungalow',
  TERRACE: 'terrace',
  DETACHED_HOUSE: 'detached_house',
  SEMI_DETACHED: 'semi_detached',
  COMMERCIAL: 'commercial',
  LAND: 'land',
} as const

export const AVAILABILITY_STATUSES = {
  AVAILABLE: 'available',
  RENTED: 'rented',
  SOLD: 'sold',
  UNAVAILABLE: 'unavailable',
} as const

export const INSPECTION_MODES = {
  PHYSICAL: 'physical',
  VIRTUAL: 'virtual',
} as const

export const INSPECTION_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  DECLINED: 'declined',
  RESCHEDULED: 'rescheduled',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
} as const

export const VERIFICATION_STATUSES = {
  UNVERIFIED: 'unverified',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const

export const REPORT_TARGET_TYPES = {
  LISTING: 'listing',
  USER: 'user',
} as const

export const REPORT_STATUSES = {
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
} as const

export const NOTIFICATION_TYPES = {
  NEW_INQUIRY: 'new_inquiry',
  INSPECTION_REQUEST: 'inspection_request',
  INSPECTION_CONFIRMED: 'inspection_confirmed',
  INSPECTION_DECLINED: 'inspection_declined',
  INSPECTION_RESCHEDULED: 'inspection_rescheduled',
  INSPECTION_CANCELLED: 'inspection_cancelled',
  VERIFICATION_UPDATE: 'verification_update',
  LISTING_UPDATE: 'listing_update',
} as const

export const AUTH_CONFIG = {
  ACCESS_TOKEN_TTL_SECONDS: 60 * 60 * 24, // 24 hours (1d)
  CODE_EXPIRY_MINUTES: 15,
  CODE_RESEND_COOLDOWN_SECONDS: 60,
  MAX_CODE_ATTEMPTS: 5,
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
} as const

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  PER_PAGE: 20,
  MAX_PER_PAGE: 100,
} as const
