import { zValidator } from '@hono/zod-validator'
import { factory } from '../../config/env'
import {
  adminGetListingByIdHandler,
  adminListListingsHandler,
  adminReviewListingHandler,
} from '../../controllers/admin/listing.controller'
import { authenticateAdmin } from '../../middleware'
import {
  adminListingListQuerySchema,
  idParamSchema,
  reviewListingSchema,
  validationHook,
} from '../../utils/validators'

const adminListingRoutes = factory.createApp()

adminListingRoutes.use('*', authenticateAdmin)

adminListingRoutes.get(
  '/',
  zValidator('query', adminListingListQuerySchema, validationHook),
  adminListListingsHandler
)

adminListingRoutes.get(
  '/:id',
  zValidator('param', idParamSchema, validationHook),
  adminGetListingByIdHandler
)

adminListingRoutes.patch(
  '/:id/review',
  zValidator('param', idParamSchema, validationHook),
  zValidator('json', reviewListingSchema, validationHook),
  adminReviewListingHandler
)

export default adminListingRoutes
