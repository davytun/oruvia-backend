import { zValidator } from '@hono/zod-validator'
import { factory } from '../config/env'
import {
  changeLandlordPasswordHandler,
  forgotLandlordPasswordHandler,
  getLandlordKycHandler,
  getLandlordMeHandler,
  loginLandlordHandler,
  registerLandlordHandler,
  resendLandlordCodeHandler,
  resetLandlordPasswordHandler,
  submitLandlordKycHandler,
  updateLandlordMeHandler,
  verifyLandlordEmailHandler,
} from '../controllers/landlord.controller'
import {
  createLandlordListingHandler,
  deleteLandlordListingHandler,
  getLandlordListingByIdHandler,
  listLandlordListingsHandler,
  updateLandlordListingAvailabilityHandler,
  updateLandlordListingHandler,
  uploadListingMediaHandler,
} from '../controllers/listing.controller'
import {
  addBlockedDateHandler,
  getAvailabilityWindowsHandler,
  getBlockedDatesHandler,
  getListerInspectionByIdHandler,
  getListerSettingsHandler,
  listListerInspectionsHandler,
  listerAcceptRescheduleHandler,
  listerCancelInspectionHandler,
  listerCompleteInspectionHandler,
  listerConfirmInspectionHandler,
  listerDeclineInspectionHandler,
  listerMarkNoShowHandler,
  listerProposeRescheduleHandler,
  listerRejectRescheduleHandler,
  listerUpdateFeeStatusHandler,
  listerUpdateVirtualDetailsHandler,
  removeBlockedDateHandler,
  setAvailabilityWindowsHandler,
  updateListingInspectionOptionsHandler,
  updateListerSettingsHandler,
} from '../controllers/inspection.controller'
import { authenticateLandlord } from '../middleware/auth.middleware'
import {
  cancelInspectionBookingSchema,
  changePasswordSchema,
  confirmInspectionBookingSchema,
  createBlockedDateSchema,
  createListingSchema,
  declineInspectionBookingSchema,
  forgotPasswordSchema,
  inspectionBookingQuerySchema,
  loginSchema,
  paginationQuerySchema,
  proposeRescheduleSchema,
  registerLandlordSchema,
  rejectRescheduleSchema,
  resendVerificationCodeSchema,
  resetPasswordSchema,
  setAvailabilityWindowsSchema,
  updateInspectionFeeStatusSchema,
  updateInspectionSettingsSchema,
  updateLandlordSchema,
  updateListingAvailabilitySchema,
  updateListingInspectionOptionsSchema,
  updateListingSchema,
  updateVirtualDetailsSchema,
  validationHook,
  verifyEmailSchema,
} from '../utils/validators'

const landlordRoutes = factory.createApp()

landlordRoutes.post(
  '/register',
  zValidator('json', registerLandlordSchema, validationHook),
  registerLandlordHandler
)

landlordRoutes.post(
  '/verify-email',
  zValidator('json', verifyEmailSchema, validationHook),
  verifyLandlordEmailHandler
)

landlordRoutes.post(
  '/resend-verification-code',
  zValidator('json', resendVerificationCodeSchema, validationHook),
  resendLandlordCodeHandler
)

landlordRoutes.post(
  '/login',
  zValidator('json', loginSchema, validationHook),
  loginLandlordHandler
)

landlordRoutes.post(
  '/forgot-password',
  zValidator('json', forgotPasswordSchema, validationHook),
  forgotLandlordPasswordHandler
)

landlordRoutes.post(
  '/reset-password',
  zValidator('json', resetPasswordSchema, validationHook),
  resetLandlordPasswordHandler
)

landlordRoutes.post(
  '/change-password',
  authenticateLandlord,
  zValidator('json', changePasswordSchema, validationHook),
  changeLandlordPasswordHandler
)

landlordRoutes.get('/me', authenticateLandlord, getLandlordMeHandler)

landlordRoutes.patch(
  '/me',
  authenticateLandlord,
  zValidator('json', updateLandlordSchema, validationHook),
  updateLandlordMeHandler
)

landlordRoutes.get('/kyc', authenticateLandlord, getLandlordKycHandler)

landlordRoutes.post('/kyc', authenticateLandlord, submitLandlordKycHandler)

// Landlord Property Listings
landlordRoutes.post(
  '/listings/media',
  authenticateLandlord,
  uploadListingMediaHandler
)

landlordRoutes.post(
  '/listings',
  authenticateLandlord,
  zValidator('json', createListingSchema, validationHook),
  createLandlordListingHandler
)

