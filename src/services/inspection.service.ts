import { and, desc, eq, sql } from 'drizzle-orm'
import { createElement } from 'react'
import {
  AVAILABILITY_STATUSES,
  INSPECTION_ACTIONS,
  INSPECTION_ACTOR_TYPES,
  INSPECTION_CANCELLED_BY,
  INSPECTION_FEE_STATUSES,
  INSPECTION_MODES,
  INSPECTION_PROPOSED_BY,
  INSPECTION_STATUSES,
  LISTER_ROLES,
  MODERATION_STATUSES,
  type InspectionAction,
  type InspectionActorType,
  type InspectionCancelledBy,
  type InspectionFeeStatus,
  type InspectionMode,
  type InspectionStatus,
  type ListerRole,
  type VirtualInspectionMethod,
} from '../config/constants'
import type { AppBindings } from '../config/env'
import type { Database } from '../database'
import {
  agentUsers,
  inspectionBookingEvents,
  inspectionBookings,
  landlordUsers,
  listerBlockedDates,
  propertyListings,
  seekerUsers,
} from '../models'
import { InspectionEmail } from '../templates'
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../utils/errors'
import type {
  CancelInspectionBookingInput,
  ConfirmInspectionBookingInput,
  CreateInspectionBookingInput,
  DeclineInspectionBookingInput,
  InspectionBookingQueryInput,
  ProposeRescheduleInput,
  RejectRescheduleInput,
  UpdateInspectionFeeStatusInput,
  UpdateListingInspectionOptionsInput,
  UpdateVirtualDetailsInput,
} from '../utils/validators'
import { sendEmail } from './email.service'
import {
  getListerSettings,
  toWatDate,
} from './inspection-schedule.service'

/**
 * Generate human-readable booking reference: e.g. "ORV-INS-7K2M9Q"
 */
export function generateInspectionReference(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  let code = ''
  const randomBytes = new Uint8Array(6)
  crypto.getRandomValues(randomBytes)
  for (let i = 0; i < 6; i++) {
    code += chars[randomBytes[i] % chars.length]
  }
  return `ORV-INS-${code}`
}

/**
 * Format UTC ISO string to readable WAT string: "Monday, 16 Nov 2026 at 11:30 AM"
 */
export function formatWatDateTime(utcIso: string): string {
  const d = new Date(utcIso)
  const wat = toWatDate(d)
  const days = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ]
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]

  const dayName = days[wat.getUTCDay()]
  const dateNum = wat.getUTCDate()
  const monthName = months[wat.getUTCMonth()]
  const year = wat.getUTCFullYear()

  let hours = wat.getUTCHours()
  const minutes = String(wat.getUTCMinutes()).padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12

  return `${dayName}, ${dateNum} ${monthName} ${year} at ${hours}:${minutes} ${ampm}`
}

/**
 * Record an immutable event in the inspection booking audit timeline
 */
export async function createBookingEvent(
  db: Database,
  params: {
    bookingId: string
    actorType: InspectionActorType
    actorId?: string | null
    action: InspectionAction | string
    fromStatus?: string | null
    toStatus?: string | null
    note?: string | null
    metadata?: Record<string, unknown>
  }
) {
  await db.insert(inspectionBookingEvents).values({
    bookingId: params.bookingId,
    actorType: params.actorType,
    actorId: params.actorId || null,
    action: params.action,
    fromStatus: params.fromStatus || null,
    toStatus: params.toStatus || null,
    note: params.note || null,
    metadata: params.metadata || null,
    createdAt: new Date().toISOString(),
  })
}

/**
 * Fetch lister contact record
 */
async function getListerContact(
  db: Database,
  listerRole: ListerRole,
  listerId: string
) {
  if (listerRole === LISTER_ROLES.AGENT) {
    const [agent] = await db
      .select({
        id: agentUsers.id,
        name: agentUsers.fullName,
        email: agentUsers.email,
        phone: agentUsers.phone,
        whatsapp: agentUsers.whatsappNumber,
        agencyName: agentUsers.agencyName,
      })
      .from(agentUsers)
      .where(eq(agentUsers.id, listerId))
      .limit(1)
    return agent
  } else {
    const [landlord] = await db
      .select({
        id: landlordUsers.id,
        name: landlordUsers.fullName,
        email: landlordUsers.email,
        phone: landlordUsers.phone,
        whatsapp: landlordUsers.whatsappNumber,
        agencyName: landlordUsers.companyName,
      })
      .from(landlordUsers)
      .where(eq(landlordUsers.id, listerId))
      .limit(1)
    return landlord
  }
}

// =============================================================================
// SEEKER OPERATIONS
// =============================================================================

/**
 * Seeker requests an inspection
 */
