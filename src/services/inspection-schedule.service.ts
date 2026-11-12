import { and, asc, eq, gte, lte } from 'drizzle-orm'
import {
  AVAILABILITY_STATUSES,
  INSPECTION_STATUSES,
  LISTER_ROLES,
  MODERATION_STATUSES,
  type ListerRole,
} from '../config/constants'
import type { Database } from '../database'
import {
  inspectionBookings,
  inspectionSettings,
  listerAvailabilityWindows,
  listerBlockedDates,
  propertyListings,
} from '../models'
import { BadRequestError, NotFoundError } from '../utils/errors'
import type {
  CreateBlockedDateInput,
  SetAvailabilityWindowsInput,
  UpdateInspectionSettingsInput,
} from '../utils/validators'

export interface ListerSettingsDto {
  slot_duration_minutes: number
  max_bookings_per_slot: number
  min_notice_hours: number
  accepts_virtual: boolean
}

const DEFAULT_SETTINGS: ListerSettingsDto = {
  slot_duration_minutes: 30,
  max_bookings_per_slot: 1,
  min_notice_hours: 0,
  accepts_virtual: true,
}

/**
 * Get or initialize lister inspection settings
 */
export async function getListerSettings(
  db: Database,
  listerRole: ListerRole,
  listerId: string
): Promise<ListerSettingsDto> {
  const [row] = await db
    .select()
    .from(inspectionSettings)
    .where(
      and(
        eq(inspectionSettings.listerRole, listerRole),
        eq(inspectionSettings.listerId, listerId)
      )
    )
    .limit(1)

  if (!row) {
    return { ...DEFAULT_SETTINGS }
  }

  return {
    slot_duration_minutes: row.slotDurationMinutes,
    max_bookings_per_slot: row.maxBookingsPerSlot,
    min_notice_hours: row.minNoticeHours,
    accepts_virtual: row.acceptsVirtual,
  }
}

/**
 * Update or create lister inspection settings
 */
export async function updateListerSettings(
  db: Database,
  listerRole: ListerRole,
  listerId: string,
  input: UpdateInspectionSettingsInput
): Promise<ListerSettingsDto> {
  const [existing] = await db
    .select()
    .from(inspectionSettings)
    .where(
      and(
        eq(inspectionSettings.listerRole, listerRole),
        eq(inspectionSettings.listerId, listerId)
      )
    )
    .limit(1)

  const now = new Date().toISOString()

  if (existing) {
    const updateValues: Partial<typeof inspectionSettings.$inferInsert> = {
      updatedAt: now,
    }
    if (input.slot_duration_minutes !== undefined)
      updateValues.slotDurationMinutes = input.slot_duration_minutes
    if (input.max_bookings_per_slot !== undefined)
      updateValues.maxBookingsPerSlot = input.max_bookings_per_slot
    if (input.min_notice_hours !== undefined)
      updateValues.minNoticeHours = input.min_notice_hours
    if (input.accepts_virtual !== undefined)
      updateValues.acceptsVirtual = input.accepts_virtual

    const [updated] = await db
      .update(inspectionSettings)
      .set(updateValues)
      .where(eq(inspectionSettings.id, existing.id))
      .returning()

    return {
      slot_duration_minutes: updated.slotDurationMinutes,
      max_bookings_per_slot: updated.maxBookingsPerSlot,
      min_notice_hours: updated.minNoticeHours,
      accepts_virtual: updated.acceptsVirtual,
    }
  }

  const [created] = await db
    .insert(inspectionSettings)
    .values({
      listerRole,
      listerId,
      slotDurationMinutes: input.slot_duration_minutes ?? DEFAULT_SETTINGS.slot_duration_minutes,
      maxBookingsPerSlot: input.max_bookings_per_slot ?? DEFAULT_SETTINGS.max_bookings_per_slot,
      minNoticeHours: input.min_notice_hours ?? DEFAULT_SETTINGS.min_notice_hours,
      acceptsVirtual: input.accepts_virtual ?? DEFAULT_SETTINGS.accepts_virtual,
    })
    .returning()

  return {
    slot_duration_minutes: created.slotDurationMinutes,
    max_bookings_per_slot: created.maxBookingsPerSlot,
    min_notice_hours: created.minNoticeHours,
    accepts_virtual: created.acceptsVirtual,
  }
}