landlordRoutes.get(
  '/listings',
  authenticateLandlord,
  zValidator('query', paginationQuerySchema, validationHook),
  listLandlordListingsHandler
)

landlordRoutes.get('/listings/:id', authenticateLandlord, getLandlordListingByIdHandler)

landlordRoutes.patch(
  '/listings/:id',
  authenticateLandlord,
  zValidator('json', updateListingSchema, validationHook),
  updateLandlordListingHandler
)

landlordRoutes.patch(
  '/listings/:id/availability',
  authenticateLandlord,
  zValidator('json', updateListingAvailabilitySchema, validationHook),
  updateLandlordListingAvailabilityHandler
)

landlordRoutes.delete(
  '/listings/:id',
  authenticateLandlord,
  deleteLandlordListingHandler
)

// Landlord Inspection Settings & Schedule Management
landlordRoutes.get(
  '/inspection-settings',
  authenticateLandlord,
  getListerSettingsHandler
)

landlordRoutes.put(
  '/inspection-settings',
  authenticateLandlord,
  zValidator('json', updateInspectionSettingsSchema, validationHook),
  updateListerSettingsHandler
)

landlordRoutes.get(
  '/inspection-availability',
  authenticateLandlord,
  getAvailabilityWindowsHandler
)

landlordRoutes.put(
  '/inspection-availability',
  authenticateLandlord,
  zValidator('json', setAvailabilityWindowsSchema, validationHook),
  setAvailabilityWindowsHandler
)

landlordRoutes.get(
  '/inspection-blocked-dates',
  authenticateLandlord,
  getBlockedDatesHandler
)

landlordRoutes.post(
  '/inspection-blocked-dates',
  authenticateLandlord,
  zValidator('json', createBlockedDateSchema, validationHook),
  addBlockedDateHandler
)

landlordRoutes.delete(
  '/inspection-blocked-dates/:id',
  authenticateLandlord,
  removeBlockedDateHandler
)

landlordRoutes.patch(
  '/listings/:id/inspection-options',
  authenticateLandlord,
  zValidator('json', updateListingInspectionOptionsSchema, validationHook),
  updateListingInspectionOptionsHandler
)

// Landlord Inspection Bookings Management
landlordRoutes.get(
  '/inspections',
  authenticateLandlord,
  zValidator('query', inspectionBookingQuerySchema, validationHook),
  listListerInspectionsHandler
)

landlordRoutes.get(
  '/inspections/:id',
  authenticateLandlord,
  getListerInspectionByIdHandler
)

landlordRoutes.post(
  '/inspections/:id/confirm',
  authenticateLandlord,
  zValidator('json', confirmInspectionBookingSchema, validationHook),
  listerConfirmInspectionHandler
)

landlordRoutes.post(
  '/inspections/:id/decline',
  authenticateLandlord,
  zValidator('json', declineInspectionBookingSchema, validationHook),
  listerDeclineInspectionHandler
)

landlordRoutes.post(
  '/inspections/:id/reschedule',
  authenticateLandlord,
  zValidator('json', proposeRescheduleSchema, validationHook),
  listerProposeRescheduleHandler
)

landlordRoutes.post(
  '/inspections/:id/reschedule/accept',
  authenticateLandlord,
  listerAcceptRescheduleHandler
)

landlordRoutes.post(
  '/inspections/:id/reschedule/reject',
  authenticateLandlord,
  zValidator('json', rejectRescheduleSchema, validationHook),
  listerRejectRescheduleHandler
)

landlordRoutes.post(
  '/inspections/:id/cancel',
  authenticateLandlord,
  zValidator('json', cancelInspectionBookingSchema, validationHook),
  listerCancelInspectionHandler
)

landlordRoutes.patch(
  '/inspections/:id/virtual-details',
  authenticateLandlord,
  zValidator('json', updateVirtualDetailsSchema, validationHook),
  listerUpdateVirtualDetailsHandler
)

landlordRoutes.post(
  '/inspections/:id/complete',
  authenticateLandlord,
  listerCompleteInspectionHandler
)

landlordRoutes.post(
  '/inspections/:id/no-show',
  authenticateLandlord,
  listerMarkNoShowHandler
)

landlordRoutes.patch(
  '/inspections/:id/fee',
  authenticateLandlord,
  zValidator('json', updateInspectionFeeStatusSchema, validationHook),
  listerUpdateFeeStatusHandler
)

export default landlordRoutes