export async function createInspectionBooking(
  db: Database,
  env: AppBindings,
  seekerId: string,
  input: CreateInspectionBookingInput
) {
  // 1. Check Seeker status & email verification
  const [seeker] = await db
    .select()
    .from(seekerUsers)
    .where(eq(seekerUsers.id, seekerId))
    .limit(1)

  if (!seeker || seeker.isSuspended) {
    throw new ForbiddenError('Seeker account is suspended or invalid.')
  }

  if (!seeker.isEmailVerified) {
    throw new ForbiddenError(
      'Email verification is required before requesting property inspections. Please verify your email first.'
    )
  }

  // 2. Fetch Listing
  const [listing] = await db
    .select()
    .from(propertyListings)
    .where(eq(propertyListings.id, input.listing_id))
    .limit(1)

  if (!listing) {
    throw new NotFoundError('Property listing not found.')
  }

  if (
    listing.moderationStatus !== MODERATION_STATUSES.APPROVED ||
    listing.availabilityStatus !== AVAILABILITY_STATUSES.AVAILABLE
  ) {
    throw new BadRequestError(
      'This property is not currently available for inspection booking.'
    )
  }

  const listerRole = (listing.listerRole || LISTER_ROLES.AGENT) as ListerRole
  const listerId = (listing.agentId || listing.landlordId)!
  const settings = await getListerSettings(db, listerRole, listerId)

  // 3. Validate mode permissions
  if (input.mode === INSPECTION_MODES.PHYSICAL && !listing.allowsPhysicalInspection) {
    throw new BadRequestError('Physical inspection is not offered for this listing.')
  }

  if (input.mode === INSPECTION_MODES.VIRTUAL) {
    if (!listing.allowsVirtualInspection || !settings.accepts_virtual) {
      throw new BadRequestError('Virtual inspection is not offered for this listing.')
    }
    if (!input.virtual_method) {
      input.virtual_method = 'live_video_call'
    }
  }

  // 4. Validate time
  const scheduledDate = new Date(input.scheduled_at)
  if (isNaN(scheduledDate.getTime())) {
    throw new BadRequestError('Invalid scheduled_at date.')
  }

  const now = new Date()
  const minNoticeTime = new Date(
    now.getTime() + settings.min_notice_hours * 60 * 60 * 1000
  )
  if (scheduledDate <= minNoticeTime) {
    throw new BadRequestError(
      `Scheduled inspection time must be at least ${settings.min_notice_hours} hour(s) in advance.`
    )
  }

  // Check blocked dates
  const watDate = toWatDate(scheduledDate)
  const ymd = watDate.toISOString().split('T')[0]
  const [blocked] = await db
    .select()
    .from(listerBlockedDates)
    .where(
      and(
        eq(listerBlockedDates.listerRole, listerRole),
        eq(listerBlockedDates.listerId, listerId),
        eq(listerBlockedDates.date, ymd)
      )
    )
    .limit(1)

  if (blocked) {
    throw new BadRequestError(
      `The selected date (${ymd}) is unavailable for inspections. Please pick another date.`
    )
  }

  // 5. Generate Reference & Snapshot Fees
  const reference = generateInspectionReference()
  const inspectionFee = listing.inspectionFee ?? 0
  const feeStatus =
    inspectionFee > 0
      ? INSPECTION_FEE_STATUSES.UNPAID
      : INSPECTION_FEE_STATUSES.NOT_REQUIRED

  const nowIso = now.toISOString()

  // 6. Insert Booking
  const [booking] = await db
    .insert(inspectionBookings)
    .values({
      reference,
      listingId: listing.id,
      seekerId: seeker.id,
      listerRole,
      listerId,
      mode: input.mode,
      virtualMethod: input.virtual_method || null,
      scheduledAt: scheduledDate.toISOString(),
      durationMinutes: settings.slot_duration_minutes,
      status: INSPECTION_STATUSES.PENDING,
      seekerNote: input.note || null,
      inspectionFee,
      feeStatus,
      createdAt: nowIso,
      updatedAt: nowIso,
    })
    .returning()

  // 7. Audit Event
  await createBookingEvent(db, {
    bookingId: booking.id,
    actorType: INSPECTION_ACTOR_TYPES.SEEKER,
    actorId: seeker.id,
    action: INSPECTION_ACTIONS.REQUESTED,
    fromStatus: null,
    toStatus: INSPECTION_STATUSES.PENDING,
    note: input.note || null,
    metadata: {
      scheduled_at: booking.scheduledAt,
      mode: booking.mode,
      inspection_fee: booking.inspectionFee,
    },
  })

  // 8. Notify Lister via Email
  const lister = await getListerContact(db, listerRole, listerId)
  if (lister) {
    const formattedWat = formatWatDateTime(booking.scheduledAt)
    try {
      await sendEmail(env, {
        to: lister.email,
        subject: `New Inspection Request: ${listing.title} (${reference})`,
        template: createElement(InspectionEmail, {
          recipientName: lister.name,
          title: 'New Inspection Request',
          message: `${seeker.fullName} has requested an inspection for "${listing.title}". Please review and confirm or reschedule.`,
          reference: booking.reference,
          listingTitle: listing.title,
          propertyAddress: `${listing.address}, ${listing.area}`,
          scheduledAtWat: formattedWat,
          mode: booking.mode as 'physical' | 'virtual',
          virtualMethod: booking.virtualMethod,
          contactName: seeker.fullName,
          contactPhone: seeker.phone || undefined,
          contactWhatsapp: seeker.phone || undefined,
          inspectionFee: booking.inspectionFee,
          feeStatus: booking.feeStatus,
          note: booking.seekerNote,
        }),
      })
    } catch (err) {
      console.error('[EmailService] Failed to send inspection request notification:', err)
    }
  }

  return formatBookingSummary(booking, listing, seeker, lister)
}

/**
 * Seeker lists their own bookings
 */
export async function getSeekerBookings(
  db: Database,
  seekerId: string,
  query: InspectionBookingQueryInput
) {
  const page = query.page ?? 1
  const perPage = query.per_page ?? 20
  const offset = (page - 1) * perPage

  const conditions = [eq(inspectionBookings.seekerId, seekerId)]
  if (query.status) {
    conditions.push(eq(inspectionBookings.status, query.status))
  }
  if (query.listing_id) {
    conditions.push(eq(inspectionBookings.listingId, query.listing_id))
  }

  const whereClause = and(...conditions)

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(inspectionBookings)
    .where(whereClause)
  const total = Number(countResult?.count || 0)

  const rows = await db
    .select({
      booking: inspectionBookings,
      listing: propertyListings,
    })
    .from(inspectionBookings)
    .innerJoin(
      propertyListings,
      eq(inspectionBookings.listingId, propertyListings.id)
    )
    .where(whereClause)
    .orderBy(desc(inspectionBookings.createdAt))
    .limit(perPage)
    .offset(offset)

  const items = await Promise.all(
    rows.map(async ({ booking, listing }) => {
      const lister = await getListerContact(
        db,
        booking.listerRole as ListerRole,
        booking.listerId
      )
      return formatBookingSummary(booking, listing, undefined, lister)
    })
  )

  return {
    items,
    meta: {
      page,
      per_page: perPage,
      total_records: total,
      total_pages: Math.ceil(total / perPage) || 1,
    },
  }
}

/**
 * Seeker gets single booking with full audit timeline
 */
export async function getSeekerBookingById(
  db: Database,
  seekerId: string,
  bookingId: string
) {
  const [row] = await db
    .select({
      booking: inspectionBookings,
      listing: propertyListings,
      seeker: seekerUsers,
    })
    .from(inspectionBookings)
    .innerJoin(
      propertyListings,
      eq(inspectionBookings.listingId, propertyListings.id)
    )
    .innerJoin(
      seekerUsers,
      eq(inspectionBookings.seekerId, seekerUsers.id)
    )
    .where(
      and(
        eq(inspectionBookings.id, bookingId),
        eq(inspectionBookings.seekerId, seekerId)
      )
    )
    .limit(1)

  if (!row) {
    throw new NotFoundError('Inspection booking not found.')
  }

  const lister = await getListerContact(
    db,
    row.booking.listerRole as ListerRole,
    row.booking.listerId
  )

  const events = await db
    .select()
    .from(inspectionBookingEvents)
    .where(eq(inspectionBookingEvents.bookingId, bookingId))
    .orderBy(desc(inspectionBookingEvents.createdAt))

  return {
    ...formatBookingSummary(row.booking, row.listing, row.seeker, lister),
    timeline: events.map((e) => ({
      id: e.id,
      actor_type: e.actorType,
      action: e.action,
      from_status: e.fromStatus,
      to_status: e.toStatus,
      note: e.note,
      metadata: e.metadata,
      created_at: e.createdAt,
    })),
  }
}

/**
 * Seeker proposes a reschedule
 */
