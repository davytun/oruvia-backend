import type { Context } from 'hono'
import { LISTER_ROLES } from '../config/constants'
import type { AppEnv } from '../config/env'
import {
  createPropertyListing,
  deleteMyPropertyListing,
  getMyPropertyListingById,
  getPublicPropertyListing,
  listMyPropertyListings,
  searchPublicListings,
  updateMyListingAvailability,
  updateMyPropertyListing,
} from '../services/listing.service'
import { uploadFileToCloudinary } from '../services/storage.service'
import { UnauthorizedError, ValidationError } from '../utils/errors'
import { sendCreated, sendPaginated, sendSuccess } from '../utils/response'
import type {
  CreateListingInput,
  ListingSearchQueryInput,
  PaginationQueryInput,
  UpdateListingAvailabilityInput,
  UpdateListingInput,
} from '../utils/validators'

function requireUser(c: Context<AppEnv>) {
  const user = c.get('user')
  if (!user) {
    throw new UnauthorizedError('Authentication required.')
  }
  return user
}

/**
 * Upload property photos and optional video tour (multipart/form-data)
 */
export async function uploadListingMediaHandler(c: Context<AppEnv>) {
  requireUser(c)
  const body = await c.req.parseBody({ all: true })

  const rawImages = body['images']
  const rawVideo = body['video']

  const imageFiles: File[] = []
  if (Array.isArray(rawImages)) {
    for (const item of rawImages) {
      if (item instanceof File && item.size > 0) {
        imageFiles.push(item)
      }
    }
  } else if (rawImages instanceof File && rawImages.size > 0) {
    imageFiles.push(rawImages)
  }

  if (imageFiles.length === 0) {
    throw new ValidationError([
      { field: 'images', issue: 'At least one image file is required in "images".' },
    ])
  }

  const uploadedUrls: string[] = []
  for (const file of imageFiles) {
    const url = await uploadFileToCloudinary(c.env, file, 'oruvia/listings')
    uploadedUrls.push(url)
  }

  let videoUrl: string | null = null
  if (rawVideo instanceof File && rawVideo.size > 0) {
    videoUrl = await uploadFileToCloudinary(c.env, rawVideo, 'oruvia/listings/videos')
  }

  return sendSuccess(c, {
    images: uploadedUrls,
    video_tour_url: videoUrl,
  })
}

/**
 * Public: Search & filter approved property listings
 */
export async function searchPublicListingsHandler(c: Context<AppEnv>) {
  const query = c.req.valid('query' as never) as ListingSearchQueryInput
  const seekerId = c.get('user')?.id
  const result = await searchPublicListings(c.get('db'), query, seekerId)
  return sendPaginated(c, result.items, {
    page: result.page,
    per_page: result.perPage,
    total_records: result.total,
  })
}

/**
 * Public: Get single property listing details by ID or Slug
 */
export async function getPublicListingHandler(c: Context<AppEnv>) {
  const idOrSlug = (c.req.param('idOrSlug') || '') as string
  const seekerId = c.get('user')?.id
  const result = await getPublicPropertyListing(c.get('db'), idOrSlug, seekerId)
  return sendSuccess(c, result)
}

/**
 * Agent: Create a new listing
 */
export async function createAgentListingHandler(c: Context<AppEnv>) {
  const user = requireUser(c)
  const input = c.req.valid('json' as never) as CreateListingInput
  const result = await createPropertyListing(
    c.get('db'),
    LISTER_ROLES.AGENT,
    user.id,
    input
  )
  return sendCreated(c, result)
}

/**
 * Agent: List own listings
 */
export async function listAgentListingsHandler(c: Context<AppEnv>) {
  const user = requireUser(c)
  const query = c.req.valid('query' as never) as PaginationQueryInput & {
    moderation_status?: string
    availability_status?: string
  }
  const result = await listMyPropertyListings(
    c.get('db'),
    LISTER_ROLES.AGENT,
    user.id,
    query
  )
  return sendPaginated(c, result.items, {
    page: result.page,
    per_page: result.perPage,
    total_records: result.total,
  })
}

/**
 * Agent: Get single own listing by ID
 */
