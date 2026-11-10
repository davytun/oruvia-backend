import { zValidator } from '@hono/zod-validator'
import { factory } from '../config/env'
import {
  getPublicListingHandler,
  searchPublicListingsHandler,
} from '../controllers/listing.controller'
import { listingSearchQuerySchema, validationHook } from '../utils/validators'

const publicListingRoutes = factory.createApp()

publicListingRoutes.get(
  '/',
  zValidator('query', listingSearchQuerySchema, validationHook),
  searchPublicListingsHandler
)

publicListingRoutes.get('/:idOrSlug', getPublicListingHandler)

export default publicListingRoutes