export async function seekerProposeReschedule(
  db: Database,
  env: AppBindings,
  seekerId: string,
  bookingId: string,
  input: ProposeRescheduleInput
) {
  const [booking] = await db
    .select()
    .from(inspectionBookings)
    .where(
      and(
        eq(inspectionBookings.id, bookingId),
        eq(inspectionBookings.seekerId, seekerId)
      )
    )
    .limit(1)

  if (!booking) {
    throw new NotFoundError('Inspection booking not found.')
  }

  if (
    booking.status !== INSPECTION_STATUSES.PENDING &&
    booking.status !== INSPECTION_STATUSES.CONFIRMED &&
    booking.status !== INSPECTION_STATUSES.RESCHEDULE_REQUESTED
  ) {
    throw new BadRequestError(
      `Cannot reschedule a booking with status "${booking.status}".`
    )
  }

  const proposedDate = new Date(input.proposed_at)
  if (isNaN(proposedDate.getTime()) || proposedDate <= new Date()) {
    throw new BadRequestError('Proposed reschedule time must be in the future.')
  }

  const nowIso = new Date().toISOString()
  const previousStatus =
    booking.status === INSPECTION_STATUSES.RESCHEDULE_REQUESTED
      ? booking.statusBeforeReschedule || INSPECTION_STATUSES.PENDING
      : booking.status

  const [updated] = await db
    .update(inspectionBookings)
    .set({
      status: INSPECTION_STATUSES.RESCHEDULE_REQUESTED,
      statusBeforeReschedule: previousStatus,
      proposedAt: proposedDate.toISOString(),
      proposedBy: INSPECTION_PROPOSED_BY.SEEKER,
      rescheduleReason: input.reason || null,
      updatedAt: nowIso,
    })
    .where(eq(inspectionBookings.id, bookingId))
    .returning()

  await createBookingEvent(db, {
    bookingId,
    actorType: INSPECTION_ACTOR_TYPES.SEEKER,
    actorId: seekerId,
    action: INSPECTION_ACTIONS.RESCHEDULE_PROPOSED,
    fromStatus: booking.status,
    toStatus: INSPECTION_STATUSES.RESCHEDULE_REQUESTED,
    note: input.reason || null,
    metadata: {
      old_scheduled_at: booking.scheduledAt,
      new_proposed_at: updated.proposedAt,
    },
  })

  // Email Lister
  const [listing] = await db
    .select()
    .from(propertyListings)
    .where(eq(propertyListings.id, booking.listingId))
    .limit(1)
  const lister = await getListerContact(
    db,
    booking.listerRole as ListerRole,
    booking.listerId
  )
  if (lister && listing) {
    try {
      await sendEmail(env, {
        to: lister.email,
        subject: `Reschedule Proposed: ${listing.title} (${booking.reference})`,
        template: createElement(InspectionEmail, {
          recipientName: lister.name,
          title: 'Reschedule Proposed by Seeker',
          message: `The seeker has proposed a new inspection time for "${listing.title}". Please accept or propose another time.`,
          reference: booking.reference,
          listingTitle: listing.title,
          propertyAddress: `${listing.address}, ${listing.area}`,
          scheduledAtWat: formatWatDateTime(updated.proposedAt!),
          mode: booking.mode as 'physical' | 'virtual',
          note: input.reason || null,
        }),
      })
    } catch (err) {
      console.error('[EmailService] Failed to send reschedule notification:', err)
    }
  }

  return { message: 'Reschedule proposed successfully.', booking: updated }
}

/**
 * Seeker accepts lister's reschedule proposal
 */
export async function seekerAcceptReschedule(
  db: Database,
  env: AppBindings,
  seekerId: string,
  bookingId: string
) {
  const [booking] = await db
    .select()
    .from(inspectionBookings)
    .where(
      and(
        eq(inspectionBookings.id, bookingId),
        eq(inspectionBookings.seekerId, seekerId)
      )
    )
    .limit(1)

  if (!booking) {
    throw new NotFoundError('Inspection booking not found.')
  }

  if (
    booking.status !== INSPECTION_STATUSES.RESCHEDULE_REQUESTED ||
    booking.proposedBy !== INSPECTION_PROPOSED_BY.LISTER ||
    !booking.proposedAt
  ) {
    throw new BadRequestError('No pending reschedule proposal from the lister to accept.')
  }

  const nowIso = new Date().toISOString()
  const newScheduledAt = booking.proposedAt

  const [updated] = await db
    .update(inspectionBookings)
    .set({
      scheduledAt: newScheduledAt,
      status: INSPECTION_STATUSES.CONFIRMED,
      statusBeforeReschedule: null,
      proposedAt: null,
      proposedBy: null,
      rescheduleReason: null,
      confirmedAt: nowIso,
      updatedAt: nowIso,
    })
    .where(eq(inspectionBookings.id, bookingId))
    .returning()

  await createBookingEvent(db, {
    bookingId,
    actorType: INSPECTION_ACTOR_TYPES.SEEKER,
    actorId: seekerId,
    action: INSPECTION_ACTIONS.RESCHEDULE_ACCEPTED,
    fromStatus: INSPECTION_STATUSES.RESCHEDULE_REQUESTED,
    toStatus: INSPECTION_STATUSES.CONFIRMED,
    note: 'Seeker accepted reschedule proposal.',
    metadata: { confirmed_scheduled_at: newScheduledAt },
  })

  // Email Lister
  const [listing] = await db
    .select()
    .from(propertyListings)
    .where(eq(propertyListings.id, booking.listingId))
    .limit(1)
  const lister = await getListerContact(
    db,
    booking.listerRole as ListerRole,
    booking.listerId
  )
  if (lister && listing) {
    try {
      await sendEmail(env, {
        to: lister.email,
        subject: `Reschedule Accepted: ${listing.title} (${booking.reference})`,
        template: createElement(InspectionEmail, {
          recipientName: lister.name,
          title: 'Reschedule Accepted',
          message: `The seeker accepted your proposed time for "${listing.title}". The booking is now confirmed.`,
          reference: booking.reference,
          listingTitle: listing.title,
          propertyAddress: `${listing.address}, ${listing.area}`,
          scheduledAtWat: formatWatDateTime(newScheduledAt),
          mode: booking.mode as 'physical' | 'virtual',
          meetingLink: booking.meetingLink,
          recordedVideoUrl: booking.recordedVideoUrl,
        }),
      })
    } catch (err) {
      console.error('[EmailService] Failed to notify lister of acceptance:', err)
    }
  }

  return { message: 'Reschedule accepted. Booking confirmed.', booking: updated }
}

/**
 * Seeker rejects lister's reschedule proposal
 */
export async function seekerRejectReschedule(
  db: Database,
  env: AppBindings,
  seekerId: string,
  bookingId: string,
  input: RejectRescheduleInput
) {
  const [booking] = await db
    .select()
    .from(inspectionBookings)
    .where(
      and(
        eq(inspectionBookings.id, bookingId),
        eq(inspectionBookings.seekerId, seekerId)
      )
    )
    .limit(1)

  if (!booking) {
    throw new NotFoundError('Inspection booking not found.')
  }

  if (
    booking.status !== INSPECTION_STATUSES.RESCHEDULE_REQUESTED ||
    booking.proposedBy !== INSPECTION_PROPOSED_BY.LISTER
  ) {
    throw new BadRequestError('No pending reschedule proposal from the lister to reject.')
  }

  const restoredStatus =
    booking.statusBeforeReschedule || INSPECTION_STATUSES.PENDING
  const nowIso = new Date().toISOString()

  const [updated] = await db
    .update(inspectionBookings)
    .set({
      status: restoredStatus,
      statusBeforeReschedule: null,
      proposedAt: null,
      proposedBy: null,
      rescheduleReason: null,
      updatedAt: nowIso,
    })
    .where(eq(inspectionBookings.id, bookingId))
    .returning()

  await createBookingEvent(db, {
    bookingId,
    actorType: INSPECTION_ACTOR_TYPES.SEEKER,
    actorId: seekerId,
    action: INSPECTION_ACTIONS.RESCHEDULE_REJECTED,
    fromStatus: INSPECTION_STATUSES.RESCHEDULE_REQUESTED,
    toStatus: restoredStatus,
    note: input.reason || 'Seeker rejected reschedule proposal.',
  })

  return {
    message: `Reschedule rejected. Booking restored to ${restoredStatus}.`,
    booking: updated,
  }
}

