import type { Context } from 'hono'
import type { AppEnv } from '../../config/env'
import {
  adminCancelBooking,
  adminGetInspectionById,
  adminListInspections,
  adminOverrideFeeStatus,
  adminOverrideStatus,
  adminRescheduleBooking,
} from '../../services/admin/inspection.service'
import { UnauthorizedError } from '../../utils/errors'
import { sendPaginated, sendSuccess } from '../../utils/response'
import type {
  AdminCancelInspectionInput,
  AdminInspectionQueryInput,
  AdminOverrideFeeStatusInput,
  AdminOverrideInspectionStatusInput,
  AdminRescheduleInspectionInput,
} from '../../utils/validators'

export async function adminListInspectionsHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const query = c.req.valid('query' as never) as AdminInspectionQueryInput

  const result = await adminListInspections(db, query)
  return sendPaginated(c, result.items, result.meta)
}

export async function adminGetInspectionByIdHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const id = c.req.param('id') as string

  const result = await adminGetInspectionById(db, id)
  return sendSuccess(c, result)
}

export async function adminCancelInspectionHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const user = c.get('user')
  if (!user) throw new UnauthorizedError('Authentication required.')
  const id = c.req.param('id') as string
  const body = c.req.valid('json' as never) as AdminCancelInspectionInput

  const result = await adminCancelBooking(db, c.env, user, id, body)
  return sendSuccess(c, result.booking)
}

export async function adminRescheduleInspectionHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const user = c.get('user')
  if (!user) throw new UnauthorizedError('Authentication required.')
  const id = c.req.param('id') as string
  const body = c.req.valid('json' as never) as AdminRescheduleInspectionInput

  const result = await adminRescheduleBooking(db, c.env, user, id, body)
  return sendSuccess(c, result.booking)
}

export async function adminOverrideStatusHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const user = c.get('user')
  if (!user) throw new UnauthorizedError('Authentication required.')
  const id = c.req.param('id') as string
  const body = c.req.valid('json' as never) as AdminOverrideInspectionStatusInput

  const result = await adminOverrideStatus(db, user, id, body)
  return sendSuccess(c, result.booking)
}

export async function adminOverrideFeeStatusHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const user = c.get('user')
  if (!user) throw new UnauthorizedError('Authentication required.')
  const id = c.req.param('id') as string
  const body = c.req.valid('json' as never) as AdminOverrideFeeStatusInput

  const result = await adminOverrideFeeStatus(db, user, id, body)
  return sendSuccess(c, result.booking)
}
