import { createElement } from 'react'
import { desc, eq, sql } from 'drizzle-orm'
import { VERIFICATION_STATUSES } from '../../config/constants'
import type { AppBindings } from '../../config/env'
import type { Database } from '../../database'
import {
  agentKycSubmissions,
  agentUsers,
  landlordKycSubmissions,
  landlordUsers,
} from '../../models'
import { NotificationEmail } from '../../templates'
import { NotFoundError } from '../../utils/errors'
import type { KycListQueryInput, ReviewKycInput } from '../../utils/validators'
import { sendEmail } from '../email.service'
import { safeCreateNotification } from '../notification.service'

/**
 * List Agent KYC submissions (filterable by `status`)
 */
export async function listAgentKycSubmissions(
  db: Database,
  query: KycListQueryInput
) {
  const offset = (query.page - 1) * query.per_page
  const whereClause = query.status
    ? eq(agentKycSubmissions.status, query.status)
    : undefined

  const rows = await db
    .select({
      submission: agentKycSubmissions,
      agent: {
        id: agentUsers.id,
        fullName: agentUsers.fullName,
        email: agentUsers.email,
        phone: agentUsers.phone,
        whatsappNumber: agentUsers.whatsappNumber,
        agencyName: agentUsers.agencyName,
        licenseNumber: agentUsers.licenseNumber,
        isVerified: agentUsers.isVerified,
        verificationStatus: agentUsers.verificationStatus,
        verificationBadge: agentUsers.verificationBadge,
      },
    })
    .from(agentKycSubmissions)
    .innerJoin(agentUsers, eq(agentKycSubmissions.agentId, agentUsers.id))
    .where(whereClause)
    .orderBy(desc(agentKycSubmissions.submittedAt))
    .limit(query.per_page)
    .offset(offset)

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(agentKycSubmissions)
    .where(whereClause)

  return {
    items: rows.map(({ submission, agent }) => ({
      id: submission.id,
      agent_id: submission.agentId,
      id_type: submission.idType,
      id_number: submission.idNumber,
      id_document_url: submission.idDocumentUrl,
      selfie_url: submission.selfieUrl,
      agency_name: submission.agencyName,
      license_number: submission.licenseNumber,
      license_document_url: submission.licenseDocumentUrl,
      office_address: submission.officeAddress,
      city: submission.city,
      state: submission.state,
      status: submission.status,
      qualified_badge: submission.qualifiedBadge,
      rejection_reason: submission.rejectionReason,
      submitted_at: submission.submittedAt,
      reviewed_at: submission.reviewedAt,
      agent: {
        id: agent.id,
        full_name: agent.fullName,
        email: agent.email,
        phone: agent.phone,
        whatsapp_number: agent.whatsappNumber,
        agency_name: agent.agencyName,
        license_number: agent.licenseNumber,
        is_verified: agent.isVerified,
        verification_status: agent.verificationStatus,
        verification_badge: agent.verificationBadge,
      },
    })),
    page: query.page,
    perPage: query.per_page,
    total: Number(countResult?.count ?? 0),
  }
}

/**
 * Get a single Agent KYC submission by ID
 */
export async function getAgentKycSubmissionById(
  db: Database,
  submissionId: string
) {
  const [row] = await db
    .select({
      submission: agentKycSubmissions,
      agent: {
        id: agentUsers.id,
        fullName: agentUsers.fullName,
        email: agentUsers.email,
        phone: agentUsers.phone,
        whatsappNumber: agentUsers.whatsappNumber,
        agencyName: agentUsers.agencyName,
        licenseNumber: agentUsers.licenseNumber,
        isVerified: agentUsers.isVerified,
        verificationStatus: agentUsers.verificationStatus,
        verificationBadge: agentUsers.verificationBadge,
      },
    })
    .from(agentKycSubmissions)
    .innerJoin(agentUsers, eq(agentKycSubmissions.agentId, agentUsers.id))
    .where(eq(agentKycSubmissions.id, submissionId))
    .limit(1)

  if (!row) {
    throw new NotFoundError('Agent KYC submission not found.')
  }

  const { submission, agent } = row
  return {
    id: submission.id,
    agent_id: submission.agentId,
    id_type: submission.idType,
    id_number: submission.idNumber,
    id_document_url: submission.idDocumentUrl,
    selfie_url: submission.selfieUrl,
    agency_name: submission.agencyName,
    license_number: submission.licenseNumber,
    license_document_url: submission.licenseDocumentUrl,
    office_address: submission.officeAddress,
    city: submission.city,
    state: submission.state,
    status: submission.status,
    qualified_badge: submission.qualifiedBadge,
    rejection_reason: submission.rejectionReason,
    submitted_at: submission.submittedAt,
    reviewed_at: submission.reviewedAt,
    agent: {
      id: agent.id,
      full_name: agent.fullName,
      email: agent.email,
      phone: agent.phone,
      whatsapp_number: agent.whatsappNumber,
      agency_name: agent.agencyName,
      license_number: agent.licenseNumber,
      is_verified: agent.isVerified,
      verification_status: agent.verificationStatus,
      verification_badge: agent.verificationBadge,
    },
  }
}