/**
 * Seeker cancels their booking
 */
export async function seekerCancelBooking(
  db: Database,
  env: AppBindings,
  seekerId: string,
  bookingId: string,
  input: CancelInspectionBookingInput
) {
  const [booking] = await db
    .select()
    .from(inspectionBookings)
    .where(
      and(
        eq(inspectionBookings.id, bookingId),
        eq(inspectionBookings.seekerId, seekerId)
      )
    )
    .limit(1)

  if (!booking) {
    throw new NotFoundError('Inspection booking not found.')
  }

  if (
    booking.status === INSPECTION_STATUSES.CANCELLED ||
    booking.status === INSPECTION_STATUSES.COMPLETED ||
    booking.status === INSPECTION_STATUSES.DECLINED
  ) {
    throw new BadRequestError(
      `Cannot cancel a booking that is already "${booking.status}".`
    )
  }

  const nowIso = new Date().toISOString()

  const [updated] = await db
    .update(inspectionBookings)
    .set({
      status: INSPECTION_STATUSES.CANCELLED,
      cancelledBy: INSPECTION_CANCELLED_BY.SEEKER,
      cancelReason: input.reason || null,
      cancelledAt: nowIso,
      updatedAt: nowIso,
    })
    .where(eq(inspectionBookings.id, bookingId))
    .returning()

  await createBookingEvent(db, {
    bookingId,
    actorType: INSPECTION_ACTOR_TYPES.SEEKER,
    actorId: seekerId,
    action: INSPECTION_ACTIONS.CANCELLED,
    fromStatus: booking.status,
    toStatus: INSPECTION_STATUSES.CANCELLED,
    note: input.reason || null,
  })

  // Email Lister
  const [listing] = await db
    .select()
    .from(propertyListings)
    .where(eq(propertyListings.id, booking.listingId))
    .limit(1)
  const lister = await getListerContact(
    db,
    booking.listerRole as ListerRole,
    booking.listerId
  )
  if (lister && listing) {
    try {
      await sendEmail(env, {
        to: lister.email,
        subject: `Inspection Cancelled: ${listing.title} (${booking.reference})`,
        template: createElement(InspectionEmail, {
          recipientName: lister.name,
          title: 'Inspection Cancelled by Seeker',
          message: `The seeker has cancelled the inspection booking for "${listing.title}".`,
          reference: booking.reference,
          listingTitle: listing.title,
          propertyAddress: `${listing.address}, ${listing.area}`,
          scheduledAtWat: formatWatDateTime(booking.scheduledAt),
          mode: booking.mode as 'physical' | 'virtual',
          note: input.reason || null,
        }),
      })
    } catch (err) {
      console.error('[EmailService] Failed to notify lister of cancellation:', err)
    }
  }

  return { message: 'Inspection booking cancelled successfully.', booking: updated }
}

// =============================================================================
// LISTER OPERATIONS (AGENTS & LANDLORDS)
// =============================================================================

/**
 * Lister lists incoming inspection bookings
 */
export async function getListerBookings(
  db: Database,
  listerRole: ListerRole,
  listerId: string,
  query: InspectionBookingQueryInput
) {
  const page = query.page ?? 1
  const perPage = query.per_page ?? 20
  const offset = (page - 1) * perPage

  const conditions = [
    eq(inspectionBookings.listerRole, listerRole),
    eq(inspectionBookings.listerId, listerId),
  ]
  if (query.status) {
    conditions.push(eq(inspectionBookings.status, query.status))
  }
  if (query.listing_id) {
    conditions.push(eq(inspectionBookings.listingId, query.listing_id))
  }

  const whereClause = and(...conditions)

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(inspectionBookings)
    .where(whereClause)
  const total = Number(countResult?.count || 0)

  const rows = await db
    .select({
      booking: inspectionBookings,
      listing: propertyListings,
      seeker: seekerUsers,
    })
    .from(inspectionBookings)
    .innerJoin(
      propertyListings,
      eq(inspectionBookings.listingId, propertyListings.id)
    )
    .innerJoin(
      seekerUsers,
      eq(inspectionBookings.seekerId, seekerUsers.id)
    )
    .where(whereClause)
    .orderBy(desc(inspectionBookings.createdAt))
    .limit(perPage)
    .offset(offset)

  const items = rows.map(({ booking, listing, seeker }) =>
    formatBookingSummary(booking, listing, seeker, undefined)
  )

  return {
    items,
    meta: {
      page,
      per_page: perPage,
      total_records: total,
      total_pages: Math.ceil(total / perPage) || 1,
    },
  }
}

/**
 * Lister gets single booking with seeker details & audit timeline
 */
export async function getListerBookingById(
  db: Database,
  listerRole: ListerRole,
  listerId: string,
  bookingId: string
) {
  const [row] = await db
    .select({
      booking: inspectionBookings,
      listing: propertyListings,
      seeker: seekerUsers,
    })
    .from(inspectionBookings)
    .innerJoin(
      propertyListings,
      eq(inspectionBookings.listingId, propertyListings.id)
    )
    .innerJoin(
      seekerUsers,
      eq(inspectionBookings.seekerId, seekerUsers.id)
    )
    .where(
      and(
        eq(inspectionBookings.id, bookingId),
        eq(inspectionBookings.listerRole, listerRole),
        eq(inspectionBookings.listerId, listerId)
      )
    )
    .limit(1)

  if (!row) {
    throw new NotFoundError('Inspection booking not found.')
  }

  const events = await db
    .select()
    .from(inspectionBookingEvents)
    .where(eq(inspectionBookingEvents.bookingId, bookingId))
    .orderBy(desc(inspectionBookingEvents.createdAt))

  return {
    ...formatBookingSummary(row.booking, row.listing, row.seeker, undefined),
    timeline: events.map((e) => ({
      id: e.id,
      actor_type: e.actorType,
      action: e.action,
      from_status: e.fromStatus,
      to_status: e.toStatus,
      note: e.note,
      metadata: e.metadata,
      created_at: e.createdAt,
    })),
  }
}

/**
 * Lister confirms a pending inspection booking
 */
