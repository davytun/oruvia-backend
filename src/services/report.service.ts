import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import {
  LISTER_ROLES,
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
} from '../config/constants'
import type { Database } from '../database'
import {
  agentUsers,
  landlordUsers,
  propertyListings,
  reports,
  seekerUsers,
  type Report,
} from '../models'
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../utils/errors'
import { buildPaginationMeta, getPaginationOffset } from '../utils/response'
import type {
  CreateReportInput,
  MyReportListQueryInput,
} from '../utils/validators'

export type ReporterRole = 'seeker' | 'agent' | 'landlord'

function parseEvidenceUrls(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function formatReportResponse(
  report: Report,
  listing?: {
    id: string
    title: string
    slug: string
    moderationStatus: string
  } | null
) {
  return {
    id: report.id,
    reporter_role: report.reporterRole,
    reporter_id: report.reporterId,
    target_type: report.targetType,
    listing_id: report.listingId,
    listing: listing
      ? {
          id: listing.id,
          title: listing.title,
          slug: listing.slug,
          moderation_status: listing.moderationStatus,
        }
      : null,
    target_user_role: report.targetUserRole,
    target_user_id: report.targetUserId,
    reason: report.reason,
    description: report.description,
    evidence_urls: parseEvidenceUrls(report.evidenceUrls),
    status: report.status,
    action_taken: report.actionTaken,
    admin_notes: report.adminNotes,
    reviewed_by_admin_id: report.reviewedByAdminId,
    reviewed_at: report.reviewedAt,
    created_at: report.createdAt,
    updated_at: report.updatedAt,
  }
}

export async function createReport(
  db: Database,
  reporterRole: ReporterRole,
  reporterId: string,
  input: CreateReportInput
) {
  const openStatuses = [REPORT_STATUSES.PENDING, REPORT_STATUSES.UNDER_REVIEW]

  if (input.target_type === REPORT_TARGET_TYPES.LISTING) {
    const listingId = input.listing_id!
    const [listing] = await db
      .select({
        id: propertyListings.id,
        listerRole: propertyListings.listerRole,
        agentId: propertyListings.agentId,
        landlordId: propertyListings.landlordId,
      })
      .from(propertyListings)
      .where(eq(propertyListings.id, listingId))
      .limit(1)

    if (!listing) {
      throw new NotFoundError('Property listing not found.')
    }

    const isOwner =
      (listing.listerRole === LISTER_ROLES.AGENT &&
        reporterRole === LISTER_ROLES.AGENT &&
        listing.agentId === reporterId) ||
      (listing.listerRole === LISTER_ROLES.LANDLORD &&
        reporterRole === LISTER_ROLES.LANDLORD &&
        listing.landlordId === reporterId)

    if (isOwner) {
      throw new ForbiddenError('You cannot report your own property listing.')
    }

    const [existingOpen] = await db
      .select({ id: reports.id })
      .from(reports)
      .where(
        and(
          eq(reports.reporterRole, reporterRole),
          eq(reports.reporterId, reporterId),
          eq(reports.targetType, REPORT_TARGET_TYPES.LISTING),
          eq(reports.listingId, listingId),
          inArray(reports.status, openStatuses)
        )
      )
      .limit(1)

    if (existingOpen) {
      throw new ConflictError(
        'You already have an open report for this property listing.'
      )
    }
  } else {
    const targetUserRole = input.target_user_role!
    const targetUserId = input.target_user_id!

    if (targetUserRole === reporterRole && targetUserId === reporterId) {
      throw new ForbiddenError('You cannot report your own account.')
    }

    if (targetUserRole === 'seeker') {
      const [user] = await db
        .select({ id: seekerUsers.id })
        .from(seekerUsers)
        .where(eq(seekerUsers.id, targetUserId))
        .limit(1)
      if (!user) throw new NotFoundError('Target seeker not found.')
    } else if (targetUserRole === LISTER_ROLES.AGENT) {
      const [user] = await db
        .select({ id: agentUsers.id })
        .from(agentUsers)
        .where(eq(agentUsers.id, targetUserId))
        .limit(1)
      if (!user) throw new NotFoundError('Target agent not found.')
    } else {
      const [user] = await db
        .select({ id: landlordUsers.id })
        .from(landlordUsers)
        .where(eq(landlordUsers.id, targetUserId))
        .limit(1)
      if (!user) throw new NotFoundError('Target landlord not found.')
    }

    const [existingOpen] = await db
      .select({ id: reports.id })
      .from(reports)
      .where(
        and(
          eq(reports.reporterRole, reporterRole),
          eq(reports.reporterId, reporterId),
          eq(reports.targetType, REPORT_TARGET_TYPES.USER),
          eq(reports.targetUserRole, targetUserRole),
          eq(reports.targetUserId, targetUserId),
          inArray(reports.status, openStatuses)
        )
      )
      .limit(1)

    if (existingOpen) {
      throw new ConflictError('You already have an open report for this user.')
    }
  }

  const now = new Date().toISOString()
  const reportId = crypto.randomUUID()

  await db.insert(reports).values({
    id: reportId,
    reporterRole,
    reporterId,
    targetType: input.target_type,
    listingId:
      input.target_type === REPORT_TARGET_TYPES.LISTING
        ? input.listing_id!
        : null,
    targetUserRole:
      input.target_type === REPORT_TARGET_TYPES.USER
        ? input.target_user_role!
        : null,
    targetUserId:
      input.target_type === REPORT_TARGET_TYPES.USER
        ? input.target_user_id!
        : null,
    reason: input.reason,
    description: input.description ?? null,
    evidenceUrls:
      input.evidence_urls && input.evidence_urls.length > 0
        ? JSON.stringify(input.evidence_urls)
        : null,
    status: REPORT_STATUSES.PENDING,
    createdAt: now,
    updatedAt: now,
  })

  const [created] = await db
    .select()
    .from(reports)
    .where(eq(reports.id, reportId))
    .limit(1)

  return formatReportResponse(created)
}

export async function listMyReports(
  db: Database,
  reporterRole: ReporterRole,
  reporterId: string,
  query: MyReportListQueryInput
) {
  const conditions = [
    eq(reports.reporterRole, reporterRole),
    eq(reports.reporterId, reporterId),
  ]

  if (query.status) {
    conditions.push(eq(reports.status, query.status))
  }
  if (query.target_type) {
    conditions.push(eq(reports.targetType, query.target_type))
  }

  const whereClause = and(...conditions)
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
    db.select({ count: sql<number>`count(*)` }).from(reports).where(whereClause),
  ])

  return {
    items: rows.map((r) =>
      formatReportResponse(r.report, r.listing?.id ? r.listing : null)
    ),
    pagination: buildPaginationMeta(page, per_page, Number(count)),
  }
}