/**
 * Approve or reject an Agent KYC submission
 */
export async function reviewAgentKycSubmission(
  db: Database,
  env: AppBindings,
  submissionId: string,
  input: ReviewKycInput
) {
  const [submission] = await db
    .select()
    .from(agentKycSubmissions)
    .where(eq(agentKycSubmissions.id, submissionId))
    .limit(1)

  if (!submission) {
    throw new NotFoundError('Agent KYC submission not found.')
  }

  const [agent] = await db
    .select()
    .from(agentUsers)
    .where(eq(agentUsers.id, submission.agentId))
    .limit(1)

  if (!agent) {
    throw new NotFoundError('Agent account not found.')
  }

  const nowIso = new Date().toISOString()
  const isApproved = input.status === VERIFICATION_STATUSES.APPROVED
  const activeBadge = isApproved ? submission.qualifiedBadge : null

  const [updatedSubmission] = await db
    .update(agentKycSubmissions)
    .set({
      status: input.status,
      rejectionReason: isApproved ? null : (input.rejection_reason ?? null),
      reviewedAt: nowIso,
      updatedAt: nowIso,
    })
    .where(eq(agentKycSubmissions.id, submissionId))
    .returning()

  await db
    .update(agentUsers)
    .set({
      isVerified: isApproved,
      verificationStatus: input.status,
      verificationBadge: activeBadge,
      updatedAt: nowIso,
    })
    .where(eq(agentUsers.id, agent.id))

  const badgeLabel =
    activeBadge === 'licensed_agent' ? 'Licensed Agent' : 'Verified Agent'

  await safeCreateNotification(db, {
    recipientRole: 'agent',
    recipientId: agent.id,
    type: 'verification_update',
    title: isApproved
      ? `Agent KYC Approved (${badgeLabel})`
      : 'Agent KYC Needs Attention',
    message: isApproved
      ? `Your agent verification documents were approved and your "${badgeLabel}" badge is now active.`
      : `Your agent KYC submission was not approved. Reason: ${input.rejection_reason}`,
    entityType: 'kyc',
    entityId: submission.id,
    metadata: { status: input.status, badge: activeBadge },
  })

  await sendEmail(env, {
    to: agent.email,
    subject: isApproved
      ? `Oruvia KYC Approved — ${badgeLabel} Badge Activated`
      : 'Update on Your Oruvia Agent KYC Submission',
    template: createElement(NotificationEmail, {
      recipientName: agent.fullName,
      title: isApproved
        ? `Your Agent KYC is Approved (${badgeLabel})`
        : 'Your Agent KYC Submission Needs Attention',
      message: isApproved
        ? `Congratulations! Your agent verification documents have been approved and your "${badgeLabel}" badge is now active on your profile and property listing cards.`
        : `We reviewed your agent KYC submission, but could not approve it yet. Reason: ${input.rejection_reason}`,
      metadata: [
        { label: 'Account Role', value: 'Real Estate Agent' },
        { label: 'KYC Status', value: isApproved ? 'Approved' : 'Rejected' },
        ...(isApproved
          ? [{ label: 'Listing Card Badge', value: badgeLabel }]
          : []),
      ],
    }),
  })

  return {
    agent_id: agent.id,
    is_verified: isApproved,
    verification_status: input.status,
    verification_badge: activeBadge,
    kyc_submission: {
      id: updatedSubmission.id,
      status: updatedSubmission.status,
      qualified_badge: updatedSubmission.qualifiedBadge,
      rejection_reason: updatedSubmission.rejectionReason,
      submitted_at: updatedSubmission.submittedAt,
      reviewed_at: updatedSubmission.reviewedAt,
    },
  }
}