export async function listerConfirmBooking(
  db: Database,
  env: AppBindings,
  listerRole: ListerRole,
  listerId: string,
  bookingId: string,
  input: ConfirmInspectionBookingInput
) {
  const [booking] = await db
    .select()
    .from(inspectionBookings)
    .where(
      and(
        eq(inspectionBookings.id, bookingId),
        eq(inspectionBookings.listerRole, listerRole),
        eq(inspectionBookings.listerId, listerId)
      )
    )
    .limit(1)

  if (!booking) {
    throw new NotFoundError('Inspection booking not found.')
  }

  if (
    booking.status !== INSPECTION_STATUSES.PENDING &&
    booking.status !== INSPECTION_STATUSES.RESCHEDULE_REQUESTED
  ) {
    throw new BadRequestError(
      `Cannot confirm a booking with status "${booking.status}".`
    )
  }

  // Check capacity conflict for the slot
  const settings = await getListerSettings(db, listerRole, listerId)
  const [existingConfirmed] = await db
    .select({ count: sql<number>`count(*)` })
    .from(inspectionBookings)
    .where(
      and(
        eq(inspectionBookings.listerRole, listerRole),
        eq(inspectionBookings.listerId, listerId),
        eq(inspectionBookings.status, INSPECTION_STATUSES.CONFIRMED),
        eq(inspectionBookings.scheduledAt, booking.scheduledAt)
      )
    )

  const confirmedCount = Number(existingConfirmed?.count || 0)
  if (confirmedCount >= settings.max_bookings_per_slot) {
    throw new ConflictError(
      `This time slot has reached its maximum confirmed capacity (${settings.max_bookings_per_slot}). Please propose a reschedule.`
    )
  }

  const nowIso = new Date().toISOString()
  const updateValues: Partial<typeof inspectionBookings.$inferInsert> = {
    status: INSPECTION_STATUSES.CONFIRMED,
    confirmedAt: nowIso,
    updatedAt: nowIso,
  }

  if (input.meeting_link !== undefined)
    updateValues.meetingLink = input.meeting_link || null
  if (input.recorded_video_url !== undefined)
    updateValues.recordedVideoUrl = input.recorded_video_url || null
  if (input.lister_note !== undefined)
    updateValues.listerNote = input.lister_note || null

  const [updated] = await db
    .update(inspectionBookings)
    .set(updateValues)
    .where(eq(inspectionBookings.id, bookingId))
    .returning()

  await createBookingEvent(db, {
    bookingId,
    actorType: listerRole as InspectionActorType,
    actorId: listerId,
    action: INSPECTION_ACTIONS.CONFIRMED,
    fromStatus: booking.status,
    toStatus: INSPECTION_STATUSES.CONFIRMED,
    note: input.lister_note || null,
    metadata: {
      meeting_link: updated.meetingLink,
      recorded_video_url: updated.recordedVideoUrl,
    },
  })

  // Email Seeker
  const [seeker] = await db
    .select()
    .from(seekerUsers)
    .where(eq(seekerUsers.id, booking.seekerId))
    .limit(1)
  const [listing] = await db
    .select()
    .from(propertyListings)
    .where(eq(propertyListings.id, booking.listingId))
    .limit(1)
  const lister = await getListerContact(db, listerRole, listerId)

  if (seeker && listing && lister) {
    try {
      await sendEmail(env, {
        to: seeker.email,
        subject: `Inspection Confirmed: ${listing.title} (${booking.reference})`,
        template: createElement(InspectionEmail, {
          recipientName: seeker.fullName,
          title: 'Inspection Booking Confirmed!',
          message: `Your inspection for "${listing.title}" has been confirmed by ${lister.name}.`,
          reference: booking.reference,
          listingTitle: listing.title,
          propertyAddress: `${listing.address}, ${listing.area}`,
          scheduledAtWat: formatWatDateTime(updated.scheduledAt),
          mode: updated.mode as 'physical' | 'virtual',
          virtualMethod: updated.virtualMethod,
          meetingLink: updated.meetingLink,
          recordedVideoUrl: updated.recordedVideoUrl,
          contactName: lister.name,
          contactPhone: lister.phone || undefined,
          contactWhatsapp: lister.whatsapp || undefined,
          inspectionFee: updated.inspectionFee,
          feeStatus: updated.feeStatus,
          note: updated.listerNote,
        }),
      })
    } catch (err) {
      console.error('[EmailService] Failed to notify seeker of confirmation:', err)
    }
  }

  return { message: 'Inspection booking confirmed successfully.', booking: updated }
}

/**
 * Lister declines a pending inspection booking
 */
export async function listerDeclineBooking(
  db: Database,
  env: AppBindings,
  listerRole: ListerRole,
  listerId: string,
  bookingId: string,
  input: DeclineInspectionBookingInput
) {
  const [booking] = await db
    .select()
    .from(inspectionBookings)
    .where(
      and(
        eq(inspectionBookings.id, bookingId),
        eq(inspectionBookings.listerRole, listerRole),
        eq(inspectionBookings.listerId, listerId)
      )
    )
    .limit(1)

  if (!booking) {
    throw new NotFoundError('Inspection booking not found.')
  }

  if (booking.status !== INSPECTION_STATUSES.PENDING) {
    throw new BadRequestError(
      `Cannot decline a booking with status "${booking.status}".`
    )
  }

  const nowIso = new Date().toISOString()

  const [updated] = await db
    .update(inspectionBookings)
    .set({
      status: INSPECTION_STATUSES.DECLINED,
      declineReason: input.reason,
      updatedAt: nowIso,
    })
    .where(eq(inspectionBookings.id, bookingId))
    .returning()

  await createBookingEvent(db, {
    bookingId,
    actorType: listerRole as InspectionActorType,
    actorId: listerId,
    action: INSPECTION_ACTIONS.DECLINED,
    fromStatus: INSPECTION_STATUSES.PENDING,
    toStatus: INSPECTION_STATUSES.DECLINED,
    note: input.reason,
  })

  // Email Seeker
  const [seeker] = await db
    .select()
    .from(seekerUsers)
    .where(eq(seekerUsers.id, booking.seekerId))
    .limit(1)
  const [listing] = await db
    .select()
    .from(propertyListings)
    .where(eq(propertyListings.id, booking.listingId))
    .limit(1)

  if (seeker && listing) {
    try {
      await sendEmail(env, {
        to: seeker.email,
        subject: `Inspection Request Declined: ${listing.title} (${booking.reference})`,
        template: createElement(InspectionEmail, {
          recipientName: seeker.fullName,
          title: 'Inspection Request Declined',
          message: `The lister was unable to accept your inspection request for "${listing.title}". Reason: ${input.reason}`,
          reference: booking.reference,
          listingTitle: listing.title,
          propertyAddress: `${listing.address}, ${listing.area}`,
          scheduledAtWat: formatWatDateTime(booking.scheduledAt),
          mode: booking.mode as 'physical' | 'virtual',
          note: input.reason,
        }),
      })
    } catch (err) {
      console.error('[EmailService] Failed to notify seeker of decline:', err)
    }
  }

  return { message: 'Inspection booking declined.', booking: updated }
}

/**
 * Lister proposes a reschedule to Seeker
 */
