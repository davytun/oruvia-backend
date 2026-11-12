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

export const ADMIN_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
} as const

export type AdminRole = (typeof ADMIN_ROLES)[keyof typeof ADMIN_ROLES]

export const CODE_PURPOSES = {
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
  PASSWORD_RESET: 'PASSWORD_RESET',
} as const

export type CodePurpose = (typeof CODE_PURPOSES)[keyof typeof CODE_PURPOSES]

export const LISTING_CLASSIFICATIONS = {
  RENT: 'rent',
  SALE: 'sale',
} as const

export type ListingClassification =
  (typeof LISTING_CLASSIFICATIONS)[keyof typeof LISTING_CLASSIFICATIONS]

export const PAYMENT_FREQUENCIES = {
  YEARLY: 'yearly',
  MONTHLY: 'monthly',
  ONE_TIME: 'one_time',
} as const

export type PaymentFrequency =
  (typeof PAYMENT_FREQUENCIES)[keyof typeof PAYMENT_FREQUENCIES]

export const MODERATION_STATUSES = {
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
} as const

export type ModerationStatus =
  (typeof MODERATION_STATUSES)[keyof typeof MODERATION_STATUSES]

export const PROPERTY_CATEGORIES = {
  RESIDENTIAL: 'residential',
  COMMERCIAL: 'commercial',
  LAND: 'land',
} as const

export type PropertyCategory =
  (typeof PROPERTY_CATEGORIES)[keyof typeof PROPERTY_CATEGORIES]

export const LISTER_ROLES = {
  AGENT: 'agent',
  LANDLORD: 'landlord',
} as const

export type ListerRole = (typeof LISTER_ROLES)[keyof typeof LISTER_ROLES]

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

export type InspectionMode =
  (typeof INSPECTION_MODES)[keyof typeof INSPECTION_MODES]

export const VIRTUAL_INSPECTION_METHODS = {
  LIVE_VIDEO_CALL: 'live_video_call',
  RECORDED_WALKTHROUGH: 'recorded_walkthrough',
} as const

export type VirtualInspectionMethod =
  (typeof VIRTUAL_INSPECTION_METHODS)[keyof typeof VIRTUAL_INSPECTION_METHODS]

export const INSPECTION_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  DECLINED: 'declined',
  RESCHEDULE_REQUESTED: 'reschedule_requested',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  NO_SHOW: 'no_show',
  EXPIRED: 'expired',
} as const

export type InspectionStatus =
  (typeof INSPECTION_STATUSES)[keyof typeof INSPECTION_STATUSES]

export const INSPECTION_FEE_STATUSES = {
  NOT_REQUIRED: 'not_required',
  UNPAID: 'unpaid',
  PAID: 'paid',
  WAIVED: 'waived',
} as const

export type InspectionFeeStatus =
  (typeof INSPECTION_FEE_STATUSES)[keyof typeof INSPECTION_FEE_STATUSES]

export const INSPECTION_ACTOR_TYPES = {
  SEEKER: 'seeker',
  AGENT: 'agent',
  LANDLORD: 'landlord',
  ADMIN: 'admin',
  SYSTEM: 'system',
} as const

export type InspectionActorType =
  (typeof INSPECTION_ACTOR_TYPES)[keyof typeof INSPECTION_ACTOR_TYPES]

export const INSPECTION_PROPOSED_BY = {
  SEEKER: 'seeker',
  LISTER: 'lister',
} as const

export type InspectionProposedBy =
  (typeof INSPECTION_PROPOSED_BY)[keyof typeof INSPECTION_PROPOSED_BY]

export const INSPECTION_CANCELLED_BY = {
  SEEKER: 'seeker',
  LISTER: 'lister',
  ADMIN: 'admin',
  SYSTEM: 'system',
} as const

export type InspectionCancelledBy =
  (typeof INSPECTION_CANCELLED_BY)[keyof typeof INSPECTION_CANCELLED_BY]

export const INSPECTION_ACTIONS = {
  REQUESTED: 'requested',
  CONFIRMED: 'confirmed',
  DECLINED: 'declined',
  RESCHEDULE_PROPOSED: 'reschedule_proposed',
  RESCHEDULE_ACCEPTED: 'reschedule_accepted',
  RESCHEDULE_REJECTED: 'reschedule_rejected',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  NO_SHOW: 'no_show',
  VIRTUAL_DETAILS_UPDATED: 'virtual_details_updated',
  FEE_UPDATED: 'fee_updated',
  ADMIN_RESCHEDULED: 'admin_rescheduled',
  ADMIN_CANCELLED: 'admin_cancelled',
  ADMIN_STATUS_OVERRIDE: 'admin_status_override',
  ADMIN_FEE_OVERRIDE: 'admin_fee_override',
  EXPIRED: 'expired',
} as const

export type InspectionAction =
  (typeof INSPECTION_ACTIONS)[keyof typeof INSPECTION_ACTIONS]

export const VERIFICATION_STATUSES = {
  UNVERIFIED: 'unverified',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const

export type VerificationStatus =
  (typeof VERIFICATION_STATUSES)[keyof typeof VERIFICATION_STATUSES]

export const VERIFICATION_BADGES = {
  VERIFIED_AGENT: 'verified_agent',
  LICENSED_AGENT: 'licensed_agent',
  VERIFIED_LANDLORD: 'verified_landlord',
  VERIFIED_OWNER: 'verified_owner',
} as const

export type VerificationBadge =
  (typeof VERIFICATION_BADGES)[keyof typeof VERIFICATION_BADGES]

export const KYC_ID_TYPES = {
  NIN: 'nin',
  INTERNATIONAL_PASSPORT: 'international_passport',
  DRIVERS_LICENSE: 'drivers_license',
  VOTERS_CARD: 'voters_card',
} as const

export type KycIdType = (typeof KYC_ID_TYPES)[keyof typeof KYC_ID_TYPES]

export const LANDLORD_PROOF_TYPES = {
  UTILITY_BILL: 'utility_bill',
  C_OF_O: 'c_of_o',
  DEED_OF_ASSIGNMENT: 'deed_of_assignment',
  SURVEY_PLAN: 'survey_plan',
  GOVERNORS_CONSENT: 'governors_consent',
} as const

export type LandlordProofType =
  (typeof LANDLORD_PROOF_TYPES)[keyof typeof LANDLORD_PROOF_TYPES]

export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5 MB
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ] as const,
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
  INSPECTION_REMINDER: 'inspection_reminder',
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