/**
 * List Landlord KYC submissions (filterable by `status`)
 */
export async function listLandlordKycSubmissions(
  db: Database,
  query: KycListQueryInput
) {
  const offset = (query.page - 1) * query.per_page
  const whereClause = query.status
    ? eq(landlordKycSubmissions.status, query.status)
    : undefined

  const rows = await db
    .select({
      submission: landlordKycSubmissions,
      landlord: {
        id: landlordUsers.id,
        fullName: landlordUsers.fullName,
        email: landlordUsers.email,
        phone: landlordUsers.phone,
        whatsappNumber: landlordUsers.whatsappNumber,
        companyName: landlordUsers.companyName,
        isVerified: landlordUsers.isVerified,
        verificationStatus: landlordUsers.verificationStatus,
        verificationBadge: landlordUsers.verificationBadge,
      },
    })
    .from(landlordKycSubmissions)
    .innerJoin(
      landlordUsers,
      eq(landlordKycSubmissions.landlordId, landlordUsers.id)
    )
    .where(whereClause)
    .orderBy(desc(landlordKycSubmissions.submittedAt))
    .limit(query.per_page)
    .offset(offset)

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(landlordKycSubmissions)
    .where(whereClause)

  return {
    items: rows.map(({ submission, landlord }) => ({
      id: submission.id,
      landlord_id: submission.landlordId,
      id_type: submission.idType,
      id_number: submission.idNumber,
      id_document_url: submission.idDocumentUrl,
      selfie_url: submission.selfieUrl,
      proof_type: submission.proofType,
      proof_document_url: submission.proofDocumentUrl,
      residential_address: submission.residentialAddress,
      city: submission.city,
      state: submission.state,
      status: submission.status,
      qualified_badge: submission.qualifiedBadge,
      rejection_reason: submission.rejectionReason,
      submitted_at: submission.submittedAt,
      reviewed_at: submission.reviewedAt,
      landlord: {
        id: landlord.id,
        full_name: landlord.fullName,
        email: landlord.email,
        phone: landlord.phone,
        whatsapp_number: landlord.whatsappNumber,
        company_name: landlord.companyName,
        is_verified: landlord.isVerified,
        verification_status: landlord.verificationStatus,
        verification_badge: landlord.verificationBadge,
      },
    })),
    page: query.page,
    perPage: query.per_page,
    total: Number(countResult?.count ?? 0),
  }
}

/**
 * Get a single Landlord KYC submission by ID
 */
export async function getLandlordKycSubmissionById(
  db: Database,
  submissionId: string
) {
  const [row] = await db
    .select({
      submission: landlordKycSubmissions,
      landlord: {
        id: landlordUsers.id,
        fullName: landlordUsers.fullName,
        email: landlordUsers.email,
        phone: landlordUsers.phone,
        whatsappNumber: landlordUsers.whatsappNumber,
        companyName: landlordUsers.companyName,
        isVerified: landlordUsers.isVerified,
        verificationStatus: landlordUsers.verificationStatus,
        verificationBadge: landlordUsers.verificationBadge,
      },
    })
    .from(landlordKycSubmissions)
    .innerJoin(
      landlordUsers,
      eq(landlordKycSubmissions.landlordId, landlordUsers.id)
    )
    .where(eq(landlordKycSubmissions.id, submissionId))
    .limit(1)

  if (!row) {
    throw new NotFoundError('Landlord KYC submission not found.')
  }

  const { submission, landlord } = row
  return {
    id: submission.id,
    landlord_id: submission.landlordId,
    id_type: submission.idType,
    id_number: submission.idNumber,
    id_document_url: submission.idDocumentUrl,
    selfie_url: submission.selfieUrl,
    proof_type: submission.proofType,
    proof_document_url: submission.proofDocumentUrl,
    residential_address: submission.residentialAddress,
    city: submission.city,
    state: submission.state,
    status: submission.status,
    qualified_badge: submission.qualifiedBadge,
    rejection_reason: submission.rejectionReason,
    submitted_at: submission.submittedAt,
    reviewed_at: submission.reviewedAt,
    landlord: {
      id: landlord.id,
      full_name: landlord.fullName,
      email: landlord.email,
      phone: landlord.phone,
      whatsapp_number: landlord.whatsappNumber,
      company_name: landlord.companyName,
      is_verified: landlord.isVerified,
      verification_status: landlord.verificationStatus,
      verification_badge: landlord.verificationBadge,
    },
  }
}

