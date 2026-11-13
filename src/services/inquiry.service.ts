import { and, asc, desc, eq, gt, ne, sql } from 'drizzle-orm'
import { createElement } from 'react'
import {
  AVAILABILITY_STATUSES,
  INQUIRY_SENDER_ROLES,
  INQUIRY_STATUSES,
  LISTER_ROLES,
  MODERATION_STATUSES,
  type ListerRole,
} from '../config/constants'
import type { AppBindings } from '../config/env'
import type { Database } from '../database'
import {
  agentUsers,
  cities,
  inquiryMessages,
  landlordUsers,
  propertyInquiries,
  propertyListings,
  seekerUsers,
  states,
} from '../models'
import { InquiryEmail } from '../templates'
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors'
import type {
  CreateInquiryInput,
  InquiryListQueryInput,
} from '../utils/validators'
import { sendEmail } from './email.service'

/**
 * Generate a human-friendly unique inquiry reference (e.g. ORV-INQ-8M4P2K)
 */
function generateInquiryReference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length]
  }
  return `ORV-INQ-${code}`
}

/**
 * Normalize Nigerian phone numbers for `https://wa.me/...` links
 */
export function buildWhatsAppUrl(
  phoneOrWhatsapp: string | null | undefined,
  prefillText: string
): string | null {
  if (!phoneOrWhatsapp) return null
  let digits = phoneOrWhatsapp.replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('0') && digits.length === 11) {
    digits = `234${digits.slice(1)}`
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(prefillText)}`
}

/**
 * Push a real-time event to the InquiryRoom Durable Object (non-blocking / safe)
 */
export async function broadcastToInquiryRoom(
  env: AppBindings | undefined,
  inquiryId: string,
  event: Record<string, unknown>
): Promise<void> {
  if (!env?.INQUIRY_ROOM) return
  try {
    const id = env.INQUIRY_ROOM.idFromName(inquiryId)
    const stub = env.INQUIRY_ROOM.get(id)
    await stub.fetch('https://do.internal/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
  } catch (err) {
    console.error('[InquiryWS] Failed to broadcast event:', err)
  }
}

function truncatePreview(text: string, maxLength = 120): string {
  const cleaned = text.trim().replace(/\s+/g, ' ')
  if (cleaned.length <= maxLength) return cleaned
  return `${cleaned.slice(0, maxLength - 3)}...`
}

async function getListerDetails(
  db: Database,
  listerRole: string,
  listerId: string
) {
  if (listerRole === LISTER_ROLES.AGENT) {
    const [agent] = await db
      .select({
        id: agentUsers.id,
        fullName: agentUsers.fullName,
        email: agentUsers.email,
        phone: agentUsers.phone,
        whatsappNumber: agentUsers.whatsappNumber,
        agencyName: agentUsers.agencyName,
        avatarUrl: agentUsers.avatarUrl,
        isVerified: agentUsers.isVerified,
        verificationBadge: agentUsers.verificationBadge,
      })
      .from(agentUsers)
      .where(eq(agentUsers.id, listerId))
      .limit(1)
    return agent
      ? {
          id: agent.id,
          role: LISTER_ROLES.AGENT,
          name: agent.fullName,
          email: agent.email,
          phone: agent.phone,
          whatsapp_number: agent.whatsappNumber,
          business_name: agent.agencyName,
          avatar_url: agent.avatarUrl,
          is_verified: agent.isVerified,
          verification_badge: agent.verificationBadge,
        }
      : null
  }

  const [landlord] = await db
    .select({
      id: landlordUsers.id,
      fullName: landlordUsers.fullName,
      email: landlordUsers.email,
      phone: landlordUsers.phone,
      whatsappNumber: landlordUsers.whatsappNumber,
      companyName: landlordUsers.companyName,
      avatarUrl: landlordUsers.avatarUrl,
      isVerified: landlordUsers.isVerified,
      verificationBadge: landlordUsers.verificationBadge,
    })
    .from(landlordUsers)
    .where(eq(landlordUsers.id, listerId))
    .limit(1)

  return landlord
    ? {
        id: landlord.id,
        role: LISTER_ROLES.LANDLORD,
        name: landlord.fullName,
        email: landlord.email,
        phone: landlord.phone,
        whatsapp_number: landlord.whatsappNumber,
        business_name: landlord.companyName,
        avatar_url: landlord.avatarUrl,
        is_verified: landlord.isVerified,
        verification_badge: landlord.verificationBadge,
      }
    : null
}

function formatMessage(msg: typeof inquiryMessages.$inferSelect) {
  return {
    id: msg.id,
    inquiry_id: msg.inquiryId,
    sender_role: msg.senderRole,
    sender_id: msg.senderId,
    body: msg.body,
    is_read: msg.isRead,
    read_at: msg.readAt,
    created_at: msg.createdAt,
  }
}

/**
 * Start a new inquiry conversation or append to the existing conversation for (seeker, listing)
 */
export async function createOrContinueInquiry(
  db: Database,
  env: AppBindings,
  seekerId: string,
  input: CreateInquiryInput
) {
  const [seeker] = await db
    .select({
      id: seekerUsers.id,
      fullName: seekerUsers.fullName,
      email: seekerUsers.email,
      phone: seekerUsers.phone,
      isEmailVerified: seekerUsers.isEmailVerified,
    })
    .from(seekerUsers)
    .where(eq(seekerUsers.id, seekerId))
    .limit(1)

  if (!seeker) {
    throw new NotFoundError('Seeker account not found.')
  }
  if (!seeker.isEmailVerified) {
    throw new ForbiddenError(
      'Please verify your email address before sending property inquiries.'
    )
  }

  const [listingRow] = await db
    .select({
      listing: propertyListings,
      cityName: cities.name,
      stateName: states.name,
    })
    .from(propertyListings)
    .innerJoin(cities, eq(propertyListings.cityId, cities.id))
    .innerJoin(states, eq(propertyListings.stateId, states.id))
    .where(eq(propertyListings.id, input.listing_id))
    .limit(1)

  if (
    !listingRow ||
    listingRow.listing.moderationStatus !== MODERATION_STATUSES.APPROVED
  ) {
    throw new NotFoundError('Property listing not found or not approved.')
  }

  if (listingRow.listing.availabilityStatus !== AVAILABILITY_STATUSES.AVAILABLE) {
    throw new ValidationError([
      {
        field: 'listing_id',
        issue: `This property is currently marked as "${listingRow.listing.availabilityStatus}" and is not accepting new inquiries.`,
      },
    ])
  }

  const listing = listingRow.listing
  const listerId =
    listing.listerRole === LISTER_ROLES.AGENT
      ? listing.agentId!
      : listing.landlordId!

  const lister = await getListerDetails(db, listing.listerRole, listerId)
  const now = new Date().toISOString()
  const preview = truncatePreview(input.message)

  const [existing] = await db
    .select()
    .from(propertyInquiries)
    .where(
      and(
        eq(propertyInquiries.seekerId, seekerId),
        eq(propertyInquiries.listingId, listing.id)
      )
    )
    .limit(1)

  let inquiryId: string
  let reference: string
  let status: string
  let created = false

  if (!existing) {
    created = true
    inquiryId = crypto.randomUUID()
    reference = generateInquiryReference()
    status = INQUIRY_STATUSES.OPEN

    await db.insert(propertyInquiries).values({
      id: inquiryId,
      reference,
      listingId: listing.id,
      seekerId,
      listerRole: listing.listerRole,
      listerId,
      subject: input.subject || null,
      status,
      lastMessagePreview: preview,
      lastMessageAt: now,
      lastSenderRole: INQUIRY_SENDER_ROLES.SEEKER,
      seekerUnreadCount: 0,
      listerUnreadCount: 1,
      createdAt: now,
      updatedAt: now,
    })
  } else {
    inquiryId = existing.id
    reference = existing.reference
    status =
      existing.status === INQUIRY_STATUSES.CLOSED
        ? INQUIRY_STATUSES.OPEN
        : existing.status

    await db
      .update(propertyInquiries)
      .set({
        status,
        subject: input.subject ?? existing.subject,
        lastMessagePreview: preview,
        lastMessageAt: now,
        lastSenderRole: INQUIRY_SENDER_ROLES.SEEKER,
        listerUnreadCount: existing.listerUnreadCount + 1,
        closedBy: existing.status === INQUIRY_STATUSES.CLOSED ? null : existing.closedBy,
        closedAt: existing.status === INQUIRY_STATUSES.CLOSED ? null : existing.closedAt,
        updatedAt: now,
      })
      .where(eq(propertyInquiries.id, existing.id))
  }

  const messageId = crypto.randomUUID()
  const newMessageRow = {
    id: messageId,
    inquiryId,
    senderRole: INQUIRY_SENDER_ROLES.SEEKER,
    senderId: seekerId,
    body: input.message,
    isRead: false,
    readAt: null,
    createdAt: now,
  }

  await db.insert(inquiryMessages).values(newMessageRow)

  const formattedMessage = formatMessage(newMessageRow)

  await broadcastToInquiryRoom(env, inquiryId, {
    type: 'new_message',
    inquiry_id: inquiryId,
    status,
    message: formattedMessage,
  })

  if (lister?.email) {
    const propertyAddress = `${listing.area}, ${listingRow.cityName}, ${listingRow.stateName}`
    const whatsappUrl = buildWhatsAppUrl(
      seeker.phone,
      `Hello ${seeker.fullName}, regarding your Oruvia inquiry (${reference}) for "${listing.title}":`
    )
    try {
      await sendEmail(env, {
        to: lister.email,
        subject: `[${reference}] ${created ? 'New Inquiry' : 'New Message'}: ${listing.title}`,
        template: createElement(InquiryEmail, {
          recipientName: lister.name,
          title: created ? `New Inquiry: ${listing.title}` : `New Message: ${listing.title}`,
          previewText: `${seeker.fullName}: ${preview}`,
          introText: created
            ? `${seeker.fullName} sent a new inquiry about your property listing on Oruvia.`
            : `${seeker.fullName} sent a follow-up message regarding your property listing.`,
          reference,
          listingTitle: listing.title,
          propertyAddress,
          senderName: seeker.fullName,
          senderRole: 'Property Seeker',
          messageBody: input.message,
          whatsappUrl,
          actionUrl: `${env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/inquiries/${inquiryId}`,
        }),
      })
    } catch (err) {
      console.error('[InquiryEmail] Failed to send inquiry email:', err)
    }
  }

  return {
    created,
    inquiry: {
      id: inquiryId,
      reference,
      listing_id: listing.id,
      subject: input.subject || existing?.subject || null,
      status,
      last_message_preview: preview,
      last_message_at: now,
      whatsapp_url: buildWhatsAppUrl(
        lister?.whatsapp_number || lister?.phone,
        `Hello ${lister?.name || ''}, I am enquiring about your property "${listing.title}" on Oruvia (Ref: ${reference}).`
      ),
    },
    message: formattedMessage,
  }
}

/**
 * List Seeker's inquiry conversations
 */
export async function getSeekerInquiries(
  db: Database,
  seekerId: string,
  query: InquiryListQueryInput
) {
  const offset = (query.page - 1) * query.per_page
  const conditions = [eq(propertyInquiries.seekerId, seekerId)]

  if (query.status) {
    conditions.push(eq(propertyInquiries.status, query.status))
  }
  if (query.listing_id) {
    conditions.push(eq(propertyInquiries.listingId, query.listing_id))
  }
  if (query.unread_only) {
    conditions.push(gt(propertyInquiries.seekerUnreadCount, 0))
  }

  const whereClause = and(...conditions)

  const rows = await db
    .select({
      inquiry: propertyInquiries,
      listing: {
        id: propertyListings.id,
        title: propertyListings.title,
        slug: propertyListings.slug,
        area: propertyListings.area,
        basePrice: propertyListings.basePrice,
        images: propertyListings.images,
        availabilityStatus: propertyListings.availabilityStatus,
      },
      cityName: cities.name,
      stateName: states.name,
    })
    .from(propertyInquiries)
    .innerJoin(
      propertyListings,
      eq(propertyInquiries.listingId, propertyListings.id)
    )
    .innerJoin(cities, eq(propertyListings.cityId, cities.id))
    .innerJoin(states, eq(propertyListings.stateId, states.id))
    .where(whereClause)
    .orderBy(desc(propertyInquiries.lastMessageAt))
    .limit(query.per_page)
    .offset(offset)

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(propertyInquiries)
    .where(whereClause)

  const items = await Promise.all(
    rows.map(async (row) => {
      const lister = await getListerDetails(
        db,
        row.inquiry.listerRole,
        row.inquiry.listerId
      )
      const images = Array.isArray(row.listing.images) ? row.listing.images : []

      return {
        id: row.inquiry.id,
        reference: row.inquiry.reference,
        subject: row.inquiry.subject,
        status: row.inquiry.status,
        last_message_preview: row.inquiry.lastMessagePreview,
        last_message_at: row.inquiry.lastMessageAt,
        last_sender_role: row.inquiry.lastSenderRole,
        unread_count: row.inquiry.seekerUnreadCount,
        listing: {
          id: row.listing.id,
          title: row.listing.title,
          slug: row.listing.slug,
          area: row.listing.area,
          city: row.cityName,
          state: row.stateName,
          base_price: row.listing.basePrice,
          thumbnail: images[0] ?? null,
          availability_status: row.listing.availabilityStatus,
        },
        lister,
        whatsapp_url: buildWhatsAppUrl(
          lister?.whatsapp_number || lister?.phone,
          `Hello ${lister?.name || ''}, I am enquiring about your property "${row.listing.title}" on Oruvia (Ref: ${row.inquiry.reference}).`
        ),
        created_at: row.inquiry.createdAt,
        updated_at: row.inquiry.updatedAt,
      }
    })
  )

  return {
    items,
    page: query.page,
    perPage: query.per_page,
    total: Number(countResult?.count ?? 0),
  }
}

/**
 * Total unread messages across all Seeker inquiries
 */
export async function getSeekerUnreadCount(db: Database, seekerId: string) {
  const [row] = await db
    .select({
      unreadCount: sql<number>`coalesce(sum(${propertyInquiries.seekerUnreadCount}), 0)`,
    })
    .from(propertyInquiries)
    .where(eq(propertyInquiries.seekerId, seekerId))

  return { unread_count: Number(row?.unreadCount ?? 0) }
}

/**
 * Get Seeker inquiry conversation & messages (auto-marks lister messages as read)
 */
export async function getSeekerInquiryById(
  db: Database,
  env: AppBindings,
  seekerId: string,
  inquiryId: string,
  after?: string
) {
  const [row] = await db
    .select({
      inquiry: propertyInquiries,
      listing: {
        id: propertyListings.id,
        title: propertyListings.title,
        slug: propertyListings.slug,
        area: propertyListings.area,
        address: propertyListings.address,
        basePrice: propertyListings.basePrice,
        images: propertyListings.images,
        availabilityStatus: propertyListings.availabilityStatus,
      },
      cityName: cities.name,
      stateName: states.name,
    })
    .from(propertyInquiries)
    .innerJoin(
      propertyListings,
      eq(propertyInquiries.listingId, propertyListings.id)
    )
    .innerJoin(cities, eq(propertyListings.cityId, cities.id))
    .innerJoin(states, eq(propertyListings.stateId, states.id))
    .where(
      and(
        eq(propertyInquiries.id, inquiryId),
        eq(propertyInquiries.seekerId, seekerId)
      )
    )
    .limit(1)

  if (!row) {
    throw new NotFoundError('Inquiry conversation not found.')
  }

  // Mark unread messages from the lister as read
  const now = new Date().toISOString()
  if (row.inquiry.seekerUnreadCount > 0) {
    await db
      .update(inquiryMessages)
      .set({ isRead: true, readAt: now })
      .where(
        and(
          eq(inquiryMessages.inquiryId, inquiryId),
          ne(inquiryMessages.senderRole, INQUIRY_SENDER_ROLES.SEEKER),
          eq(inquiryMessages.isRead, false)
        )
      )

    await db
      .update(propertyInquiries)
      .set({ seekerUnreadCount: 0, updatedAt: now })
      .where(eq(propertyInquiries.id, inquiryId))

    await broadcastToInquiryRoom(env, inquiryId, {
      type: 'messages_read',
      inquiry_id: inquiryId,
      reader_role: INQUIRY_SENDER_ROLES.SEEKER,
      read_at: now,
    })
  }

  const msgConditions = [eq(inquiryMessages.inquiryId, inquiryId)]
  if (after) {
    msgConditions.push(gt(inquiryMessages.createdAt, after))
  }

  const messages = await db
    .select()
    .from(inquiryMessages)
    .where(and(...msgConditions))
    .orderBy(asc(inquiryMessages.createdAt))

  const lister = await getListerDetails(
    db,
    row.inquiry.listerRole,
    row.inquiry.listerId
  )
  const images = Array.isArray(row.listing.images) ? row.listing.images : []

  return {
    id: row.inquiry.id,
    reference: row.inquiry.reference,
    subject: row.inquiry.subject,
    status: row.inquiry.status,
    unread_count: 0,
    closed_by: row.inquiry.closedBy,
    closed_at: row.inquiry.closedAt,
    listing: {
      id: row.listing.id,
      title: row.listing.title,
      slug: row.listing.slug,
      area: row.listing.area,
      address: row.listing.address,
      city: row.cityName,
      state: row.stateName,
      base_price: row.listing.basePrice,
      thumbnail: images[0] ?? null,
      availability_status: row.listing.availabilityStatus,
    },
    lister,
    whatsapp_url: buildWhatsAppUrl(
      lister?.whatsapp_number || lister?.phone,
      `Hello ${lister?.name || ''}, I am enquiring about your property "${row.listing.title}" on Oruvia (Ref: ${row.inquiry.reference}).`
    ),
    ws_path: `/api/v1/inquiries/${row.inquiry.id}/ws`,
    messages: messages.map(formatMessage),
    created_at: row.inquiry.createdAt,
    updated_at: row.inquiry.updatedAt,
  }
}

/**
 * Seeker sends a follow-up message in an existing conversation
 */
export async function seekerSendMessage(
  db: Database,
  env: AppBindings,
  seekerId: string,
  inquiryId: string,
  messageText: string
) {
  const [row] = await db
    .select({
      inquiry: propertyInquiries,
      listingTitle: propertyListings.title,
      listingArea: propertyListings.area,
      cityName: cities.name,
      stateName: states.name,
      seekerName: seekerUsers.fullName,
      seekerPhone: seekerUsers.phone,
    })
    .from(propertyInquiries)
    .innerJoin(
      propertyListings,
      eq(propertyInquiries.listingId, propertyListings.id)
    )
    .innerJoin(cities, eq(propertyListings.cityId, cities.id))
    .innerJoin(states, eq(propertyListings.stateId, states.id))
    .innerJoin(seekerUsers, eq(propertyInquiries.seekerId, seekerUsers.id))
    .where(
      and(
        eq(propertyInquiries.id, inquiryId),
        eq(propertyInquiries.seekerId, seekerId)
      )
    )
    .limit(1)

  if (!row) {
    throw new NotFoundError('Inquiry conversation not found.')
  }

  const now = new Date().toISOString()
  const preview = truncatePreview(messageText)
  const nextStatus =
    row.inquiry.status === INQUIRY_STATUSES.CLOSED
      ? INQUIRY_STATUSES.OPEN
      : row.inquiry.status

  await db
    .update(propertyInquiries)
    .set({
      status: nextStatus,
      lastMessagePreview: preview,
      lastMessageAt: now,
      lastSenderRole: INQUIRY_SENDER_ROLES.SEEKER,
      listerUnreadCount: row.inquiry.listerUnreadCount + 1,
      closedBy: row.inquiry.status === INQUIRY_STATUSES.CLOSED ? null : row.inquiry.closedBy,
      closedAt: row.inquiry.status === INQUIRY_STATUSES.CLOSED ? null : row.inquiry.closedAt,
      updatedAt: now,
    })
    .where(eq(propertyInquiries.id, inquiryId))

  const msgRow = {
    id: crypto.randomUUID(),
    inquiryId,
    senderRole: INQUIRY_SENDER_ROLES.SEEKER,
    senderId: seekerId,
    body: messageText,
    isRead: false,
    readAt: null,
    createdAt: now,
  }

  await db.insert(inquiryMessages).values(msgRow)
  const formattedMessage = formatMessage(msgRow)

  await broadcastToInquiryRoom(env, inquiryId, {
    type: 'new_message',
    inquiry_id: inquiryId,
    status: nextStatus,
    message: formattedMessage,
  })

  const lister = await getListerDetails(
    db,
    row.inquiry.listerRole,
    row.inquiry.listerId
  )
  if (lister?.email) {
    try {
      await sendEmail(env, {
        to: lister.email,
        subject: `[${row.inquiry.reference}] New Message: ${row.listingTitle}`,
        template: createElement(InquiryEmail, {
          recipientName: lister.name,
          title: `New Message: ${row.listingTitle}`,
          previewText: `${row.seekerName}: ${preview}`,
          introText: `${row.seekerName} sent a new message regarding "${row.listingTitle}".`,
          reference: row.inquiry.reference,
          listingTitle: row.listingTitle,
          propertyAddress: `${row.listingArea}, ${row.cityName}, ${row.stateName}`,
          senderName: row.seekerName,
          senderRole: 'Property Seeker',
          messageBody: messageText,
          whatsappUrl: buildWhatsAppUrl(
            row.seekerPhone,
            `Hello ${row.seekerName}, regarding your Oruvia inquiry (${row.inquiry.reference}) for "${row.listingTitle}":`
          ),
          actionUrl: `${env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/inquiries/${inquiryId}`,
        }),
      })
    } catch (err) {
      console.error('[InquiryEmail] Failed to send message email:', err)
    }
  }

  return {
    inquiry_id: inquiryId,
    status: nextStatus,
    message: formattedMessage,
  }
}

/**
 * Seeker closes an inquiry conversation
 */
export async function seekerCloseInquiry(
  db: Database,
  env: AppBindings,
  seekerId: string,
  inquiryId: string
) {
  const [inquiry] = await db
    .select()
    .from(propertyInquiries)
    .where(
      and(
        eq(propertyInquiries.id, inquiryId),
        eq(propertyInquiries.seekerId, seekerId)
      )
    )
    .limit(1)

  if (!inquiry) {
    throw new NotFoundError('Inquiry conversation not found.')
  }

  const now = new Date().toISOString()
  await db
    .update(propertyInquiries)
    .set({
      status: INQUIRY_STATUSES.CLOSED,
      closedBy: INQUIRY_SENDER_ROLES.SEEKER,
      closedAt: now,
      updatedAt: now,
    })
    .where(eq(propertyInquiries.id, inquiryId))

  await broadcastToInquiryRoom(env, inquiryId, {
    type: 'inquiry_closed',
    inquiry_id: inquiryId,
    status: INQUIRY_STATUSES.CLOSED,
    closed_by: INQUIRY_SENDER_ROLES.SEEKER,
    closed_at: now,
  })

  return {
    id: inquiryId,
    status: INQUIRY_STATUSES.CLOSED,
    closed_by: INQUIRY_SENDER_ROLES.SEEKER,
    closed_at: now,
  }
}

/**
 * List incoming inquiry conversations for an Agent or Landlord
 */
export async function getListerInquiries(
  db: Database,
  listerRole: ListerRole,
  listerId: string,
  query: InquiryListQueryInput
) {
  const offset = (query.page - 1) * query.per_page
  const conditions = [
    eq(propertyInquiries.listerRole, listerRole),
    eq(propertyInquiries.listerId, listerId),
  ]

  if (query.status) {
    conditions.push(eq(propertyInquiries.status, query.status))
  }
  if (query.listing_id) {
    conditions.push(eq(propertyInquiries.listingId, query.listing_id))
  }
  if (query.unread_only) {
    conditions.push(gt(propertyInquiries.listerUnreadCount, 0))
  }

  const whereClause = and(...conditions)

  const rows = await db
    .select({
      inquiry: propertyInquiries,
      listing: {
        id: propertyListings.id,
        title: propertyListings.title,
        slug: propertyListings.slug,
        area: propertyListings.area,
        basePrice: propertyListings.basePrice,
        images: propertyListings.images,
        availabilityStatus: propertyListings.availabilityStatus,
      },
      cityName: cities.name,
      stateName: states.name,
      seeker: {
        id: seekerUsers.id,
        full_name: seekerUsers.fullName,
        email: seekerUsers.email,
        phone: seekerUsers.phone,
        avatar_url: seekerUsers.avatarUrl,
      },
    })
    .from(propertyInquiries)
    .innerJoin(
      propertyListings,
      eq(propertyInquiries.listingId, propertyListings.id)
    )
    .innerJoin(cities, eq(propertyListings.cityId, cities.id))
    .innerJoin(states, eq(propertyListings.stateId, states.id))
    .innerJoin(seekerUsers, eq(propertyInquiries.seekerId, seekerUsers.id))
    .where(whereClause)
    .orderBy(desc(propertyInquiries.lastMessageAt))
    .limit(query.per_page)
    .offset(offset)

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(propertyInquiries)
    .where(whereClause)

  return {
    items: rows.map((row) => {
      const images = Array.isArray(row.listing.images) ? row.listing.images : []

      return {
        id: row.inquiry.id,
        reference: row.inquiry.reference,
        subject: row.inquiry.subject,
        status: row.inquiry.status,
        last_message_preview: row.inquiry.lastMessagePreview,
        last_message_at: row.inquiry.lastMessageAt,
        last_sender_role: row.inquiry.lastSenderRole,
        unread_count: row.inquiry.listerUnreadCount,
        listing: {
          id: row.listing.id,
          title: row.listing.title,
          slug: row.listing.slug,
          area: row.listing.area,
          city: row.cityName,
          state: row.stateName,
          base_price: row.listing.basePrice,
          thumbnail: images[0] ?? null,
          availability_status: row.listing.availabilityStatus,
        },
        seeker: row.seeker,
        whatsapp_url: buildWhatsAppUrl(
          row.seeker.phone,
          `Hello ${row.seeker.full_name}, regarding your Oruvia inquiry (${row.inquiry.reference}) for "${row.listing.title}":`
        ),
        created_at: row.inquiry.createdAt,
        updated_at: row.inquiry.updatedAt,
      }
    }),
    page: query.page,
    perPage: query.per_page,
    total: Number(countResult?.count ?? 0),
  }
}

/**
 * Total unread messages across all inquiries for an Agent or Landlord
 */
export async function getListerUnreadCount(
  db: Database,
  listerRole: ListerRole,
  listerId: string
) {
  const [row] = await db
    .select({
      unreadCount: sql<number>`coalesce(sum(${propertyInquiries.listerUnreadCount}), 0)`,
    })
    .from(propertyInquiries)
    .where(
      and(
        eq(propertyInquiries.listerRole, listerRole),
        eq(propertyInquiries.listerId, listerId)
      )
    )

  return { unread_count: Number(row?.unreadCount ?? 0) }
}

/**
 * Get Lister inquiry conversation & messages (auto-marks seeker messages as read)
 */
export async function getListerInquiryById(
  db: Database,
  env: AppBindings,
  listerRole: ListerRole,
  listerId: string,
  inquiryId: string,
  after?: string
) {
  const [row] = await db
    .select({
      inquiry: propertyInquiries,
      listing: {
        id: propertyListings.id,
        title: propertyListings.title,
        slug: propertyListings.slug,
        area: propertyListings.area,
        address: propertyListings.address,
        basePrice: propertyListings.basePrice,
        images: propertyListings.images,
        availabilityStatus: propertyListings.availabilityStatus,
      },
      cityName: cities.name,
      stateName: states.name,
      seeker: {
        id: seekerUsers.id,
        full_name: seekerUsers.fullName,
        email: seekerUsers.email,
        phone: seekerUsers.phone,
        avatar_url: seekerUsers.avatarUrl,
      },
    })
    .from(propertyInquiries)
    .innerJoin(
      propertyListings,
      eq(propertyInquiries.listingId, propertyListings.id)
    )
    .innerJoin(cities, eq(propertyListings.cityId, cities.id))
    .innerJoin(states, eq(propertyListings.stateId, states.id))
    .innerJoin(seekerUsers, eq(propertyInquiries.seekerId, seekerUsers.id))
    .where(
      and(
        eq(propertyInquiries.id, inquiryId),
        eq(propertyInquiries.listerRole, listerRole),
        eq(propertyInquiries.listerId, listerId)
      )
    )
    .limit(1)

  if (!row) {
    throw new NotFoundError('Inquiry conversation not found.')
  }

  const now = new Date().toISOString()
  if (row.inquiry.listerUnreadCount > 0) {
    await db
      .update(inquiryMessages)
      .set({ isRead: true, readAt: now })
      .where(
        and(
          eq(inquiryMessages.inquiryId, inquiryId),
          eq(inquiryMessages.senderRole, INQUIRY_SENDER_ROLES.SEEKER),
          eq(inquiryMessages.isRead, false)
        )
      )

    await db
      .update(propertyInquiries)
      .set({ listerUnreadCount: 0, updatedAt: now })
      .where(eq(propertyInquiries.id, inquiryId))

    await broadcastToInquiryRoom(env, inquiryId, {
      type: 'messages_read',
      inquiry_id: inquiryId,
      reader_role: listerRole,
      read_at: now,
    })
  }

  const msgConditions = [eq(inquiryMessages.inquiryId, inquiryId)]
  if (after) {
    msgConditions.push(gt(inquiryMessages.createdAt, after))
  }

  const messages = await db
    .select()
    .from(inquiryMessages)
    .where(and(...msgConditions))
    .orderBy(asc(inquiryMessages.createdAt))

  const images = Array.isArray(row.listing.images) ? row.listing.images : []

  return {
    id: row.inquiry.id,
    reference: row.inquiry.reference,
    subject: row.inquiry.subject,
    status: row.inquiry.status,
    unread_count: 0,
    closed_by: row.inquiry.closedBy,
    closed_at: row.inquiry.closedAt,
    listing: {
      id: row.listing.id,
      title: row.listing.title,
      slug: row.listing.slug,
      area: row.listing.area,
      address: row.listing.address,
      city: row.cityName,
      state: row.stateName,
      base_price: row.listing.basePrice,
      thumbnail: images[0] ?? null,
      availability_status: row.listing.availabilityStatus,
    },
    seeker: row.seeker,
    whatsapp_url: buildWhatsAppUrl(
      row.seeker.phone,
      `Hello ${row.seeker.full_name}, regarding your Oruvia inquiry (${row.inquiry.reference}) for "${row.listing.title}":`
    ),
    ws_path: `/api/v1/inquiries/${row.inquiry.id}/ws`,
    messages: messages.map(formatMessage),
    created_at: row.inquiry.createdAt,
    updated_at: row.inquiry.updatedAt,
  }
}

/**
 * Agent or Landlord replies to a Seeker's inquiry (auto-transitions open -> responded)
 */
export async function listerSendMessage(
  db: Database,
  env: AppBindings,
  listerRole: ListerRole,
  listerId: string,
  inquiryId: string,
  messageText: string
) {
  const [row] = await db
    .select({
      inquiry: propertyInquiries,
      listingTitle: propertyListings.title,
      listingArea: propertyListings.area,
      cityName: cities.name,
      stateName: states.name,
      seekerName: seekerUsers.fullName,
      seekerEmail: seekerUsers.email,
    })
    .from(propertyInquiries)
    .innerJoin(
      propertyListings,
      eq(propertyInquiries.listingId, propertyListings.id)
    )
    .innerJoin(cities, eq(propertyListings.cityId, cities.id))
    .innerJoin(states, eq(propertyListings.stateId, states.id))
    .innerJoin(seekerUsers, eq(propertyInquiries.seekerId, seekerUsers.id))
    .where(
      and(
        eq(propertyInquiries.id, inquiryId),
        eq(propertyInquiries.listerRole, listerRole),
        eq(propertyInquiries.listerId, listerId)
      )
    )
    .limit(1)

  if (!row) {
    throw new NotFoundError('Inquiry conversation not found.')
  }

  const now = new Date().toISOString()
  const preview = truncatePreview(messageText)
  const nextStatus = INQUIRY_STATUSES.RESPONDED

  await db
    .update(propertyInquiries)
    .set({
      status: nextStatus,
      lastMessagePreview: preview,
      lastMessageAt: now,
      lastSenderRole: listerRole,
      seekerUnreadCount: row.inquiry.seekerUnreadCount + 1,
      closedBy: null,
      closedAt: null,
      updatedAt: now,
    })
    .where(eq(propertyInquiries.id, inquiryId))

  const msgRow = {
    id: crypto.randomUUID(),
    inquiryId,
    senderRole: listerRole,
    senderId: listerId,
    body: messageText,
    isRead: false,
    readAt: null,
    createdAt: now,
  }

  await db.insert(inquiryMessages).values(msgRow)
  const formattedMessage = formatMessage(msgRow)

  await broadcastToInquiryRoom(env, inquiryId, {
    type: 'new_message',
    inquiry_id: inquiryId,
    status: nextStatus,
    message: formattedMessage,
  })

  const lister = await getListerDetails(db, listerRole, listerId)
  if (row.seekerEmail && lister) {
    try {
      await sendEmail(env, {
        to: row.seekerEmail,
        subject: `[${row.inquiry.reference}] Reply: ${row.listingTitle}`,
        template: createElement(InquiryEmail, {
          recipientName: row.seekerName,
          title: `Reply from ${lister.name}: ${row.listingTitle}`,
          previewText: `${lister.name}: ${preview}`,
          introText: `${lister.name} replied to your inquiry about "${row.listingTitle}".`,
          reference: row.inquiry.reference,
          listingTitle: row.listingTitle,
          propertyAddress: `${row.listingArea}, ${row.cityName}, ${row.stateName}`,
          senderName: lister.name,
          senderRole: listerRole === LISTER_ROLES.AGENT ? 'Verified Agent' : 'Property Owner',
          messageBody: messageText,
          whatsappUrl: buildWhatsAppUrl(
            lister.whatsapp_number || lister.phone,
            `Hello ${lister.name}, following up on my Oruvia inquiry (${row.inquiry.reference}) for "${row.listingTitle}":`
          ),
          actionUrl: `${env.FRONTEND_URL || 'http://localhost:3000'}/inquiries/${inquiryId}`,
        }),
      })
    } catch (err) {
      console.error('[InquiryEmail] Failed to send reply email:', err)
    }
  }

  return {
    inquiry_id: inquiryId,
    status: nextStatus,
    message: formattedMessage,
  }
}

/**
 * Lister closes an inquiry conversation
 */
export async function listerCloseInquiry(
  db: Database,
  env: AppBindings,
  listerRole: ListerRole,
  listerId: string,
  inquiryId: string
) {
  const [inquiry] = await db
    .select()
    .from(propertyInquiries)
    .where(
      and(
        eq(propertyInquiries.id, inquiryId),
        eq(propertyInquiries.listerRole, listerRole),
        eq(propertyInquiries.listerId, listerId)
      )
    )
    .limit(1)

  if (!inquiry) {
    throw new NotFoundError('Inquiry conversation not found.')
  }

  const now = new Date().toISOString()
  await db
    .update(propertyInquiries)
    .set({
      status: INQUIRY_STATUSES.CLOSED,
      closedBy: listerRole,
      closedAt: now,
      updatedAt: now,
    })
    .where(eq(propertyInquiries.id, inquiryId))

  await broadcastToInquiryRoom(env, inquiryId, {
    type: 'inquiry_closed',
    inquiry_id: inquiryId,
    status: INQUIRY_STATUSES.CLOSED,
    closed_by: listerRole,
    closed_at: now,
  })

  return {
    id: inquiryId,
    status: INQUIRY_STATUSES.CLOSED,
    closed_by: listerRole,
    closed_at: now,
  }
}

/**
 * Verify WebSocket participant authorization for an inquiry room
 */
export async function verifyInquiryParticipant(
  db: Database,
  inquiryId: string,
  userId: string,
  accountType: string
): Promise<{ userId: string; role: string; name: string }> {
  const [inquiry] = await db
    .select()
    .from(propertyInquiries)
    .where(eq(propertyInquiries.id, inquiryId))
    .limit(1)

  if (!inquiry) {
    throw new NotFoundError('Inquiry conversation not found.')
  }

  if (accountType === INQUIRY_SENDER_ROLES.SEEKER && inquiry.seekerId === userId) {
    const [seeker] = await db
      .select({ fullName: seekerUsers.fullName })
      .from(seekerUsers)
      .where(eq(seekerUsers.id, userId))
      .limit(1)
    return {
      userId,
      role: INQUIRY_SENDER_ROLES.SEEKER,
      name: seeker?.fullName || 'Seeker',
    }
  }

  if (
    (accountType === LISTER_ROLES.AGENT || accountType === LISTER_ROLES.LANDLORD) &&
    inquiry.listerRole === accountType &&
    inquiry.listerId === userId
  ) {
    const lister = await getListerDetails(db, accountType, userId)
    return {
      userId,
      role: accountType,
      name: lister?.name || 'Lister',
    }
  }

  throw new ForbiddenError('You are not a participant in this inquiry.')
}
