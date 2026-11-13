import { and, desc, eq, like, or, sql } from 'drizzle-orm'
import { createElement } from 'react'
import {
  LISTER_ROLES,
  MODERATION_STATUSES,
  REPORT_ACTIONS,
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
  type ListerRole,
} from '../../config/constants'
import type { AppBindings } from '../../config/env'
import type { Database } from '../../database'
import {
  agentUsers,
  landlordUsers,
  propertyListings,
  reports,
  seekerUsers,
} from '../../models'
import { NotificationEmail } from '../../templates'
import { NotFoundError, ValidationError } from '../../utils/errors'
import { buildPaginationMeta, getPaginationOffset } from '../../utils/response'
import type {
  AdminReportListQueryInput,
  AdminReviewReportInput,
} from '../../utils/validators'
import { sendEmail } from '../email.service'
import { formatReportResponse, type ReporterRole } from '../report.service'

async function getUserSummary(
  db: Database,
  role: ReporterRole,
  userId: string
): Promise<{
  id: string
  role: ReporterRole
  full_name: string
  email: string
  is_suspended: boolean
} | null> {
  if (role === 'seeker') {
    const [u] = await db
      .select()
      .from(seekerUsers)
      .where(eq(seekerUsers.id, userId))
      .limit(1)
    return u
      ? {
          id: u.id,
          role: 'seeker',
          full_name: u.fullName,
          email: u.email,
          is_suspended: u.isSuspended,
        }
      : null
  }
  if (role === LISTER_ROLES.AGENT) {
    const [u] = await db
      .select()
      .from(agentUsers)
      .where(eq(agentUsers.id, userId))
      .limit(1)
    return u
      ? {
          id: u.id,
          role: 'agent',
          full_name: u.fullName,
          email: u.email,
          is_suspended: u.isSuspended,
        }
      : null
  }
  const [u] = await db
    .select()
    .from(landlordUsers)
    .where(eq(landlordUsers.id, userId))
    .limit(1)
  return u
    ? {
        id: u.id,
        role: 'landlord',
        full_name: u.fullName,
        email: u.email,
        is_suspended: u.isSuspended,
      }
    : null
}

async function suspendUserAccount(
  db: Database,
  role: ReporterRole,
  userId: string,
  now: string
) {
  if (role === 'seeker') {
    await db
      .update(seekerUsers)
      .set({
        isSuspended: true,
        tokenVersion: sql`${seekerUsers.tokenVersion} + 1`,
        updatedAt: now,
      })
      .where(eq(seekerUsers.id, userId))
  } else if (role === LISTER_ROLES.AGENT) {
    await db
      .update(agentUsers)
      .set({
        isSuspended: true,
        tokenVersion: sql`${agentUsers.tokenVersion} + 1`,
        updatedAt: now,
      })
      .where(eq(agentUsers.id, userId))
  } else {
    await db
      .update(landlordUsers)
      .set({
        isSuspended: true,
        tokenVersion: sql`${landlordUsers.tokenVersion} + 1`,
        updatedAt: now,
      })
      .where(eq(landlordUsers.id, userId))
  }
}

