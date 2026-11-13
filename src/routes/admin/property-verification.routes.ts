import { zValidator } from '@hono/zod-validator'
import { factory } from '../../config/env'
import {
  adminGetPropertyVerificationByIdHandler,
  adminListPropertyVerificationsHandler,
  adminReviewPropertyVerificationHandler,
} from '../../controllers/admin/property-verification.controller'
import { authenticateAdmin } from '../../middleware/auth.middleware'
import {
  adminPropertyVerificationQuerySchema,
  adminReviewPropertyVerificationSchema,
  validationHook,
} from '../../utils/validators'

const adminPropertyVerificationRoutes = factory.createApp()

adminPropertyVerificationRoutes.use('*', authenticateAdmin)

adminPropertyVerificationRoutes.get(
  '/',
  zValidator('query', adminPropertyVerificationQuerySchema, validationHook),
  adminListPropertyVerificationsHandler
)

adminPropertyVerificationRoutes.get('/:id', adminGetPropertyVerificationByIdHandler)

adminPropertyVerificationRoutes.patch(
  '/:id/review',
  zValidator('json', adminReviewPropertyVerificationSchema, validationHook),
  adminReviewPropertyVerificationHandler
)

export default adminPropertyVerificationRoutes