/**
 * Get all availability windows for a lister
 */
export async function getAvailabilityWindows(
  db: Database,
  listerRole: ListerRole,
  listerId: string
) {
  const rows = await db
    .select()
    .from(listerAvailabilityWindows)
    .where(
      and(
        eq(listerAvailabilityWindows.listerRole, listerRole),
        eq(listerAvailabilityWindows.listerId, listerId)
      )
    )
    .orderBy(
      asc(listerAvailabilityWindows.dayOfWeek),
      asc(listerAvailabilityWindows.startTime)
    )

  return rows.map((w) => ({
    id: w.id,
    day_of_week: w.dayOfWeek,
    start_time: w.startTime,
    end_time: w.endTime,
    is_active: w.isActive,
  }))
}

/**
 * Replace all availability windows for a lister
 */
export async function setAvailabilityWindows(
  db: Database,
  listerRole: ListerRole,
  listerId: string,
  input: SetAvailabilityWindowsInput
) {
  // Validate that for each window start_time < end_time
  for (const win of input.windows) {
    if (win.start_time >= win.end_time) {
      throw new BadRequestError(
        `Start time (${win.start_time}) must be earlier than end time (${win.end_time}).`
      )
    }
  }

  // Delete previous windows
  await db
    .delete(listerAvailabilityWindows)
    .where(
      and(
        eq(listerAvailabilityWindows.listerRole, listerRole),
        eq(listerAvailabilityWindows.listerId, listerId)
      )
    )

  if (input.windows.length === 0) {
    return []
  }

  const inserted = await db
    .insert(listerAvailabilityWindows)
    .values(
      input.windows.map((w) => ({
        listerRole,
        listerId,
        dayOfWeek: w.day_of_week,
        startTime: w.start_time,
        endTime: w.end_time,
        isActive: w.is_active ?? true,
      }))
    )
    .returning()

  return inserted.map((w) => ({
    id: w.id,
    day_of_week: w.dayOfWeek,
    start_time: w.startTime,
    end_time: w.endTime,
    is_active: w.isActive,
  }))
}

/**
 * Get all blocked dates for a lister
 */
export async function getBlockedDates(
  db: Database,
  listerRole: ListerRole,
  listerId: string
) {
  const rows = await db
    .select()
    .from(listerBlockedDates)
    .where(
      and(
        eq(listerBlockedDates.listerRole, listerRole),
        eq(listerBlockedDates.listerId, listerId)
      )
    )
    .orderBy(asc(listerBlockedDates.date))

  return rows.map((b) => ({
    id: b.id,
    date: b.date,
    reason: b.reason,
    created_at: b.createdAt,
  }))
}

/**
 * Add a blocked date
 */
export async function addBlockedDate(
  db: Database,
  listerRole: ListerRole,
  listerId: string,
  input: CreateBlockedDateInput
) {
  const [existing] = await db
    .select()
    .from(listerBlockedDates)
    .where(
      and(
        eq(listerBlockedDates.listerRole, listerRole),
        eq(listerBlockedDates.listerId, listerId),
        eq(listerBlockedDates.date, input.date)
      )
    )
    .limit(1)

  if (existing) {
    throw new BadRequestError(`Date ${input.date} is already blocked.`)
  }

  const [row] = await db
    .insert(listerBlockedDates)
    .values({
      listerRole,
      listerId,
      date: input.date,
      reason: input.reason || null,
      createdAt: new Date().toISOString(),
    })
    .returning()

  return {
    id: row.id,
    date: row.date,
    reason: row.reason,
    created_at: row.createdAt,
  }
}

/**
 * Remove a blocked date
 */
