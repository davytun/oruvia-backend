import type { Context } from 'hono'
import type { ListerRole } from '../config/constants'
import type { AppEnv } from '../config/env'
import {
  addBlockedDate,
  getAvailabilityWindows,
  getBlockedDates,
  getListerSettings,
  getPublicInspectionSlots,
  removeBlockedDate,
  setAvailabilityWindows,
  updateListerSettings,
} from '../services/inspection-schedule.service'
import {
  createInspectionBooking,
  getListerBookingById,
  getListerBookings,
  getSeekerBookingById,
  getSeekerBookings,
  listerAcceptReschedule,
  listerCancelBooking,
  listerCompleteBooking,
  listerConfirmBooking,
  listerDeclineBooking,
  listerMarkNoShow,
  listerProposeReschedule,
  listerRejectReschedule,
  listerUpdateFeeStatus,
  listerUpdateVirtualDetails,
  seekerAcceptReschedule,
  seekerCancelBooking,
  seekerProposeReschedule,
  seekerRejectReschedule,
  updateListingInspectionOptions,
} from '../services/inspection.service'
import { UnauthorizedError } from '../utils/errors'
import { sendCreated, sendPaginated, sendSuccess } from '../utils/response'
import type {
  CancelInspectionBookingInput,
  ConfirmInspectionBookingInput,
  CreateBlockedDateInput,
  CreateInspectionBookingInput,
  DeclineInspectionBookingInput,
  InspectionBookingQueryInput,
  ProposeRescheduleInput,
  RejectRescheduleInput,
  SetAvailabilityWindowsInput,
  UpdateInspectionFeeStatusInput,
  UpdateInspectionSettingsInput,
  UpdateListingInspectionOptionsInput,
  UpdateVirtualDetailsInput,
} from '../utils/validators'

function requireUser(c: Context<AppEnv>) {
  const user = c.get('user')
  if (!user) {
    throw new UnauthorizedError('Authentication required.')
  }
  return user
}

function getListerIdentity(c: Context<AppEnv>): { role: ListerRole; id: string } {
  const user = requireUser(c)
  return {
    role: user.accountType as ListerRole,
    id: user.id,
  }
}

// =============================================================================
// PUBLIC
// =============================================================================

export async function getPublicInspectionSlotsHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const idOrSlug = c.req.param('idOrSlug') as string
  const from = c.req.query('from')
  const to = c.req.query('to')

  const result = await getPublicInspectionSlots(db, idOrSlug, from, to)
  return sendSuccess(c, result)
}

// =============================================================================
// SEEKER HANDLERS
// =============================================================================

export async function createSeekerInspectionHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const user = requireUser(c)
  const body = c.req.valid('json' as never) as CreateInspectionBookingInput

  const result = await createInspectionBooking(db, c.env, user.id, body)
  return sendCreated(c, result)
}

export async function listSeekerInspectionsHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const user = requireUser(c)
  const query = c.req.valid('query' as never) as InspectionBookingQueryInput

  const result = await getSeekerBookings(db, user.id, query)
  return sendPaginated(c, result.items, result.meta)
}

export async function getSeekerInspectionByIdHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const user = requireUser(c)
  const id = c.req.param('id') as string

  const result = await getSeekerBookingById(db, user.id, id)
  return sendSuccess(c, result)
}

export async function seekerProposeRescheduleHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const user = requireUser(c)
  const id = c.req.param('id') as string
  const body = c.req.valid('json' as never) as ProposeRescheduleInput

  const result = await seekerProposeReschedule(db, c.env, user.id, id, body)
  return sendSuccess(c, result.booking)
}

export async function seekerAcceptRescheduleHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const user = requireUser(c)
  const id = c.req.param('id') as string

  const result = await seekerAcceptReschedule(db, c.env, user.id, id)
  return sendSuccess(c, result.booking)
}

export async function seekerRejectRescheduleHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const user = requireUser(c)
  const id = c.req.param('id') as string
  const body = c.req.valid('json' as never) as RejectRescheduleInput

  const result = await seekerRejectReschedule(db, c.env, user.id, id, body)
  return sendSuccess(c, result.booking)
}

export async function seekerCancelInspectionHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const user = requireUser(c)
  const id = c.req.param('id') as string
  const body = c.req.valid('json' as never) as CancelInspectionBookingInput

  const result = await seekerCancelBooking(db, c.env, user.id, id, body)
  return sendSuccess(c, result.booking)
}

// =============================================================================
// LISTER HANDLERS (AGENTS & LANDLORDS)
// =============================================================================

export async function getListerSettingsHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const { role, id } = getListerIdentity(c)

  const settings = await getListerSettings(db, role, id)
  return sendSuccess(c, settings)
}

export async function updateListerSettingsHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const { role, id } = getListerIdentity(c)
  const body = c.req.valid('json' as never) as UpdateInspectionSettingsInput

  const settings = await updateListerSettings(db, role, id, body)
  return sendSuccess(c, settings)
}