export async function listerProposeReschedule(
  db: Database,
  env: AppBindings,
  listerRole: ListerRole,
  listerId: string,
  bookingId: string,
  input: ProposeRescheduleInput
) {
  const [booking] = await db
    .select()
    .from(inspectionBookings)
    .where(
      and(
        eq(inspectionBookings.id, bookingId),
        eq(inspectionBookings.listerRole, listerRole),
        eq(inspectionBookings.listerId, listerId)
      )
    )
    .limit(1)

  if (!booking) {
    throw new NotFoundError('Inspection booking not found.')
  }

  if (
    booking.status !== INSPECTION_STATUSES.PENDING &&
    booking.status !== INSPECTION_STATUSES.CONFIRMED &&
    booking.status !== INSPECTION_STATUSES.RESCHEDULE_REQUESTED
  ) {
    throw new BadRequestError(
      `Cannot propose a reschedule for booking with status "${booking.status}".`
    )
  }

  const proposedDate = new Date(input.proposed_at)
  if (isNaN(proposedDate.getTime()) || proposedDate <= new Date()) {
    throw new BadRequestError('Proposed reschedule time must be in the future.')
  }

  const nowIso = new Date().toISOString()
  const previousStatus =
    booking.status === INSPECTION_STATUSES.RESCHEDULE_REQUESTED
      ? booking.statusBeforeReschedule || INSPECTION_STATUSES.PENDING
      : booking.status

  const [updated] = await db
    .update(inspectionBookings)
    .set({
      status: INSPECTION_STATUSES.RESCHEDULE_REQUESTED,
      statusBeforeReschedule: previousStatus,
      proposedAt: proposedDate.toISOString(),
      proposedBy: INSPECTION_PROPOSED_BY.LISTER,
      rescheduleReason: input.reason || null,
      updatedAt: nowIso,
    })
    .where(eq(inspectionBookings.id, bookingId))
    .returning()

  await createBookingEvent(db, {
    bookingId,
    actorType: listerRole as InspectionActorType,
    actorId: listerId,
    action: INSPECTION_ACTIONS.RESCHEDULE_PROPOSED,
    fromStatus: booking.status,
    toStatus: INSPECTION_STATUSES.RESCHEDULE_REQUESTED,
    note: input.reason || null,
    metadata: {
      old_scheduled_at: booking.scheduledAt,
      new_proposed_at: updated.proposedAt,
    },
  })

  // Email Seeker
  const [seeker] = await db
    .select()
    .from(seekerUsers)
    .where(eq(seekerUsers.id, booking.seekerId))
    .limit(1)
  const [listing] = await db
    .select()
    .from(propertyListings)
    .where(eq(propertyListings.id, booking.listingId))
    .limit(1)
  const lister = await getListerContact(db, listerRole, listerId)

  if (seeker && listing && lister) {
    try {
      await sendEmail(env, {
        to: seeker.email,
        subject: `Reschedule Proposed: ${listing.title} (${booking.reference})`,
        template: createElement(InspectionEmail, {
          recipientName: seeker.fullName,
          title: 'Reschedule Proposed by Lister',
          message: `${lister.name} has proposed a new time for your inspection of "${listing.title}". Please accept or cancel.`,
          reference: booking.reference,
          listingTitle: listing.title,
          propertyAddress: `${listing.address}, ${listing.area}`,
          scheduledAtWat: formatWatDateTime(updated.proposedAt!),
          mode: booking.mode as 'physical' | 'virtual',
          note: input.reason || null,
        }),
      })
    } catch (err) {
      console.error('[EmailService] Failed to notify seeker of reschedule:', err)
    }
  }

  return { message: 'Reschedule proposed to seeker successfully.', booking: updated }
}

/**
 * Lister accepts seeker's reschedule proposal
 */
export async function listerAcceptReschedule(
  db: Database,
  env: AppBindings,
  listerRole: ListerRole,
  listerId: string,
  bookingId: string
) {
  const [booking] = await db
    .select()
    .from(inspectionBookings)
    .where(
      and(
        eq(inspectionBookings.id, bookingId),
        eq(inspectionBookings.listerRole, listerRole),
        eq(inspectionBookings.listerId, listerId)
      )
    )
    .limit(1)

  if (!booking) {
    throw new NotFoundError('Inspection booking not found.')
  }

  if (
    booking.status !== INSPECTION_STATUSES.RESCHEDULE_REQUESTED ||
    booking.proposedBy !== INSPECTION_PROPOSED_BY.SEEKER ||
    !booking.proposedAt
  ) {
    throw new BadRequestError('No pending reschedule proposal from seeker to accept.')
  }

  const nowIso = new Date().toISOString()
  const newScheduledAt = booking.proposedAt

  const [updated] = await db
    .update(inspectionBookings)
    .set({
      scheduledAt: newScheduledAt,
      status: INSPECTION_STATUSES.CONFIRMED,
      statusBeforeReschedule: null,
      proposedAt: null,
      proposedBy: null,
      rescheduleReason: null,
      confirmedAt: nowIso,
      updatedAt: nowIso,
    })
    .where(eq(inspectionBookings.id, bookingId))
    .returning()

  await createBookingEvent(db, {
    bookingId,
    actorType: listerRole as InspectionActorType,
    actorId: listerId,
    action: INSPECTION_ACTIONS.RESCHEDULE_ACCEPTED,
    fromStatus: INSPECTION_STATUSES.RESCHEDULE_REQUESTED,
    toStatus: INSPECTION_STATUSES.CONFIRMED,
    note: 'Lister accepted reschedule proposal.',
    metadata: { confirmed_scheduled_at: newScheduledAt },
  })

  // Email Seeker
  const [seeker] = await db
    .select()
    .from(seekerUsers)
    .where(eq(seekerUsers.id, booking.seekerId))
    .limit(1)
  const [listing] = await db
    .select()
    .from(propertyListings)
    .where(eq(propertyListings.id, booking.listingId))
    .limit(1)
  const lister = await getListerContact(db, listerRole, listerId)

  if (seeker && listing && lister) {
    try {
      await sendEmail(env, {
        to: seeker.email,
        subject: `Reschedule Accepted: ${listing.title} (${booking.reference})`,
        template: createElement(InspectionEmail, {
          recipientName: seeker.fullName,
          title: 'Inspection Reschedule Confirmed',
          message: `Your proposed new time for "${listing.title}" has been accepted. The booking is now confirmed.`,
          reference: booking.reference,
          listingTitle: listing.title,
          propertyAddress: `${listing.address}, ${listing.area}`,
          scheduledAtWat: formatWatDateTime(newScheduledAt),
          mode: booking.mode as 'physical' | 'virtual',
          meetingLink: booking.meetingLink,
          recordedVideoUrl: booking.recordedVideoUrl,
        }),
      })
    } catch (err) {
      console.error('[EmailService] Failed to notify seeker of acceptance:', err)
    }
  }

  return { message: 'Reschedule accepted. Booking confirmed.', booking: updated }
}

/**
 * Lister rejects seeker's reschedule proposal
 */