export async function removeBlockedDate(
  db: Database,
  listerRole: ListerRole,
  listerId: string,
  dateId: string
) {
  const [existing] = await db
    .select()
    .from(listerBlockedDates)
    .where(
      and(
        eq(listerBlockedDates.id, dateId),
        eq(listerBlockedDates.listerRole, listerRole),
        eq(listerBlockedDates.listerId, listerId)
      )
    )
    .limit(1)

  if (!existing) {
    throw new NotFoundError('Blocked date not found.')
  }

  await db.delete(listerBlockedDates).where(eq(listerBlockedDates.id, dateId))

  return { message: 'Blocked date removed successfully.' }
}

/**
 * Helper: Convert a UTC Date to WAT (UTC+1) representation
 */
export function toWatDate(utcDate: Date): Date {
  return new Date(utcDate.getTime() + 60 * 60 * 1000)
}

/**
 * Helper: Convert WAT date & time strings to UTC ISO string
 * e.g. "2026-11-15", "10:30" WAT -> "2026-11-15T09:30:00.000Z"
 */
export function watTimeToUtcIso(dateYmd: string, timeHhMm: string): string {
  const [year, month, day] = dateYmd.split('-').map(Number)
  const [hour, minute] = timeHhMm.split(':').map(Number)
  // Create UTC date assuming WAT is UTC+1 (so subtract 1 hour for UTC)
  const utcMillis = Date.UTC(year, month - 1, day, hour - 1, minute, 0)
  return new Date(utcMillis).toISOString()
}

/**
 * Calculate available inspection slots for a public listing
 */