export async function getAgentListingByIdHandler(c: Context<AppEnv>) {
  const user = requireUser(c)
  const id = c.req.param('id') as string
  const result = await getMyPropertyListingById(
    c.get('db'),
    LISTER_ROLES.AGENT,
    user.id,
    id
  )
  return sendSuccess(c, result)
}

/**
 * Agent: Update own listing
 */
export async function updateAgentListingHandler(c: Context<AppEnv>) {
  const user = requireUser(c)
  const id = c.req.param('id') as string
  const input = c.req.valid('json' as never) as UpdateListingInput
  const result = await updateMyPropertyListing(
    c.get('db'),
    LISTER_ROLES.AGENT,
    user.id,
    id,
    input
  )
  return sendSuccess(c, result)
}

/**
 * Agent: Update listing availability status
 */
export async function updateAgentListingAvailabilityHandler(c: Context<AppEnv>) {
  const user = requireUser(c)
  const id = c.req.param('id') as string
  const input = c.req.valid('json' as never) as UpdateListingAvailabilityInput
  const result = await updateMyListingAvailability(
    c.get('db'),
    LISTER_ROLES.AGENT,
    user.id,
    id,
    input
  )
  return sendSuccess(c, result)
}

/**
 * Agent: Delete own listing
 */
export async function deleteAgentListingHandler(c: Context<AppEnv>) {
  const user = requireUser(c)
  const id = c.req.param('id') as string
  const result = await deleteMyPropertyListing(
    c.get('db'),
    LISTER_ROLES.AGENT,
    user.id,
    id
  )
  return sendSuccess(c, result)
}

/**
 * Landlord: Create a new listing
 */
export async function createLandlordListingHandler(c: Context<AppEnv>) {
  const user = requireUser(c)
  const input = c.req.valid('json' as never) as CreateListingInput
  const result = await createPropertyListing(
    c.get('db'),
    LISTER_ROLES.LANDLORD,
    user.id,
    input
  )
  return sendCreated(c, result)
}

/**
 * Landlord: List own listings
 */
export async function listLandlordListingsHandler(c: Context<AppEnv>) {
  const user = requireUser(c)
  const query = c.req.valid('query' as never) as PaginationQueryInput & {
    moderation_status?: string
    availability_status?: string
  }
  const result = await listMyPropertyListings(
    c.get('db'),
    LISTER_ROLES.LANDLORD,
    user.id,
    query
  )
  return sendPaginated(c, result.items, {
    page: result.page,
    per_page: result.perPage,
    total_records: result.total,
  })
}

/**
 * Landlord: Get single own listing by ID
 */
export async function getLandlordListingByIdHandler(c: Context<AppEnv>) {
  const user = requireUser(c)
  const id = c.req.param('id') as string
  const result = await getMyPropertyListingById(
    c.get('db'),
    LISTER_ROLES.LANDLORD,
    user.id,
    id
  )
  return sendSuccess(c, result)
}

/**
 * Landlord: Update own listing
 */
export async function updateLandlordListingHandler(c: Context<AppEnv>) {
  const user = requireUser(c)
  const id = c.req.param('id') as string
  const input = c.req.valid('json' as never) as UpdateListingInput
  const result = await updateMyPropertyListing(
    c.get('db'),
    LISTER_ROLES.LANDLORD,
    user.id,
    id,
    input
  )
  return sendSuccess(c, result)
}

/**
 * Landlord: Update listing availability status
 */
export async function updateLandlordListingAvailabilityHandler(c: Context<AppEnv>) {
  const user = requireUser(c)
  const id = c.req.param('id') as string
  const input = c.req.valid('json' as never) as UpdateListingAvailabilityInput
  const result = await updateMyListingAvailability(
    c.get('db'),
    LISTER_ROLES.LANDLORD,
    user.id,
    id,
    input
  )
  return sendSuccess(c, result)
}

/**
 * Landlord: Delete own listing
 */
export async function deleteLandlordListingHandler(c: Context<AppEnv>) {
  const user = requireUser(c)
  const id = c.req.param('id') as string
  const result = await deleteMyPropertyListing(
    c.get('db'),
    LISTER_ROLES.LANDLORD,
    user.id,
    id
  )
  return sendSuccess(c, result)
}