/**
 * Approve or reject a Landlord KYC submission
 */
export async function reviewLandlordKycSubmission(
  db: Database,
  env: AppBindings,
  submissionId: string,
  input: ReviewKycInput
) {
  const [submission] = await db
    .select()
    .from(landlordKycSubmissions)
    .where(eq(landlordKycSubmissions.id, submissionId))
    .limit(1)

  if (!submission) {
    throw new NotFoundError('Landlord KYC submission not found.')
  }

  const [landlord] = await db
    .select()
    .from(landlordUsers)
    .where(eq(landlordUsers.id, submission.landlordId))
    .limit(1)

  if (!landlord) {
    throw new NotFoundError('Landlord account not found.')
  }

  const nowIso = new Date().toISOString()
  const isApproved = input.status === VERIFICATION_STATUSES.APPROVED
  const activeBadge = isApproved ? submission.qualifiedBadge : null

  const [updatedSubmission] = await db
    .update(landlordKycSubmissions)
    .set({
      status: input.status,
      rejectionReason: isApproved ? null : (input.rejection_reason ?? null),
      reviewedAt: nowIso,
      updatedAt: nowIso,
    })
    .where(eq(landlordKycSubmissions.id, submissionId))
    .returning()

  await db
    .update(landlordUsers)
    .set({
      isVerified: isApproved,
      verificationStatus: input.status,
      verificationBadge: activeBadge,
      updatedAt: nowIso,
    })
    .where(eq(landlordUsers.id, landlord.id))

  const badgeLabel =
    activeBadge === 'verified_owner'
      ? 'Verified Property Owner'
      : 'Verified Landlord'

  await safeCreateNotification(db, {
    recipientRole: 'landlord',
    recipientId: landlord.id,
    type: 'verification_update',
    title: isApproved
      ? `Landlord KYC Approved (${badgeLabel})`
      : 'Landlord KYC Needs Attention',
    message: isApproved
      ? `Your landlord verification documents were approved and your "${badgeLabel}" badge is now active.`
      : `Your landlord KYC submission was not approved. Reason: ${input.rejection_reason}`,
    entityType: 'kyc',
    entityId: submission.id,
    metadata: { status: input.status, badge: activeBadge },
  })

  await sendEmail(env, {
    to: landlord.email,
    subject: isApproved
      ? `Oruvia KYC Approved — ${badgeLabel} Badge Activated`
      : 'Update on Your Oruvia Landlord KYC Submission',
    template: createElement(NotificationEmail, {
      recipientName: landlord.fullName,
      title: isApproved
        ? `Your Landlord KYC is Approved (${badgeLabel})`
        : 'Your Landlord KYC Submission Needs Attention',
      message: isApproved
        ? `Congratulations! Your landlord verification documents have been approved and your "${badgeLabel}" badge is now active on your profile and property listing cards.`
        : `We reviewed your landlord KYC submission, but could not approve it yet. Reason: ${input.rejection_reason}`,
      metadata: [
        { label: 'Account Role', value: 'Landlord / Property Owner' },
        { label: 'KYC Status', value: isApproved ? 'Approved' : 'Rejected' },
        ...(isApproved
          ? [{ label: 'Listing Card Badge', value: badgeLabel }]
          : []),
      ],
    }),
  })

  return {
    landlord_id: landlord.id,
    is_verified: isApproved,
    verification_status: input.status,
    verification_badge: activeBadge,
    kyc_submission: {
      id: updatedSubmission.id,
      status: updatedSubmission.status,
      qualified_badge: updatedSubmission.qualifiedBadge,
      rejection_reason: updatedSubmission.rejectionReason,
      submitted_at: updatedSubmission.submittedAt,
      reviewed_at: updatedSubmission.reviewedAt,
    },
  }
}
