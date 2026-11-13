import { zValidator } from '@hono/zod-validator'
import { factory } from '../../config/env'
import {
  adminGetInquiryByIdHandler,
  adminListInquiriesHandler,
} from '../../controllers/admin/inquiry.controller'
import { authenticateAdmin } from '../../middleware/auth.middleware'
import { adminInquiryQuerySchema, validationHook } from '../../utils/validators'

const adminInquiryRoutes = factory.createApp()

adminInquiryRoutes.use('*', authenticateAdmin)

adminInquiryRoutes.get(
  '/',
  zValidator('query', adminInquiryQuerySchema, validationHook),
  adminListInquiriesHandler
)

adminInquiryRoutes.get('/:id', adminGetInquiryByIdHandler)

export default adminInquiryRoutes

