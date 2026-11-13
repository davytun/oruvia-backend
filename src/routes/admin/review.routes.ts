import { zValidator } from '@hono/zod-validator'
import { factory } from '../../config/env'
import {
  adminDeleteReviewHandler,
  adminListReviewsHandler,
  adminModerateReviewHandler,
} from '../../controllers/admin/review.controller'
import { authenticateAdmin } from '../../middleware/auth.middleware'
import {
  adminModerateReviewSchema,
  adminReviewListQuerySchema,
  validationHook,
} from '../../utils/validators'

const adminReviewRoutes = factory.createApp()

adminReviewRoutes.use('*', authenticateAdmin)

adminReviewRoutes.get(
  '/',
  zValidator('query', adminReviewListQuerySchema, validationHook),
  adminListReviewsHandler
)

adminReviewRoutes.patch(
  '/:id/moderate',
  zValidator('json', adminModerateReviewSchema, validationHook),
  adminModerateReviewHandler
)

adminReviewRoutes.delete('/:id', adminDeleteReviewHandler)

export default adminReviewRoutes

