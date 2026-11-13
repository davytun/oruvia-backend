import { zValidator } from '@hono/zod-validator'
import { factory } from '../../config/env'
import {
  adminGetReportByIdHandler,
  adminListReportsHandler,
  adminReviewReportHandler,
} from '../../controllers/admin/report.controller'
import { authenticateAdmin } from '../../middleware/auth.middleware'
import {
  adminReportListQuerySchema,
  adminReviewReportSchema,
  validationHook,
} from '../../utils/validators'

const adminReportRoutes = factory.createApp()

adminReportRoutes.use('*', authenticateAdmin)

adminReportRoutes.get(
  '/',
  zValidator('query', adminReportListQuerySchema, validationHook),
  adminListReportsHandler
)

adminReportRoutes.get('/:id', adminGetReportByIdHandler)

adminReportRoutes.patch(
  '/:id/review',
  zValidator('json', adminReviewReportSchema, validationHook),
  adminReviewReportHandler
)

export default adminReportRoutes

