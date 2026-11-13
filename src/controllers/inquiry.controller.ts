import type { Context } from 'hono'
import { LISTER_ROLES, type ListerRole } from '../config/constants'
import type { AppEnv } from '../config/env'
import {
  createOrContinueInquiry,
  getListerInquiries,
  getListerInquiryById,
  getListerUnreadCount,
  getSeekerInquiries,
  getSeekerInquiryById,
  getSeekerUnreadCount,
  listerCloseInquiry,
  listerSendMessage,
  seekerCloseInquiry,
  seekerSendMessage,
  verifyInquiryParticipant,
} from '../services/inquiry.service'
import { verifyAccessToken } from '../utils/crypto'
import { ForbiddenError, UnauthorizedError } from '../utils/errors'
import { sendCreated, sendPaginated, sendSuccess } from '../utils/response'
import type {
  CreateInquiryInput,
  InquiryDetailQueryInput,
  InquiryListQueryInput,
  SendInquiryMessageInput,
} from '../utils/validators'

function requireUser(c: Context<AppEnv>) {
  const user = c.get('user')
  if (!user) {
    throw new UnauthorizedError('Authentication required.')
  }
  return user
}

function getListerRole(c: Context<AppEnv>): ListerRole {
  const user = requireUser(c)
  if (
    user.accountType !== LISTER_ROLES.AGENT &&
    user.accountType !== LISTER_ROLES.LANDLORD
  ) {
    throw new ForbiddenError('Only Agents or Landlords can access this resource.')
  }
  return user.accountType
}

// ============================================================================
// SEEKER INQUIRY HANDLERS
// ============================================================================

export async function createSeekerInquiryHandler(c: Context<AppEnv>) {
  const user = requireUser(c)
  const input = c.req.valid('json' as never) as CreateInquiryInput
  const result = await createOrContinueInquiry(
    c.get('db'),
    c.env,
    user.id,
    input
  )
  return result.created ? sendCreated(c, result) : sendSuccess(c, result)
}

export async function listSeekerInquiriesHandler(c: Context<AppEnv>) {
  const user = requireUser(c)
  const query = c.req.valid('query' as never) as InquiryListQueryInput
  const result = await getSeekerInquiries(c.get('db'), user.id, query)
  return sendPaginated(c, result.items, {
    page: result.page,
    per_page: result.perPage,
    total_records: result.total,
  })
}

export async function getSeekerUnreadCountHandler(c: Context<AppEnv>) {
  const user = requireUser(c)
  const result = await getSeekerUnreadCount(c.get('db'), user.id)
  return sendSuccess(c, result)
}

export async function getSeekerInquiryByIdHandler(c: Context<AppEnv>) {
  const user = requireUser(c)
  const id = c.req.param('id') as string
  const { after } = c.req.valid('query' as never) as InquiryDetailQueryInput
  const result = await getSeekerInquiryById(
    c.get('db'),
    c.env,
    user.id,
    id,
    after
  )
  return sendSuccess(c, result)
}

export async function seekerSendMessageHandler(c: Context<AppEnv>) {
  const user = requireUser(c)
  const id = c.req.param('id') as string
  const { message } = c.req.valid('json' as never) as SendInquiryMessageInput
  const result = await seekerSendMessage(
    c.get('db'),
    c.env,
    user.id,
    id,
    message
  )
  return sendCreated(c, result)
}

export async function seekerCloseInquiryHandler(c: Context<AppEnv>) {
  const user = requireUser(c)
  const id = c.req.param('id') as string
  const result = await seekerCloseInquiry(c.get('db'), c.env, user.id, id)
  return sendSuccess(c, result)
}

// ============================================================================
// LISTER (AGENT & LANDLORD) INQUIRY HANDLERS
// ============================================================================

export async function listListerInquiriesHandler(c: Context<AppEnv>) {
  const user = requireUser(c)
  const role = getListerRole(c)
  const query = c.req.valid('query' as never) as InquiryListQueryInput
  const result = await getListerInquiries(c.get('db'), role, user.id, query)
  return sendPaginated(c, result.items, {
    page: result.page,
    per_page: result.perPage,
    total_records: result.total,
  })
}

export async function getListerUnreadCountHandler(c: Context<AppEnv>) {
  const user = requireUser(c)
  const role = getListerRole(c)
  const result = await getListerUnreadCount(c.get('db'), role, user.id)
  return sendSuccess(c, result)
}

export async function getListerInquiryByIdHandler(c: Context<AppEnv>) {
  const user = requireUser(c)
  const role = getListerRole(c)
  const id = c.req.param('id') as string
  const { after } = c.req.valid('query' as never) as InquiryDetailQueryInput
  const result = await getListerInquiryById(
    c.get('db'),
    c.env,
    role,
    user.id,
    id,
    after
  )
  return sendSuccess(c, result)
}

export async function listerSendMessageHandler(c: Context<AppEnv>) {
  const user = requireUser(c)
  const role = getListerRole(c)
  const id = c.req.param('id') as string
  const { message } = c.req.valid('json' as never) as SendInquiryMessageInput
  const result = await listerSendMessage(
    c.get('db'),
    c.env,
    role,
    user.id,
    id,
    message
  )
  return sendCreated(c, result)
}

export async function listerCloseInquiryHandler(c: Context<AppEnv>) {
  const user = requireUser(c)
  const role = getListerRole(c)
  const id = c.req.param('id') as string
  const result = await listerCloseInquiry(
    c.get('db'),
    c.env,
    role,
    user.id,
    id
  )
  return sendSuccess(c, result)
}

// ============================================================================
// REAL-TIME WEBSOCKET UPGRADE HANDLER
// ============================================================================

export async function inquiryWebSocketHandler(c: Context<AppEnv>) {
  const upgradeHeader = c.req.header('Upgrade')
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    return c.json(
      {
        success: false,
        error: {
          code: 'UPGRADE_REQUIRED',
          message: 'Expected Upgrade: websocket header.',
        },
      },
      426
    )
  }

  // Browser WebSocket API cannot set Authorization header, so also support ?token=
  const authHeader = c.req.header('Authorization')
  const bearerToken =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null
  const token = bearerToken || c.req.query('token')

  if (!token) {
    throw new UnauthorizedError(
      'Missing authentication token (provide ?token= or Authorization Bearer).'
    )
  }

  let payload
  try {
    payload = await verifyAccessToken(token, c.env?.JWT_SECRET)
  } catch {
    throw new UnauthorizedError('Invalid or expired authentication token.')
  }

  const inquiryId = c.req.param('id') as string
  const participant = await verifyInquiryParticipant(
    c.get('db'),
    inquiryId,
    payload.sub,
    payload.accountType
  )

  if (!c.env?.INQUIRY_ROOM) {
    return c.json(
      {
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Real-time WebSocket room binding is not configured.',
        },
      },
      503
    )
  }

  const roomId = c.env.INQUIRY_ROOM.idFromName(inquiryId)
  const stub = c.env.INQUIRY_ROOM.get(roomId)

  const headers = new Headers(c.req.raw.headers)
  headers.set('x-user-id', participant.userId)
  headers.set('x-user-role', participant.role)
  headers.set('x-user-name', participant.name)

  return stub.fetch(
    new Request(c.req.url, {
      method: c.req.method,
      headers,
    })
  )
}

