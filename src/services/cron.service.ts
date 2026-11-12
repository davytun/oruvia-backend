import { and, eq, isNull, lte, sql } from 'drizzle-orm'
import { createElement } from 'react'
import {
  INSPECTION_ACTIONS,
  INSPECTION_ACTOR_TYPES,
  INSPECTION_STATUSES,
} from '../config/constants'
import type { AppBindings } from '../config/env'
import type { Database } from '../database'
import {
  agentUsers,
  inspectionBookings,
  landlordUsers,
  propertyListings,
  seekerUsers,
} from '../models'
import { InspectionEmail } from '../templates'
import { sendEmail } from './email.service'
import { createBookingEvent, formatWatDateTime } from './inspection.service'

/**
 * Hourly Cron task processing for Oruvia:
 * 1. 24-hour reminder emails for confirmed inspections
 * 2. Automatic expiration of unconfirmed bookings whose scheduled time has passed
 */
export async function processScheduledInspectionTasks(
  db: Database,
  env: AppBindings
): Promise<{
  remindersSent: number
  expiredCount: number
}> {
  const now = new Date()
  const nowIso = now.toISOString()

  // ---------------------------------------------------------------------------
  // 1. Send 24-Hour Reminders (Target: 23 to 25 hours ahead, reminder_sent_at IS NULL)
  // ---------------------------------------------------------------------------
  const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString()
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString()

  const eligibleForReminder = await db
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
        eq(inspectionBookings.status, INSPECTION_STATUSES.CONFIRMED),
        isNull(inspectionBookings.reminderSentAt),
        sql`${inspectionBookings.scheduledAt} >= ${windowStart}`,
        sql`${inspectionBookings.scheduledAt} <= ${windowEnd}`
      )
    )

  let remindersSent = 0

  for (const { booking, listing, seeker } of eligibleForReminder) {
    let listerEmail = ''
    let listerName = ''
    let listerPhone: string | null = null
    let listerWhatsapp: string | null = null

    if (booking.listerRole === 'agent') {
      const [a] = await db
        .select()
        .from(agentUsers)
        .where(eq(agentUsers.id, booking.listerId))
        .limit(1)
      if (a) {
        listerEmail = a.email
        listerName = a.fullName
        listerPhone = a.phone
        listerWhatsapp = a.whatsappNumber
      }
    } else {
      const [l] = await db
        .select()
        .from(landlordUsers)
        .where(eq(landlordUsers.id, booking.listerId))
        .limit(1)
      if (l) {
        listerEmail = l.email
        listerName = l.fullName
        listerPhone = l.phone
        listerWhatsapp = l.whatsappNumber
      }
    }

    const formattedWat = formatWatDateTime(booking.scheduledAt)

    // Notify Seeker
    try {
      await sendEmail(env, {
        to: seeker.email,
        subject: `Reminder: Property Inspection Tomorrow - ${listing.title} (${booking.reference})`,
        template: createElement(InspectionEmail, {
          recipientName: seeker.fullName,
          title: 'Upcoming Inspection Reminder (24 Hours)',
          message: `This is a reminder that your inspection for "${listing.title}" is scheduled for tomorrow.`,
          reference: booking.reference,
          listingTitle: listing.title,
          propertyAddress: `${listing.address}, ${listing.area}`,
          scheduledAtWat: formattedWat,
          mode: booking.mode as 'physical' | 'virtual',
          virtualMethod: booking.virtualMethod,
          meetingLink: booking.meetingLink,
          recordedVideoUrl: booking.recordedVideoUrl,
          contactName: listerName,
          contactPhone: listerPhone || undefined,
          contactWhatsapp: listerWhatsapp || undefined,
          inspectionFee: booking.inspectionFee,
          feeStatus: booking.feeStatus,
        }),
      })
    } catch (err) {
      console.error(`[Cron] Failed to send reminder to seeker for booking ${booking.id}:`, err)
    }

    // Notify Lister
    if (listerEmail) {
      try {
        await sendEmail(env, {
          to: listerEmail,
          subject: `Reminder: Property Inspection Tomorrow - ${listing.title} (${booking.reference})`,
          template: createElement(InspectionEmail, {
            recipientName: listerName,
            title: 'Upcoming Inspection Reminder (24 Hours)',
            message: `This is a reminder that an inspection with ${seeker.fullName} is scheduled for tomorrow for "${listing.title}".`,
            reference: booking.reference,
            listingTitle: listing.title,
            propertyAddress: `${listing.address}, ${listing.area}`,
            scheduledAtWat: formattedWat,
            mode: booking.mode as 'physical' | 'virtual',
            virtualMethod: booking.virtualMethod,
            meetingLink: booking.meetingLink,
            recordedVideoUrl: booking.recordedVideoUrl,
            contactName: seeker.fullName,
            contactPhone: seeker.phone || undefined,
            contactWhatsapp: seeker.phone || undefined,
            inspectionFee: booking.inspectionFee,
            feeStatus: booking.feeStatus,
          }),
        })
      } catch (err) {
        console.error(`[Cron] Failed to send reminder to lister for booking ${booking.id}:`, err)
      }
    }

    // Mark reminder sent
    await db
      .update(inspectionBookings)
      .set({ reminderSentAt: nowIso, updatedAt: nowIso })
      .where(eq(inspectionBookings.id, booking.id))

    remindersSent++
  }

  // ---------------------------------------------------------------------------
  // 2. Automatically Expire Unconfirmed Bookings whose scheduled time has passed
  // ---------------------------------------------------------------------------
  const expiredBookings = await db
    .select({
      id: inspectionBookings.id,
      status: inspectionBookings.status,
      scheduledAt: inspectionBookings.scheduledAt,
    })
    .from(inspectionBookings)
    .where(
      and(
        sql`(${inspectionBookings.status} = ${INSPECTION_STATUSES.PENDING} OR ${inspectionBookings.status} = ${INSPECTION_STATUSES.RESCHEDULE_REQUESTED})`,
        lte(inspectionBookings.scheduledAt, nowIso)
      )
    )

  for (const b of expiredBookings) {
    await db
      .update(inspectionBookings)
      .set({
        status: INSPECTION_STATUSES.EXPIRED,
        updatedAt: nowIso,
      })
      .where(eq(inspectionBookings.id, b.id))

    await createBookingEvent(db, {
      bookingId: b.id,
      actorType: INSPECTION_ACTOR_TYPES.SYSTEM,
      action: INSPECTION_ACTIONS.EXPIRED,
      fromStatus: b.status,
      toStatus: INSPECTION_STATUSES.EXPIRED,
      note: 'Booking expired automatically because scheduled time passed without confirmation.',
    })
  }

  return {
    remindersSent,
    expiredCount: expiredBookings.length,
  }
}
