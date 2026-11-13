import { zValidator } from '@hono/zod-validator'
import { factory } from '../config/env'
import {
  getPublicListingHandler,
  searchPublicListingsHandler,
} from '../controllers/listing.controller'
import { getListingReviewsHandler } from '../controllers/review.controller'
import { optionalAuthenticateSeeker } from '../middleware/auth.middleware'
import {
  listingSearchQuerySchema,
  publicReviewListQuerySchema,
  validationHook,
} from '../utils/validators'

const publicListingRoutes = factory.createApp()

publicListingRoutes.get(
  '/',
  optionalAuthenticateSeeker,
  zValidator('query', listingSearchQuerySchema, validationHook),
  searchPublicListingsHandler
)

publicListingRoutes.get(
  '/:id/reviews',
  zValidator('query', publicReviewListQuerySchema, validationHook),
  getListingReviewsHandler
)

publicListingRoutes.get(
  '/:idOrSlug',
  optionalAuthenticateSeeker,
  getPublicListingHandler
)

export default publicListingRoutes

