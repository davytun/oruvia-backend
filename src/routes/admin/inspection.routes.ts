import { zValidator } from '@hono/zod-validator'
import { factory } from '../../config/env'
import {
  adminCancelInspectionHandler,
  adminGetInspectionByIdHandler,
  adminListInspectionsHandler,
  adminOverrideFeeStatusHandler,
  adminOverrideStatusHandler,
  adminRescheduleInspectionHandler,
} from '../../controllers/admin/inspection.controller'
import { authenticateAdmin } from '../../middleware/auth.middleware'
import {
  adminCancelInspectionSchema,
  adminInspectionQuerySchema,
  adminOverrideFeeStatusSchema,
  adminOverrideInspectionStatusSchema,
  adminRescheduleInspectionSchema,
  validationHook,
} from '../../utils/validators'

const adminInspectionRoutes = factory.createApp()

adminInspectionRoutes.use('*', authenticateAdmin)

adminInspectionRoutes.get(
  '/',
  zValidator('query', adminInspectionQuerySchema, validationHook),
  adminListInspectionsHandler
)

adminInspectionRoutes.get('/:id', adminGetInspectionByIdHandler)

adminInspectionRoutes.post(
  '/:id/cancel',
  zValidator('json', adminCancelInspectionSchema, validationHook),
  adminCancelInspectionHandler
)

adminInspectionRoutes.post(
  '/:id/reschedule',
  zValidator('json', adminRescheduleInspectionSchema, validationHook),
  adminRescheduleInspectionHandler
)

adminInspectionRoutes.patch(
  '/:id/status',
  zValidator('json', adminOverrideInspectionStatusSchema, validationHook),
  adminOverrideStatusHandler
)

adminInspectionRoutes.patch(
  '/:id/fee',
  zValidator('json', adminOverrideFeeStatusSchema, validationHook),
  adminOverrideFeeStatusHandler
)

export default adminInspectionRoutes
