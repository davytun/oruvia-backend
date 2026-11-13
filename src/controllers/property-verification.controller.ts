import type { Context } from 'hono'
import { LISTER_ROLES, type ListerRole } from '../config/constants'
import type { AppEnv } from '../config/env'
import {
  getMyListingVerificationStatus,
  submitPropertyVerification,
} from '../services/property-verification.service'
import { uploadFileToCloudinary } from '../services/storage.service'
import {
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
} from '../utils/errors'
import { sendCreated, sendSuccess } from '../utils/response'
import type { SubmitPropertyVerificationInput } from '../utils/validators'

function requireLister(c: Context<AppEnv>): { id: string; role: ListerRole } {
  const user = c.get('user')
  if (!user) {
    throw new UnauthorizedError('Authentication required.')
  }
  if (
    user.accountType !== LISTER_ROLES.AGENT &&
    user.accountType !== LISTER_ROLES.LANDLORD
  ) {
    throw new ForbiddenError('Only Agents or Landlords can access this resource.')
  }
  return { id: user.id, role: user.accountType }
}

/**
 * Lister (Agent/Landlord): Upload property title/ownership documents (multipart/form-data)
 */
export async function uploadPropertyVerificationDocsHandler(c: Context<AppEnv>) {
  requireLister(c)
  const body = await c.req.parseBody({ all: true })
  const rawFiles = body['documents'] ?? body['files']

  const files: File[] = []
  if (Array.isArray(rawFiles)) {
    for (const item of rawFiles) {
      if (item instanceof File && item.size > 0) {
        files.push(item)
      }
    }
  } else if (rawFiles instanceof File && rawFiles.size > 0) {
    files.push(rawFiles)
  }

  if (files.length === 0) {
    throw new ValidationError([
      {
        field: 'documents',
        issue: 'At least one document file (image or PDF) is required in "documents".',
      },
    ])
  }

  const uploadedUrls: string[] = []
  for (const file of files) {
    const url = await uploadFileToCloudinary(
      c.env,
      file,
      'oruvia/property-verifications'
    )
    uploadedUrls.push(url)
  }

  return sendSuccess(c, { urls: uploadedUrls })
}

/**
 * Lister (Agent/Landlord): Submit listing-level property verification request
 */
export async function submitPropertyVerificationHandler(c: Context<AppEnv>) {
  const { id: listerId, role } = requireLister(c)
  const listingId = c.req.param('id') as string
  const input = c.req.valid('json' as never) as SubmitPropertyVerificationInput
  const result = await submitPropertyVerification(
    c.get('db'),
    role,
    listerId,
    listingId,
    input
  )
  return sendCreated(c, result)
}

/**
 * Lister (Agent/Landlord): Get property verification status & submission history
 */
export async function getMyListingVerificationHandler(c: Context<AppEnv>) {
  const { id: listerId, role } = requireLister(c)
  const listingId = c.req.param('id') as string
  const result = await getMyListingVerificationStatus(
    c.get('db'),
    role,
    listerId,
    listingId
  )
  return sendSuccess(c, result)
}