export async function getPublicInspectionSlots(
  db: Database,
  idOrSlug: string,
  fromQuery?: string,
  toQuery?: string
) {
  // Find listing
  const [listing] = await db
    .select()
    .from(propertyListings)
    .where(
      idOrSlug.includes('-') && idOrSlug.length > 20 && !idOrSlug.includes(' ')
        ? eq(propertyListings.slug, idOrSlug)
        : eq(propertyListings.id, idOrSlug)
    )
    .limit(1)

  if (!listing) {
    throw new NotFoundError('Property listing not found.')
  }

  if (
    listing.moderationStatus !== MODERATION_STATUSES.APPROVED ||
    listing.availabilityStatus !== AVAILABILITY_STATUSES.AVAILABLE
  ) {
    throw new BadRequestError('This listing is not currently available for inspections.')
  }

  const listerRole = (listing.listerRole || LISTER_ROLES.AGENT) as ListerRole
  const listerId = (listing.agentId || listing.landlordId)!

  const settings = await getListerSettings(db, listerRole, listerId)
  const windows = await getAvailabilityWindows(db, listerRole, listerId)
  const blockedDates = await getBlockedDates(db, listerRole, listerId)
  const blockedDateSet = new Set(blockedDates.map((b) => b.date))

  // Determine date range: default start tomorrow, end 7 days from now (max 14 days)
  const now = new Date()
  const minNoticeTime = new Date(now.getTime() + settings.min_notice_hours * 60 * 60 * 1000)

  let startDate = fromQuery ? new Date(fromQuery) : new Date(now.getTime() + 24 * 60 * 60 * 1000)
  if (isNaN(startDate.getTime()) || startDate < now) {
    startDate = new Date(now.getTime() + 2 * 60 * 60 * 1000) // At least 2 hours ahead
  }

  let endDate = toQuery ? new Date(toQuery) : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000)
  if (isNaN(endDate.getTime()) || endDate <= startDate) {
    endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000)
  }
  // Cap at 14 days max
  const maxEnd = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000)
  if (endDate > maxEnd) {
    endDate = maxEnd
  }

  // Fetch confirmed bookings in the window to calculate occupied slots
  const confirmedBookings = await db
    .select({
      scheduledAt: inspectionBookings.scheduledAt,
      durationMinutes: inspectionBookings.durationMinutes,
    })
    .from(inspectionBookings)
    .where(
      and(
        eq(inspectionBookings.listerRole, listerRole),
        eq(inspectionBookings.listerId, listerId),
        eq(inspectionBookings.status, INSPECTION_STATUSES.CONFIRMED),
        gte(inspectionBookings.scheduledAt, startDate.toISOString()),
        lte(inspectionBookings.scheduledAt, endDate.toISOString())
      )
    )

  // Map of slot ISO string -> count of confirmed bookings
  const bookedCounts = new Map<string, number>()
  for (const b of confirmedBookings) {
    bookedCounts.set(b.scheduledAt, (bookedCounts.get(b.scheduledAt) || 0) + 1)
  }

  // Default windows if none configured: Mon-Sat 09:00 - 17:00 WAT
  const activeWindows = windows.filter((w) => w.is_active)
  const useDefaultWindows = activeWindows.length === 0

  const availableSlots: Array<{
    date: string // YYYY-MM-DD (WAT)
    time: string // HH:MM (WAT)
    scheduled_at: string // UTC ISO-8601
    duration_minutes: number
    available_capacity: number
  }> = []

  // Iterate day by day in WAT
  const currentCursor = new Date(startDate.getTime())
  while (currentCursor <= endDate) {
    const wat = toWatDate(currentCursor)
    const ymd = wat.toISOString().split('T')[0]
    const dayOfWeek = wat.getUTCDay()

    if (!blockedDateSet.has(ymd)) {
      // Find matching windows for this day of week
      const dayWindows = useDefaultWindows
        ? dayOfWeek !== 0 // Skip Sunday by default
          ? [{ start_time: '09:00', end_time: '17:00' }]
          : []
        : activeWindows
            .filter((w) => w.day_of_week === dayOfWeek)
            .map((w) => ({ start_time: w.start_time, end_time: w.end_time }))

      for (const win of dayWindows) {
        const [startH, startM] = win.start_time.split(':').map(Number)
        const [endH, endM] = win.end_time.split(':').map(Number)
        const startTotalMin = startH * 60 + startM
        const endTotalMin = endH * 60 + endM

        for (
          let m = startTotalMin;
          m + settings.slot_duration_minutes <= endTotalMin;
          m += settings.slot_duration_minutes
        ) {
          const slotH = String(Math.floor(m / 60)).padStart(2, '0')
          const slotM = String(m % 60).padStart(2, '0')
          const timeHhMm = `${slotH}:${slotM}`
          const utcIso = watTimeToUtcIso(ymd, timeHhMm)
          const slotUtc = new Date(utcIso)

          // Only future slots past min notice
          if (slotUtc > minNoticeTime && slotUtc <= endDate) {
            const currentBooked = bookedCounts.get(utcIso) || 0
            const availableCapacity = settings.max_bookings_per_slot - currentBooked

            if (availableCapacity > 0) {
              availableSlots.push({
                date: ymd,
                time: timeHhMm,
                scheduled_at: utcIso,
                duration_minutes: settings.slot_duration_minutes,
                available_capacity: availableCapacity,
              })
            }
          }
        }
      }
    }

    // Advance 1 day
    currentCursor.setUTCDate(currentCursor.getUTCDate() + 1)
  }

  return {
    listing: {
      id: listing.id,
      title: listing.title,
      slug: listing.slug,
      area: listing.area,
      address: listing.address,
      inspection_fee: listing.inspectionFee,
      allows_physical_inspection: listing.allowsPhysicalInspection,
      allows_virtual_inspection: listing.allowsVirtualInspection,
    },
    settings: {
      slot_duration_minutes: settings.slot_duration_minutes,
      max_bookings_per_slot: settings.max_bookings_per_slot,
      min_notice_hours: settings.min_notice_hours,
      accepts_virtual: settings.accepts_virtual,
    },
    date_range: {
      from: startDate.toISOString(),
      to: endDate.toISOString(),
    },
    total_slots: availableSlots.length,
    slots: availableSlots,
  }
}
