import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { LISTER_ROLES } from '../../config/constants'
import type { Database } from '../../database'
import {
  agentUsers,
  cities,
  inquiryMessages,
  landlordUsers,
  propertyInquiries,
  propertyListings,
  seekerUsers,
  states,
} from '../../models'
import { NotFoundError } from '../../utils/errors'
import type { AdminInquiryQueryInput } from '../../utils/validators'

/**
 * Admin: List platform-wide property inquiries (read-only)
 */
export async function adminListInquiries(
  db: Database,
  query: AdminInquiryQueryInput
) {
  const offset = (query.page - 1) * query.per_page
  const conditions = []

  if (query.status) {
    conditions.push(eq(propertyInquiries.status, query.status))
  }
  if (query.listing_id) {
    conditions.push(eq(propertyInquiries.listingId, query.listing_id))
  }
  if (query.lister_role) {
    conditions.push(eq(propertyInquiries.listerRole, query.lister_role))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const rows = await db
    .select({
      inquiry: propertyInquiries,
      listing: {
        id: propertyListings.id,
        title: propertyListings.title,
        slug: propertyListings.slug,
        area: propertyListings.area,
      },
      cityName: cities.name,
      stateName: states.name,
      seeker: {
        id: seekerUsers.id,
        full_name: seekerUsers.fullName,
        email: seekerUsers.email,
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

  const items = await Promise.all(
    rows.map(async (row) => {
      let listerName = 'Unknown Lister'
      let listerEmail = ''
      if (row.inquiry.listerRole === LISTER_ROLES.AGENT) {
        const [agent] = await db
          .select({ fullName: agentUsers.fullName, email: agentUsers.email })
          .from(agentUsers)
          .where(eq(agentUsers.id, row.inquiry.listerId))
          .limit(1)
        if (agent) {
          listerName = agent.fullName
          listerEmail = agent.email
        }
      } else {
        const [landlord] = await db
          .select({
            fullName: landlordUsers.fullName,
            email: landlordUsers.email,
          })
          .from(landlordUsers)
          .where(eq(landlordUsers.id, row.inquiry.listerId))
          .limit(1)
        if (landlord) {
          listerName = landlord.fullName
          listerEmail = landlord.email
        }
      }

      return {
        id: row.inquiry.id,
        reference: row.inquiry.reference,
        subject: row.inquiry.subject,
        status: row.inquiry.status,
        last_message_preview: row.inquiry.lastMessagePreview,
        last_message_at: row.inquiry.lastMessageAt,
        last_sender_role: row.inquiry.lastSenderRole,
        seeker_unread_count: row.inquiry.seekerUnreadCount,
        lister_unread_count: row.inquiry.listerUnreadCount,
        listing: {
          ...row.listing,
          city: row.cityName,
          state: row.stateName,
        },
        seeker: row.seeker,
        lister: {
          id: row.inquiry.listerId,
          role: row.inquiry.listerRole,
          full_name: listerName,
          email: listerEmail,
        },
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
 * Admin: Read-only view of full inquiry conversation and messages
 */
export async function adminGetInquiryById(db: Database, inquiryId: string) {
  const [row] = await db
    .select({
      inquiry: propertyInquiries,
      listing: {
        id: propertyListings.id,
        title: propertyListings.title,
        slug: propertyListings.slug,
        area: propertyListings.area,
        address: propertyListings.address,
      },
      cityName: cities.name,
      stateName: states.name,
      seeker: {
        id: seekerUsers.id,
        full_name: seekerUsers.fullName,
        email: seekerUsers.email,
        phone: seekerUsers.phone,
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
    .where(eq(propertyInquiries.id, inquiryId))
    .limit(1)

  if (!row) {
    throw new NotFoundError('Inquiry conversation not found.')
  }

  let lister: {
    id: string
    role: string
    full_name: string
    email: string
    phone: string | null
  } | null = null

  if (row.inquiry.listerRole === LISTER_ROLES.AGENT) {
    const [agent] = await db
      .select({
        id: agentUsers.id,
        fullName: agentUsers.fullName,
        email: agentUsers.email,
        phone: agentUsers.phone,
      })
      .from(agentUsers)
      .where(eq(agentUsers.id, row.inquiry.listerId))
      .limit(1)
    if (agent) {
      lister = {
        id: agent.id,
        role: LISTER_ROLES.AGENT,
        full_name: agent.fullName,
        email: agent.email,
        phone: agent.phone,
      }
    }
  } else {
    const [landlord] = await db
      .select({
        id: landlordUsers.id,
        fullName: landlordUsers.fullName,
        email: landlordUsers.email,
        phone: landlordUsers.phone,
      })
      .from(landlordUsers)
      .where(eq(landlordUsers.id, row.inquiry.listerId))
      .limit(1)
    if (landlord) {
      lister = {
        id: landlord.id,
        role: LISTER_ROLES.LANDLORD,
        full_name: landlord.fullName,
        email: landlord.email,
        phone: landlord.phone,
      }
    }
  }

  const messages = await db
    .select()
    .from(inquiryMessages)
    .where(eq(inquiryMessages.inquiryId, inquiryId))
    .orderBy(asc(inquiryMessages.createdAt))

  return {
    id: row.inquiry.id,
    reference: row.inquiry.reference,
    subject: row.inquiry.subject,
    status: row.inquiry.status,
    closed_by: row.inquiry.closedBy,
    closed_at: row.inquiry.closedAt,
    listing: {
      ...row.listing,
      city: row.cityName,
      state: row.stateName,
    },
    seeker: row.seeker,
    lister,
    messages: messages.map((m) => ({
      id: m.id,
      sender_role: m.senderRole,
      sender_id: m.senderId,
      body: m.body,
      is_read: m.isRead,
      read_at: m.readAt,
      created_at: m.createdAt,
    })),
    created_at: row.inquiry.createdAt,
    updated_at: row.inquiry.updatedAt,
  }
}

