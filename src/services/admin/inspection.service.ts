import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { createElement } from 'react'
import {
  INSPECTION_ACTIONS,
  INSPECTION_ACTOR_TYPES,
  INSPECTION_CANCELLED_BY,
  INSPECTION_STATUSES,
  type ListerRole,
} from '../../config/constants'
import type { AppBindings, AuthUser } from '../../config/env'
import type { Database } from '../../database'
import {
  agentUsers,
  inspectionBookingEvents,
  inspectionBookings,
  landlordUsers,
  propertyListings,
  seekerUsers,
} from '../../models'
import { InspectionEmail } from '../../templates'
import { BadRequestError, NotFoundError } from '../../utils/errors'
import type {
  AdminCancelInspectionInput,
  AdminInspectionQueryInput,
  AdminOverrideFeeStatusInput,
  AdminOverrideInspectionStatusInput,
  AdminRescheduleInspectionInput,
} from '../../utils/validators'
import { sendEmail } from '../email.service'
import {
  createBookingEvent,
  formatWatDateTime,
} from '../inspection.service'

/**
 * Admin lists all inspection bookings across the platform
 */
export async function adminListInspections(
  db: Database,
  query: AdminInspectionQueryInput
) {
  const page = query.page ?? 1
  const perPage = query.per_page ?? 20
  const offset = (page - 1) * perPage

  const conditions = []
  if (query.status) {
    conditions.push(eq(inspectionBookings.status, query.status))
  }
  if (query.lister_role) {
    conditions.push(eq(inspectionBookings.listerRole, query.lister_role))
  }
  if (query.listing_id) {
    conditions.push(eq(inspectionBookings.listingId, query.listing_id))
  }
  if (query.seeker_id) {
    conditions.push(eq(inspectionBookings.seekerId, query.seeker_id))
  }
  if (query.from) {
    conditions.push(gte(inspectionBookings.scheduledAt, query.from))
  }
  if (query.to) {
    conditions.push(lte(inspectionBookings.scheduledAt, query.to))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

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

  const items = await Promise.all(
    rows.map(async ({ booking, listing, seeker }) => {
      let listerName = 'Unknown'
      let listerEmail = ''
      if (booking.listerRole === 'agent') {
        const [a] = await db
          .select({ name: agentUsers.fullName, email: agentUsers.email })
          .from(agentUsers)
          .where(eq(agentUsers.id, booking.listerId))
          .limit(1)
        if (a) {
          listerName = a.name
          listerEmail = a.email
        }
      } else {
        const [l] = await db
          .select({ name: landlordUsers.fullName, email: landlordUsers.email })
          .from(landlordUsers)
          .where(eq(landlordUsers.id, booking.listerId))
          .limit(1)
        if (l) {
          listerName = l.name
          listerEmail = l.email
        }
      }

      return {
        id: booking.id,
        reference: booking.reference,
        listing: {
          id: listing.id,
          title: listing.title,
          slug: listing.slug,
          area: listing.area,
        },
        seeker: {
          id: seeker.id,
          full_name: seeker.fullName,
          email: seeker.email,
          phone: seeker.phone,
        },
        lister: {
          id: booking.listerId,
          role: booking.listerRole,
          name: listerName,
          email: listerEmail,
        },
        mode: booking.mode,
        virtual_method: booking.virtualMethod,
        scheduled_at: booking.scheduledAt,
        scheduled_at_wat: formatWatDateTime(booking.scheduledAt),
        status: booking.status,
        inspection_fee: booking.inspectionFee,
        fee_status: booking.feeStatus,
        created_at: booking.createdAt,
      }
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
 * Admin gets single booking with complete details & full timeline
 */
export async function adminGetInspectionById(db: Database, bookingId: string) {
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
    .where(eq(inspectionBookings.id, bookingId))
    .limit(1)

  if (!row) {
    throw new NotFoundError('Inspection booking not found.')
  }

  let lister = null
  if (row.booking.listerRole === 'agent') {
    const [agent] = await db
      .select({
        id: agentUsers.id,
        name: agentUsers.fullName,
        email: agentUsers.email,
        phone: agentUsers.phone,
        whatsapp: agentUsers.whatsappNumber,
        agency_name: agentUsers.agencyName,
      })
      .from(agentUsers)
      .where(eq(agentUsers.id, row.booking.listerId))
      .limit(1)
    lister = agent ? { ...agent, role: 'agent' } : null
  } else {
    const [landlord] = await db
      .select({
        id: landlordUsers.id,
        name: landlordUsers.fullName,
        email: landlordUsers.email,
        phone: landlordUsers.phone,
        whatsapp: landlordUsers.whatsappNumber,
        agency_name: landlordUsers.companyName,
      })
      .from(landlordUsers)
      .where(eq(landlordUsers.id, row.booking.listerId))
      .limit(1)
    lister = landlord ? { ...landlord, role: 'landlord' } : null
  }

  const events = await db
    .select()
    .from(inspectionBookingEvents)
    .where(eq(inspectionBookingEvents.bookingId, bookingId))
    .orderBy(desc(inspectionBookingEvents.createdAt))

  return {
    id: row.booking.id,
    reference: row.booking.reference,
    listing: {
      id: row.listing.id,
      title: row.listing.title,
      slug: row.listing.slug,
      area: row.listing.area,
      address: row.listing.address,
      images: row.listing.images,
    },
    seeker: {
      id: row.seeker.id,
      full_name: row.seeker.fullName,
      email: row.seeker.email,
      phone: row.seeker.phone,
    },
    lister,
    mode: row.booking.mode,
    virtual_method: row.booking.virtualMethod,
    meeting_link: row.booking.meetingLink,
    recorded_video_url: row.booking.recordedVideoUrl,
    scheduled_at: row.booking.scheduledAt,
    scheduled_at_wat: formatWatDateTime(row.booking.scheduledAt),
    duration_minutes: row.booking.durationMinutes,
    status: row.booking.status,
    proposed_at: row.booking.proposedAt,
    proposed_by: row.booking.proposedBy,
    reschedule_reason: row.booking.rescheduleReason,
    seeker_note: row.booking.seekerNote,
    lister_note: row.booking.listerNote,
    decline_reason: row.booking.declineReason,
    cancel_reason: row.booking.cancelReason,
    cancelled_by: row.booking.cancelledBy,
    inspection_fee: row.booking.inspectionFee,
    fee_status: row.booking.feeStatus,
    confirmed_at: row.booking.confirmedAt,
    completed_at: row.booking.completedAt,
    cancelled_at: row.booking.cancelledAt,
    created_at: row.booking.createdAt,
    updated_at: row.booking.updatedAt,
    timeline: events.map((e) => ({
      id: e.id,
      actor_type: e.actorType,
      actor_id: e.actorId,
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
 * Admin cancels an inspection booking
 */
export async function adminCancelBooking(
  db: Database,
  env: AppBindings,
  adminUser: AuthUser,
  bookingId: string,
  input: AdminCancelInspectionInput
) {
  const [booking] = await db
    .select()
    .from(inspectionBookings)
    .where(eq(inspectionBookings.id, bookingId))
    .limit(1)

  if (!booking) {
    throw new NotFoundError('Inspection booking not found.')
  }

  const nowIso = new Date().toISOString()

  const [updated] = await db
    .update(inspectionBookings)
    .set({
      status: INSPECTION_STATUSES.CANCELLED,
      cancelledBy: INSPECTION_CANCELLED_BY.ADMIN,
      cancelReason: input.reason,
      cancelledAt: nowIso,
      updatedAt: nowIso,
    })
    .where(eq(inspectionBookings.id, bookingId))
    .returning()

  await createBookingEvent(db, {
    bookingId,
    actorType: INSPECTION_ACTOR_TYPES.ADMIN,
    actorId: adminUser.id,
    action: INSPECTION_ACTIONS.ADMIN_CANCELLED,
    fromStatus: booking.status,
    toStatus: INSPECTION_STATUSES.CANCELLED,
    note: input.reason,
  })

  // Email both Seeker and Lister
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

  let listerEmail = ''
  let listerName = ''
  if (booking.listerRole === 'agent') {
    const [a] = await db
      .select({ name: agentUsers.fullName, email: agentUsers.email })
      .from(agentUsers)
      .where(eq(agentUsers.id, booking.listerId))
      .limit(1)
    if (a) {
      listerEmail = a.email
      listerName = a.name
    }
  } else {
    const [l] = await db
      .select({ name: landlordUsers.fullName, email: landlordUsers.email })
      .from(landlordUsers)
      .where(eq(landlordUsers.id, booking.listerId))
      .limit(1)
    if (l) {
      listerEmail = l.email
      listerName = l.name
    }
  }

  const cancelMessage = `This inspection has been cancelled by Oruvia Administration. Reason: ${input.reason}`
  const formattedWat = formatWatDateTime(booking.scheduledAt)

  if (seeker && listing) {
    try {
      await sendEmail(env, {
        to: seeker.email,
        subject: `[Admin Action] Inspection Cancelled: ${listing.title} (${booking.reference})`,
        template: createElement(InspectionEmail, {
          recipientName: seeker.fullName,
          title: 'Inspection Cancelled by Administrator',
          message: cancelMessage,
          reference: booking.reference,
          listingTitle: listing.title,
          propertyAddress: `${listing.address}, ${listing.area}`,
          scheduledAtWat: formattedWat,
          mode: booking.mode as 'physical' | 'virtual',
          note: input.reason,
        }),
      })
    } catch (err) {
      console.error('[EmailService] Failed to notify seeker:', err)
    }
  }

  if (listerEmail && listing) {
    try {
      await sendEmail(env, {
        to: listerEmail,
        subject: `[Admin Action] Inspection Cancelled: ${listing.title} (${booking.reference})`,
        template: createElement(InspectionEmail, {
          recipientName: listerName,
          title: 'Inspection Cancelled by Administrator',
          message: cancelMessage,
          reference: booking.reference,
          listingTitle: listing.title,
          propertyAddress: `${listing.address}, ${listing.area}`,
          scheduledAtWat: formattedWat,
          mode: booking.mode as 'physical' | 'virtual',
          note: input.reason,
        }),
      })
    } catch (err) {
      console.error('[EmailService] Failed to notify lister:', err)
    }
  }

  return { message: 'Inspection booking cancelled by admin.', booking: updated }
}

/**
 * Admin directly reschedules an inspection booking (with immediate confirmation)
 */
export async function adminRescheduleBooking(
  db: Database,
  env: AppBindings,
  adminUser: AuthUser,
  bookingId: string,
  input: AdminRescheduleInspectionInput
) {
  const [booking] = await db
    .select()
    .from(inspectionBookings)
    .where(eq(inspectionBookings.id, bookingId))
    .limit(1)

  if (!booking) {
    throw new NotFoundError('Inspection booking not found.')
  }

  const newDate = new Date(input.scheduled_at)
  if (isNaN(newDate.getTime()) || newDate <= new Date()) {
    throw new BadRequestError('Scheduled time must be in the future.')
  }

  const nowIso = new Date().toISOString()
  const newScheduledAt = newDate.toISOString()

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
    actorType: INSPECTION_ACTOR_TYPES.ADMIN,
    actorId: adminUser.id,
    action: INSPECTION_ACTIONS.ADMIN_RESCHEDULED,
    fromStatus: booking.status,
    toStatus: INSPECTION_STATUSES.CONFIRMED,
    note: input.reason,
    metadata: {
      old_scheduled_at: booking.scheduledAt,
      new_scheduled_at: newScheduledAt,
    },
  })

  // Email both Seeker and Lister
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

  let listerEmail = ''
  let listerName = ''
  if (booking.listerRole === 'agent') {
    const [a] = await db
      .select({ name: agentUsers.fullName, email: agentUsers.email })
      .from(agentUsers)
      .where(eq(agentUsers.id, booking.listerId))
      .limit(1)
    if (a) {
      listerEmail = a.email
      listerName = a.name
    }
  } else {
    const [l] = await db
      .select({ name: landlordUsers.fullName, email: landlordUsers.email })
      .from(landlordUsers)
      .where(eq(landlordUsers.id, booking.listerId))
      .limit(1)
    if (l) {
      listerEmail = l.email
      listerName = l.name
    }
  }

  const rescheduleMessage = `An administrator has rescheduled this inspection to ${formatWatDateTime(newScheduledAt)} (WAT). Reason: ${input.reason}`
  const formattedWat = formatWatDateTime(newScheduledAt)

  if (seeker && listing) {
    try {
      await sendEmail(env, {
        to: seeker.email,
        subject: `[Admin Action] Inspection Rescheduled: ${listing.title} (${booking.reference})`,
        template: createElement(InspectionEmail, {
          recipientName: seeker.fullName,
          title: 'Inspection Rescheduled by Administrator',
          message: rescheduleMessage,
          reference: booking.reference,
          listingTitle: listing.title,
          propertyAddress: `${listing.address}, ${listing.area}`,
          scheduledAtWat: formattedWat,
          mode: booking.mode as 'physical' | 'virtual',
          meetingLink: booking.meetingLink,
          recordedVideoUrl: booking.recordedVideoUrl,
          note: input.reason,
        }),
      })
    } catch (err) {
      console.error('[EmailService] Failed to notify seeker:', err)
    }
  }

  if (listerEmail && listing) {
    try {
      await sendEmail(env, {
        to: listerEmail,
        subject: `[Admin Action] Inspection Rescheduled: ${listing.title} (${booking.reference})`,
        template: createElement(InspectionEmail, {
          recipientName: listerName,
          title: 'Inspection Rescheduled by Administrator',
          message: rescheduleMessage,
          reference: booking.reference,
          listingTitle: listing.title,
          propertyAddress: `${listing.address}, ${listing.area}`,
          scheduledAtWat: formattedWat,
          mode: booking.mode as 'physical' | 'virtual',
          meetingLink: booking.meetingLink,
          recordedVideoUrl: booking.recordedVideoUrl,
          note: input.reason,
        }),
      })
    } catch (err) {
      console.error('[EmailService] Failed to notify lister:', err)
    }
  }

  return { message: 'Inspection booking rescheduled by admin.', booking: updated }
}

/**
 * Admin overrides status
 */
export async function adminOverrideStatus(
  db: Database,
  adminUser: AuthUser,
  bookingId: string,
  input: AdminOverrideInspectionStatusInput
) {
  const [booking] = await db
    .select()
    .from(inspectionBookings)
    .where(eq(inspectionBookings.id, bookingId))
    .limit(1)

  if (!booking) {
    throw new NotFoundError('Inspection booking not found.')
  }

  const nowIso = new Date().toISOString()
  const updateValues: Partial<typeof inspectionBookings.$inferInsert> = {
    status: input.status,
    updatedAt: nowIso,
  }

  if (input.status === INSPECTION_STATUSES.CONFIRMED && !booking.confirmedAt) {
    updateValues.confirmedAt = nowIso
  } else if (input.status === INSPECTION_STATUSES.COMPLETED && !booking.completedAt) {
    updateValues.completedAt = nowIso
  } else if (input.status === INSPECTION_STATUSES.CANCELLED && !booking.cancelledAt) {
    updateValues.cancelledAt = nowIso
    updateValues.cancelledBy = INSPECTION_CANCELLED_BY.ADMIN
    updateValues.cancelReason = input.reason
  }

  const [updated] = await db
    .update(inspectionBookings)
    .set(updateValues)
    .where(eq(inspectionBookings.id, bookingId))
    .returning()

  await createBookingEvent(db, {
    bookingId,
    actorType: INSPECTION_ACTOR_TYPES.ADMIN,
    actorId: adminUser.id,
    action: INSPECTION_ACTIONS.ADMIN_STATUS_OVERRIDE,
    fromStatus: booking.status,
    toStatus: input.status,
    note: input.reason,
  })

  return { message: `Status overridden to "${input.status}" by admin.`, booking: updated }
}

/**
 * Admin overrides fee status
 */
export async function adminOverrideFeeStatus(
  db: Database,
  adminUser: AuthUser,
  bookingId: string,
  input: AdminOverrideFeeStatusInput
) {
  const [booking] = await db
    .select()
    .from(inspectionBookings)
    .where(eq(inspectionBookings.id, bookingId))
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
    actorType: INSPECTION_ACTOR_TYPES.ADMIN,
    actorId: adminUser.id,
    action: INSPECTION_ACTIONS.ADMIN_FEE_OVERRIDE,
    note: input.reason,
    metadata: {
      from_fee_status: booking.feeStatus,
      to_fee_status: input.fee_status,
    },
  })

  return { message: `Fee status overridden to "${input.fee_status}" by admin.`, booking: updated }
}