export async function getAvailabilityWindowsHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const { role, id } = getListerIdentity(c)

  const windows = await getAvailabilityWindows(db, role, id)
  return sendSuccess(c, windows)
}

export async function setAvailabilityWindowsHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const { role, id } = getListerIdentity(c)
  const body = c.req.valid('json' as never) as SetAvailabilityWindowsInput

  const windows = await setAvailabilityWindows(db, role, id, body)
  return sendSuccess(c, windows)
}

export async function getBlockedDatesHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const { role, id } = getListerIdentity(c)

  const dates = await getBlockedDates(db, role, id)
  return sendSuccess(c, dates)
}

export async function addBlockedDateHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const { role, id } = getListerIdentity(c)
  const body = c.req.valid('json' as never) as CreateBlockedDateInput

  const date = await addBlockedDate(db, role, id, body)
  return sendCreated(c, date)
}

export async function removeBlockedDateHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const { role, id } = getListerIdentity(c)
  const dateId = c.req.param('id') as string

  const result = await removeBlockedDate(db, role, id, dateId)
  return sendSuccess(c, null)
}

export async function updateListingInspectionOptionsHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const { role, id } = getListerIdentity(c)
  const listingId = c.req.param('id') as string
  const body = c.req.valid(
    'json' as never
  ) as UpdateListingInspectionOptionsInput

  const result = await updateListingInspectionOptions(
    db,
    role,
    id,
    listingId,
    body
  )
  return sendSuccess(c, result.listing)
}

export async function listListerInspectionsHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const { role, id } = getListerIdentity(c)
  const query = c.req.valid('query' as never) as InspectionBookingQueryInput

  const result = await getListerBookings(db, role, id, query)
  return sendPaginated(c, result.items, result.meta)
}

export async function getListerInspectionByIdHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const { role, id } = getListerIdentity(c)
  const bookingId = c.req.param('id') as string

  const result = await getListerBookingById(db, role, id, bookingId)
  return sendSuccess(c, result)
}

export async function listerConfirmInspectionHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const { role, id } = getListerIdentity(c)
  const bookingId = c.req.param('id') as string
  const body = c.req.valid('json' as never) as ConfirmInspectionBookingInput

  const result = await listerConfirmBooking(db, c.env, role, id, bookingId, body)
  return sendSuccess(c, result.booking)
}

export async function listerDeclineInspectionHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const { role, id } = getListerIdentity(c)
  const bookingId = c.req.param('id') as string
  const body = c.req.valid('json' as never) as DeclineInspectionBookingInput

  const result = await listerDeclineBooking(db, c.env, role, id, bookingId, body)
  return sendSuccess(c, result.booking)
}

export async function listerProposeRescheduleHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const { role, id } = getListerIdentity(c)
  const bookingId = c.req.param('id') as string
  const body = c.req.valid('json' as never) as ProposeRescheduleInput

  const result = await listerProposeReschedule(
    db,
    c.env,
    role,
    id,
    bookingId,
    body
  )
  return sendSuccess(c, result.booking)
}

export async function listerAcceptRescheduleHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const { role, id } = getListerIdentity(c)
  const bookingId = c.req.param('id') as string

  const result = await listerAcceptReschedule(db, c.env, role, id, bookingId)
  return sendSuccess(c, result.booking)
}

export async function listerRejectRescheduleHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const { role, id } = getListerIdentity(c)
  const bookingId = c.req.param('id') as string
  const body = c.req.valid('json' as never) as RejectRescheduleInput

  const result = await listerRejectReschedule(db, c.env, role, id, bookingId, body)
  return sendSuccess(c, result.booking)
}

export async function listerCancelInspectionHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const { role, id } = getListerIdentity(c)
  const bookingId = c.req.param('id') as string
  const body = c.req.valid('json' as never) as CancelInspectionBookingInput

  const result = await listerCancelBooking(db, c.env, role, id, bookingId, body)
  return sendSuccess(c, result.booking)
}

export async function listerUpdateVirtualDetailsHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const { role, id } = getListerIdentity(c)
  const bookingId = c.req.param('id') as string
  const body = c.req.valid('json' as never) as UpdateVirtualDetailsInput

  const result = await listerUpdateVirtualDetails(
    db,
    role,
    id,
    bookingId,
    body
  )
  return sendSuccess(c, result.booking)
}

export async function listerCompleteInspectionHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const { role, id } = getListerIdentity(c)
  const bookingId = c.req.param('id') as string

  const result = await listerCompleteBooking(db, role, id, bookingId)
  return sendSuccess(c, result.booking)
}

export async function listerMarkNoShowHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const { role, id } = getListerIdentity(c)
  const bookingId = c.req.param('id') as string

  const result = await listerMarkNoShow(db, role, id, bookingId)
  return sendSuccess(c, result.booking)
}

export async function listerUpdateFeeStatusHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const { role, id } = getListerIdentity(c)
  const bookingId = c.req.param('id') as string
  const body = c.req.valid('json' as never) as UpdateInspectionFeeStatusInput

  const result = await listerUpdateFeeStatus(db, role, id, bookingId, body)
  return sendSuccess(c, result.booking)
}