export async function listerRejectReschedule(
  db: Database,
  env: AppBindings,
  listerRole: ListerRole,
  listerId: string,
  bookingId: string,
  input: RejectRescheduleInput
) {
  const [booking] = await db
    .select()
    .from(inspectionBookings)
    .where(
      and(
        eq(inspectionBookings.id, bookingId),
        eq(inspectionBookings.listerRole, listerRole),
        eq(inspectionBookings.listerId, listerId)
      )
    )
    .limit(1)

  if (!booking) {
    throw new NotFoundError('Inspection booking not found.')
  }

  if (
    booking.status !== INSPECTION_STATUSES.RESCHEDULE_REQUESTED ||
    booking.proposedBy !== INSPECTION_PROPOSED_BY.SEEKER
  ) {
    throw new BadRequestError('No pending reschedule proposal from seeker to reject.')
  }

  const restoredStatus =
    booking.statusBeforeReschedule || INSPECTION_STATUSES.PENDING
  const nowIso = new Date().toISOString()

  const [updated] = await db
    .update(inspectionBookings)
    .set({
      status: restoredStatus,
      statusBeforeReschedule: null,
      proposedAt: null,
      proposedBy: null,
      rescheduleReason: null,
      updatedAt: nowIso,
    })
    .where(eq(inspectionBookings.id, bookingId))
    .returning()

  await createBookingEvent(db, {
    bookingId,
    actorType: listerRole as InspectionActorType,
    actorId: listerId,
    action: INSPECTION_ACTIONS.RESCHEDULE_REJECTED,
    fromStatus: INSPECTION_STATUSES.RESCHEDULE_REQUESTED,
    toStatus: restoredStatus,
    note: input.reason || 'Lister rejected reschedule proposal.',
  })

  return {
    message: `Reschedule rejected. Booking restored to ${restoredStatus}.`,
    booking: updated,
  }
}

/**
 * Lister cancels booking
 */
export async function listerCancelBooking(
  db: Database,
  env: AppBindings,
  listerRole: ListerRole,
  listerId: string,
  bookingId: string,
  input: CancelInspectionBookingInput
) {
  const [booking] = await db
    .select()
    .from(inspectionBookings)
    .where(
      and(
        eq(inspectionBookings.id, bookingId),
        eq(inspectionBookings.listerRole, listerRole),
        eq(inspectionBookings.listerId, listerId)
      )
    )
    .limit(1)

  if (!booking) {
    throw new NotFoundError('Inspection booking not found.')
  }

  if (
    booking.status === INSPECTION_STATUSES.CANCELLED ||
    booking.status === INSPECTION_STATUSES.COMPLETED ||
    booking.status === INSPECTION_STATUSES.DECLINED
  ) {
    throw new BadRequestError(`Cannot cancel a booking that is already "${booking.status}".`)
  }

  const nowIso = new Date().toISOString()

  const [updated] = await db
    .update(inspectionBookings)
    .set({
      status: INSPECTION_STATUSES.CANCELLED,
      cancelledBy: listerRole === LISTER_ROLES.AGENT ? INSPECTION_CANCELLED_BY.LISTER : INSPECTION_CANCELLED_BY.LISTER,
      cancelReason: input.reason || null,
      cancelledAt: nowIso,
      updatedAt: nowIso,
    })
    .where(eq(inspectionBookings.id, bookingId))
    .returning()

  await createBookingEvent(db, {
    bookingId,
    actorType: listerRole as InspectionActorType,
    actorId: listerId,
    action: INSPECTION_ACTIONS.CANCELLED,
    fromStatus: booking.status,
    toStatus: INSPECTION_STATUSES.CANCELLED,
    note: input.reason || null,
  })

  // Email Seeker
  const [seeker] = await db
    .select()
    .from(seekerUsers)
    .where(eq(seekerUsers.id, booking.seekerId))
    .limit(1)
  const [listing] = await db
    .select()
    .from(propertyListings)
    .where(eq(propertyListings.id, booking.listingId))
    .limit(1)

  if (seeker && listing) {
    try {
      await sendEmail(env, {
        to: seeker.email,
        subject: `Inspection Cancelled: ${listing.title} (${booking.reference})`,
        template: createElement(InspectionEmail, {
          recipientName: seeker.fullName,
          title: 'Inspection Cancelled by Lister',
          message: `The lister has cancelled the inspection booking for "${listing.title}". Reason: ${input.reason || 'No reason provided'}`,
          reference: booking.reference,
          listingTitle: listing.title,
          propertyAddress: `${listing.address}, ${listing.area}`,
          scheduledAtWat: formatWatDateTime(booking.scheduledAt),
          mode: booking.mode as 'physical' | 'virtual',
          note: input.reason || null,
        }),
      })
    } catch (err) {
      console.error('[EmailService] Failed to notify seeker of cancellation:', err)
    }
  }

  return { message: 'Inspection booking cancelled.', booking: updated }
}

/**
 * Lister switches virtual method or updates meeting link / video URL (handles bad network!)
 */
export async function listerUpdateVirtualDetails(
  db: Database,
  listerRole: ListerRole,
  listerId: string,
  bookingId: string,
  input: UpdateVirtualDetailsInput
) {
  const [booking] = await db
    .select()
    .from(inspectionBookings)
    .where(
      and(
        eq(inspectionBookings.id, bookingId),
        eq(inspectionBookings.listerRole, listerRole),
        eq(inspectionBookings.listerId, listerId)
      )
    )
    .limit(1)

  if (!booking) {
    throw new NotFoundError('Inspection booking not found.')
  }

  if (booking.mode !== INSPECTION_MODES.VIRTUAL) {
    throw new BadRequestError('Virtual details can only be updated for virtual inspections.')
  }

  const updateValues: Partial<typeof inspectionBookings.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  }
  if (input.virtual_method !== undefined)
    updateValues.virtualMethod = input.virtual_method
  if (input.meeting_link !== undefined)
    updateValues.meetingLink = input.meeting_link || null
  if (input.recorded_video_url !== undefined)
    updateValues.recordedVideoUrl = input.recorded_video_url || null

  const [updated] = await db
    .update(inspectionBookings)
    .set(updateValues)
    .where(eq(inspectionBookings.id, bookingId))
    .returning()

  await createBookingEvent(db, {
    bookingId,
    actorType: listerRole as InspectionActorType,
    actorId: listerId,
    action: INSPECTION_ACTIONS.VIRTUAL_DETAILS_UPDATED,
    note: 'Updated virtual inspection method / links (network fallback)',
    metadata: {
      virtual_method: updated.virtualMethod,
      meeting_link: updated.meetingLink,
      recorded_video_url: updated.recordedVideoUrl,
    },
  })

  return { message: 'Virtual details updated successfully.', booking: updated }
}

/**
 * Lister marks inspection completed
 */
export async function listerCompleteBooking(
  db: Database,
  listerRole: ListerRole,
  listerId: string,
  bookingId: string
) {
  const [booking] = await db
    .select()
    .from(inspectionBookings)
    .where(
      and(
        eq(inspectionBookings.id, bookingId),
        eq(inspectionBookings.listerRole, listerRole),
        eq(inspectionBookings.listerId, listerId)
      )
    )
    .limit(1)

  if (!booking) {
    throw new NotFoundError('Inspection booking not found.')
  }

  if (booking.status !== INSPECTION_STATUSES.CONFIRMED) {
    throw new BadRequestError(
      `Only confirmed bookings can be marked completed (current status: "${booking.status}").`
    )
  }

  const nowIso = new Date().toISOString()

  const [updated] = await db
    .update(inspectionBookings)
    .set({
      status: INSPECTION_STATUSES.COMPLETED,
      completedAt: nowIso,
      updatedAt: nowIso,
    })
    .where(eq(inspectionBookings.id, bookingId))
    .returning()

  await createBookingEvent(db, {
    bookingId,
    actorType: listerRole as InspectionActorType,
    actorId: listerId,
    action: INSPECTION_ACTIONS.COMPLETED,
    fromStatus: INSPECTION_STATUSES.CONFIRMED,
    toStatus: INSPECTION_STATUSES.COMPLETED,
  })

  return { message: 'Inspection marked as completed.', booking: updated }
}