export async function adminListReports(
  db: Database,
  query: AdminReportListQueryInput
) {
  const conditions = []

  if (query.status) {
    conditions.push(eq(reports.status, query.status))
  }
  if (query.target_type) {
    conditions.push(eq(reports.targetType, query.target_type))
  }
  if (query.reason) {
    conditions.push(eq(reports.reason, query.reason))
  }
  if (query.search) {
    const pattern = `%${query.search}%`
    conditions.push(
      or(
        like(reports.description, pattern),
        like(reports.adminNotes, pattern),
        like(propertyListings.title, pattern)
      )
    )
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined
  const { page, per_page, limit, offset } = getPaginationOffset(
    query.page,
    query.per_page
  )

  const [rows, [{ count }]] = await Promise.all([
    db
      .select({
        report: reports,
        listing: {
          id: propertyListings.id,
          title: propertyListings.title,
          slug: propertyListings.slug,
          moderationStatus: propertyListings.moderationStatus,
        },
      })
      .from(reports)
      .leftJoin(propertyListings, eq(reports.listingId, propertyListings.id))
      .where(whereClause)
      .orderBy(desc(reports.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(reports)
      .leftJoin(propertyListings, eq(reports.listingId, propertyListings.id))
      .where(whereClause),
  ])

  return {
    items: rows.map((r) =>
      formatReportResponse(r.report, r.listing?.id ? r.listing : null)
    ),
    pagination: buildPaginationMeta(page, per_page, Number(count)),
  }
}

export async function adminGetReportById(db: Database, reportId: string) {
  const [row] = await db
    .select({
      report: reports,
      listing: {
        id: propertyListings.id,
        title: propertyListings.title,
        slug: propertyListings.slug,
        moderationStatus: propertyListings.moderationStatus,
      },
    })
    .from(reports)
    .leftJoin(propertyListings, eq(reports.listingId, propertyListings.id))
    .where(eq(reports.id, reportId))
    .limit(1)

  if (!row) {
    throw new NotFoundError('Report not found.')
  }

  const [reporter, targetUser] = await Promise.all([
    getUserSummary(
      db,
      row.report.reporterRole as ReporterRole,
      row.report.reporterId
    ),
    row.report.targetUserRole && row.report.targetUserId
      ? getUserSummary(
          db,
          row.report.targetUserRole as ReporterRole,
          row.report.targetUserId
        )
      : Promise.resolve(null),
  ])

  return {
    ...formatReportResponse(row.report, row.listing?.id ? row.listing : null),
    reporter,
    target_user: targetUser,
  }
}

export async function adminReviewReport(
  db: Database,
  env: AppBindings,
  adminId: string,
  reportId: string,
  input: AdminReviewReportInput
) {
  const [existing] = await db
    .select()
    .from(reports)
    .where(eq(reports.id, reportId))
    .limit(1)

  if (!existing) {
    throw new NotFoundError('Report not found.')
  }

  const action =
    input.status === REPORT_STATUSES.RESOLVED
      ? (input.action ?? REPORT_ACTIONS.NONE)
      : null

  if (
    action === REPORT_ACTIONS.SUSPEND_LISTING &&
    existing.targetType !== REPORT_TARGET_TYPES.LISTING
  ) {
    throw new ValidationError([
      {
        field: 'action',
        issue: 'suspend_listing can only be applied to listing reports.',
      },
    ])
  }

  const now = new Date().toISOString()

  let notifyRecipient: {
    email: string
    name: string
    title: string
    message: string
    metadata: Array<{ label: string; value: string }>
  } | null = null

  if (
    input.status === REPORT_STATUSES.RESOLVED &&
    action &&
    action !== REPORT_ACTIONS.NONE
  ) {
    const reasonText =
      input.admin_notes ||
      `Suspended following moderation review of report (${existing.reason}).`

    if (
      action === REPORT_ACTIONS.SUSPEND_LISTING &&
      existing.listingId
    ) {
      const [listing] = await db
        .select()
        .from(propertyListings)
        .where(eq(propertyListings.id, existing.listingId))
        .limit(1)

      if (listing) {
        await db
          .update(propertyListings)
          .set({
            moderationStatus: MODERATION_STATUSES.SUSPENDED,
            rejectionReason: reasonText,
            reviewedByAdminId: adminId,
            reviewedAt: now,
            updatedAt: now,
          })
          .where(eq(propertyListings.id, listing.id))

        const ownerRole = listing.listerRole as ListerRole
        const ownerId =
          ownerRole === LISTER_ROLES.AGENT
            ? listing.agentId
            : listing.landlordId
        if (ownerId) {
          const owner = await getUserSummary(db, ownerRole, ownerId)
          if (owner) {
            notifyRecipient = {
              email: owner.email,
              name: owner.full_name,
              title: 'Property Listing Suspended',
              message: `Your property listing "${listing.title}" has been suspended by Oruvia Trust & Safety following a moderation review.`,
              metadata: [
                { label: 'Listing', value: listing.title },
                { label: 'Status', value: 'Suspended' },
                { label: 'Reason', value: reasonText },
              ],
            }
          }
        }
      }
    } else if (
      action === REPORT_ACTIONS.SUSPEND_USER ||
      action === REPORT_ACTIONS.SUSPEND_USER_AND_LISTINGS
    ) {
      let targetRole: ReporterRole | null =
        (existing.targetUserRole as ReporterRole | null) ?? null
      let targetId: string | null = existing.targetUserId ?? null

      if (!targetRole && existing.listingId) {
        const [listing] = await db
          .select({
            listerRole: propertyListings.listerRole,
            agentId: propertyListings.agentId,
            landlordId: propertyListings.landlordId,
          })
          .from(propertyListings)
          .where(eq(propertyListings.id, existing.listingId))
          .limit(1)
        if (listing) {
          targetRole = listing.listerRole as ListerRole
          targetId =
            targetRole === LISTER_ROLES.AGENT
              ? listing.agentId
              : listing.landlordId
        }
      }

      if (targetRole && targetId) {
        await suspendUserAccount(db, targetRole, targetId, now)

        if (
          action === REPORT_ACTIONS.SUSPEND_USER_AND_LISTINGS &&
          (targetRole === LISTER_ROLES.AGENT ||
            targetRole === LISTER_ROLES.LANDLORD)
        ) {
          await db
            .update(propertyListings)
            .set({
              moderationStatus: MODERATION_STATUSES.SUSPENDED,
              rejectionReason: reasonText,
              reviewedByAdminId: adminId,
              reviewedAt: now,
              updatedAt: now,
            })
            .where(
              targetRole === LISTER_ROLES.AGENT
                ? eq(propertyListings.agentId, targetId)
                : eq(propertyListings.landlordId, targetId)
            )
        }

        const user = await getUserSummary(db, targetRole, targetId)
        if (user) {
          notifyRecipient = {
            email: user.email,
            name: user.full_name,
            title: 'Oruvia Account Suspended',
            message:
              action === REPORT_ACTIONS.SUSPEND_USER_AND_LISTINGS
                ? 'Your Oruvia account and associated property listings have been suspended following a moderation review.'
                : 'Your Oruvia account has been suspended following a moderation review.',
            metadata: [
              { label: 'Account Role', value: targetRole },
              { label: 'Status', value: 'Suspended' },
              { label: 'Reason', value: reasonText },
            ],
          }
        }
      }
    }
  }

  await db
    .update(reports)
    .set({
      status: input.status,
      actionTaken: action,
      adminNotes: input.admin_notes ?? existing.adminNotes,
      reviewedByAdminId: adminId,
      reviewedAt: now,
      updatedAt: now,
    })
    .where(eq(reports.id, reportId))

  if (notifyRecipient) {
    try {
      await sendEmail(env, {
        to: notifyRecipient.email,
        subject: `Oruvia Moderation Notice: ${notifyRecipient.title}`,
        template: createElement(NotificationEmail, {
          recipientName: notifyRecipient.name,
          title: notifyRecipient.title,
          message: notifyRecipient.message,
          metadata: notifyRecipient.metadata,
        }),
      })
    } catch {
      // Non-blocking: moderation state is already persisted
    }
  }

  return adminGetReportById(db, reportId)
}

