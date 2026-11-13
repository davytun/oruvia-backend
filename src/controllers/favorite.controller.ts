import type { Context } from 'hono'
import type { AppEnv } from '../config/env'
import {
  addFavorite,
  getSeekerFavorites,
  removeFavorite,
  toggleFavorite,
} from '../services/favorite.service'
import { UnauthorizedError } from '../utils/errors'
import { sendCreated, sendPaginated, sendSuccess } from '../utils/response'
import type { FavoritesQueryInput, SaveFavoriteInput } from '../utils/validators'

function requireSeeker(c: Context<AppEnv>) {
  const user = c.get('user')
  if (!user) {
    throw new UnauthorizedError('Authentication required.')
  }
  return user
}

/**
 * Seeker: List saved / favorite properties
 */
export async function listSeekerFavoritesHandler(c: Context<AppEnv>) {
  const user = requireSeeker(c)
  const query = c.req.valid('query' as never) as FavoritesQueryInput
  const result = await getSeekerFavorites(c.get('db'), user.id, query)

  return sendPaginated(c, result.items, {
    page: result.page,
    per_page: result.perPage,
    total_records: result.total,
  })
}

/**
 * Seeker: Save a property listing to favorites
 */
export async function addSeekerFavoriteHandler(c: Context<AppEnv>) {
  const user = requireSeeker(c)
  const { listing_id } = c.req.valid('json' as never) as SaveFavoriteInput
  const result = await addFavorite(c.get('db'), user.id, listing_id)

  return sendCreated(c, result)
}

/**
 * Seeker: Toggle favorite status for a property listing
 */
export async function toggleSeekerFavoriteHandler(c: Context<AppEnv>) {
  const user = requireSeeker(c)
  const { listing_id } = c.req.valid('json' as never) as SaveFavoriteInput
  const result = await toggleFavorite(c.get('db'), user.id, listing_id)

  return sendSuccess(c, result)
}

/**
 * Seeker: Remove a property listing from favorites
 */
export async function removeSeekerFavoriteHandler(c: Context<AppEnv>) {
  const user = requireSeeker(c)
  const listingId = c.req.param('listingId') as string
  const result = await removeFavorite(c.get('db'), user.id, listingId)

  return sendSuccess(c, result)
}