/**
 * Lister marks seeker as no-show
 */
export async function listerMarkNoShow(
  db: Database,
  listerRole: ListerRole,
  listerId: string,
  bookingId: string
) {
  const [booking] = await db
    .select()
    .from(inspectionBookings)
    .where(
      and(
        eq(inspectionBookings.id, bookingId),
        eq(inspectionBookings.listerRole, listerRole),
        eq(inspectionBookings.listerId, listerId)
      )
    )
    .limit(1)

  if (!booking) {
    throw new NotFoundError('Inspection booking not found.')
  }

  if (booking.status !== INSPECTION_STATUSES.CONFIRMED) {
    throw new BadRequestError(
      `Only confirmed bookings can be marked as no-show (current status: "${booking.status}").`
    )
  }

  const nowIso = new Date().toISOString()

  const [updated] = await db
    .update(inspectionBookings)
    .set({
      status: INSPECTION_STATUSES.NO_SHOW,
      updatedAt: nowIso,
    })
    .where(eq(inspectionBookings.id, bookingId))
    .returning()

  await createBookingEvent(db, {
    bookingId,
    actorType: listerRole as InspectionActorType,
    actorId: listerId,
    action: INSPECTION_ACTIONS.NO_SHOW,
    fromStatus: INSPECTION_STATUSES.CONFIRMED,
    toStatus: INSPECTION_STATUSES.NO_SHOW,
  })

  return { message: 'Inspection marked as no-show.', booking: updated }
}

/**
 * Lister updates offline inspection fee status (e.g. marked as paid or waived)
 */
export async function listerUpdateFeeStatus(
  db: Database,
  listerRole: ListerRole,
  listerId: string,
  bookingId: string,
  input: UpdateInspectionFeeStatusInput
) {
  const [booking] = await db
    .select()
    .from(inspectionBookings)
    .where(
      and(
        eq(inspectionBookings.id, bookingId),
        eq(inspectionBookings.listerRole, listerRole),
        eq(inspectionBookings.listerId, listerId)
      )
    )
    .limit(1)

  if (!booking) {
    throw new NotFoundError('Inspection booking not found.')
  }

  const nowIso = new Date().toISOString()

  const [updated] = await db
    .update(inspectionBookings)
    .set({
      feeStatus: input.fee_status,
      updatedAt: nowIso,
    })
    .where(eq(inspectionBookings.id, bookingId))
    .returning()

  await createBookingEvent(db, {
    bookingId,
    actorType: listerRole as InspectionActorType,
    actorId: listerId,
    action: INSPECTION_ACTIONS.FEE_UPDATED,
    note: input.note || `Fee status updated to ${input.fee_status}`,
    metadata: {
      from_fee_status: booking.feeStatus,
      to_fee_status: input.fee_status,
    },
  })

  return { message: `Fee status updated to ${input.fee_status}.`, booking: updated }
}

/**
 * Update listing inspection options (fee, allows_physical, allows_virtual)
 * Does NOT reset listing moderation status!
 */
export async function updateListingInspectionOptions(
  db: Database,
  listerRole: ListerRole,
  listerId: string,
  listingId: string,
  input: UpdateListingInspectionOptionsInput
) {
  const conditions = [eq(propertyListings.id, listingId)]
  if (listerRole === LISTER_ROLES.AGENT) {
    conditions.push(eq(propertyListings.agentId, listerId))
  } else {
    conditions.push(eq(propertyListings.landlordId, listerId))
  }

  const [listing] = await db
    .select()
    .from(propertyListings)
    .where(and(...conditions))
    .limit(1)

  if (!listing) {
    throw new NotFoundError('Property listing not found or unauthorized.')
  }

  const updateValues: Partial<typeof propertyListings.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  }
  if (input.inspection_fee !== undefined)
    updateValues.inspectionFee = input.inspection_fee
  if (input.allows_physical_inspection !== undefined)
    updateValues.allowsPhysicalInspection = input.allows_physical_inspection
  if (input.allows_virtual_inspection !== undefined)
    updateValues.allowsVirtualInspection = input.allows_virtual_inspection

  const [updated] = await db
    .update(propertyListings)
    .set(updateValues)
    .where(eq(propertyListings.id, listingId))
    .returning()

  return {
    message: 'Listing inspection options updated successfully.',
    listing: {
      id: updated.id,
      title: updated.title,
      inspection_fee: updated.inspectionFee,
      allows_physical_inspection: updated.allowsPhysicalInspection,
      allows_virtual_inspection: updated.allowsVirtualInspection,
      moderation_status: updated.moderationStatus, // Preserved unchanged!
    },
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function formatBookingSummary(
  booking: typeof inspectionBookings.$inferSelect,
  listing?: typeof propertyListings.$inferSelect,
  seeker?: typeof seekerUsers.$inferSelect,
  lister?: {
    id: string
    name: string
    email: string
    phone: string | null
    whatsapp: string | null
    agencyName?: string | null
  }
) {
  return {
    id: booking.id,
    reference: booking.reference,
    listing: listing
      ? {
          id: listing.id,
          title: listing.title,
          slug: listing.slug,
          area: listing.area,
          address: listing.address,
          images: listing.images,
        }
      : null,
    seeker: seeker
      ? {
          id: seeker.id,
          full_name: seeker.fullName,
          email: seeker.email,
          phone: seeker.phone,
        }
      : null,
    lister: lister
      ? {
          id: lister.id,
          role: booking.listerRole,
          name: lister.name,
          email: lister.email,
          phone: lister.phone,
          whatsapp: lister.whatsapp,
          agency_name: lister.agencyName || null,
        }
      : null,
    mode: booking.mode,
    virtual_method: booking.virtualMethod,
    meeting_link: booking.meetingLink,
    recorded_video_url: booking.recordedVideoUrl,
    scheduled_at: booking.scheduledAt,
    scheduled_at_wat: formatWatDateTime(booking.scheduledAt),
    duration_minutes: booking.durationMinutes,
    status: booking.status,
    proposed_at: booking.proposedAt,
    proposed_by: booking.proposedBy,
    reschedule_reason: booking.rescheduleReason,
    seeker_note: booking.seekerNote,
    lister_note: booking.listerNote,
    decline_reason: booking.declineReason,
    cancel_reason: booking.cancelReason,
    cancelled_by: booking.cancelledBy,
    inspection_fee: booking.inspectionFee,
    fee_status: booking.feeStatus,
    confirmed_at: booking.confirmedAt,
    completed_at: booking.completedAt,
    cancelled_at: booking.cancelledAt,
    created_at: booking.createdAt,
    updated_at: booking.updatedAt,
  }
}
