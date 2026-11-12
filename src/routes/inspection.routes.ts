import { zValidator } from '@hono/zod-validator'
import { factory } from '../config/env'
import {
  createSeekerInspectionHandler,
  getPublicInspectionSlotsHandler,
  getSeekerInspectionByIdHandler,
  listSeekerInspectionsHandler,
  seekerAcceptRescheduleHandler,
  seekerCancelInspectionHandler,
  seekerProposeRescheduleHandler,
  seekerRejectRescheduleHandler,
} from '../controllers/inspection.controller'
import { authenticateSeeker } from '../middleware/auth.middleware'
import {
  cancelInspectionBookingSchema,
  createInspectionBookingSchema,
  inspectionBookingQuerySchema,
  inspectionSlotsQuerySchema,
  proposeRescheduleSchema,
  rejectRescheduleSchema,
  validationHook,
} from '../utils/validators'

// Public inspection slots router
export const publicInspectionRoutes = factory.createApp()

publicInspectionRoutes.get(
  '/listings/:idOrSlug/inspection-slots',
  zValidator('query', inspectionSlotsQuerySchema, validationHook),
  getPublicInspectionSlotsHandler
)

// Seeker inspections router (mounted at /seekers/inspections)
export const seekerInspectionRoutes = factory.createApp()

seekerInspectionRoutes.use('*', authenticateSeeker)

seekerInspectionRoutes.post(
  '/',
  zValidator('json', createInspectionBookingSchema, validationHook),
  createSeekerInspectionHandler
)

seekerInspectionRoutes.get(
  '/',
  zValidator('query', inspectionBookingQuerySchema, validationHook),
  listSeekerInspectionsHandler
)

seekerInspectionRoutes.get('/:id', getSeekerInspectionByIdHandler)

seekerInspectionRoutes.post(
  '/:id/reschedule',
  zValidator('json', proposeRescheduleSchema, validationHook),
  seekerProposeRescheduleHandler
)

seekerInspectionRoutes.post(
  '/:id/reschedule/accept',
  seekerAcceptRescheduleHandler
)

seekerInspectionRoutes.post(
  '/:id/reschedule/reject',
  zValidator('json', rejectRescheduleSchema, validationHook),
  seekerRejectRescheduleHandler
)

seekerInspectionRoutes.post(
  '/:id/cancel',
  zValidator('json', cancelInspectionBookingSchema, validationHook),
  seekerCancelInspectionHandler
)
