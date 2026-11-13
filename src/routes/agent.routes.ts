import { zValidator } from '@hono/zod-validator'
import { factory } from '../config/env'
import {
  deleteReviewReplyHandler,
  listListerReviewsHandler,
  replyToReviewHandler,
} from '../controllers/review.controller'
import {
  listerReviewListQuerySchema,
  replyToReviewSchema,
} from '../utils/validators'
import {
  changeAgentPasswordHandler,
  forgotAgentPasswordHandler,
  getAgentKycHandler,
  getAgentMeHandler,
  loginAgentHandler,
  registerAgentHandler,
  resendAgentCodeHandler,
  resetAgentPasswordHandler,
  submitAgentKycHandler,
  updateAgentMeHandler,
  verifyAgentEmailHandler,
} from '../controllers/agent.controller'
import {
  createAgentListingHandler,
  deleteAgentListingHandler,
  getAgentListingByIdHandler,
  listAgentListingsHandler,
  updateAgentListingAvailabilityHandler,
  updateAgentListingHandler,
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
import {
  getListerInquiryByIdHandler,
  getListerUnreadCountHandler,
  listListerInquiriesHandler,
  listerCloseInquiryHandler,
  listerSendMessageHandler,
} from '../controllers/inquiry.controller'
import {
  getMyListingVerificationHandler,
  submitPropertyVerificationHandler,
  uploadPropertyVerificationDocsHandler,
} from '../controllers/property-verification.controller'
import { authenticateAgent } from '../middleware/auth.middleware'
import {
  cancelInspectionBookingSchema,
  changePasswordSchema,
  confirmInspectionBookingSchema,
  createBlockedDateSchema,
  createListingSchema,
  declineInspectionBookingSchema,
  forgotPasswordSchema,
  inquiryDetailQuerySchema,
  inquiryListQuerySchema,
  inspectionBookingQuerySchema,
  loginSchema,
  paginationQuerySchema,
  proposeRescheduleSchema,
  registerAgentSchema,
  rejectRescheduleSchema,
  resendVerificationCodeSchema,
  resetPasswordSchema,
  sendInquiryMessageSchema,
  setAvailabilityWindowsSchema,
  submitPropertyVerificationSchema,
  updateAgentSchema,
  updateInspectionFeeStatusSchema,
  updateInspectionSettingsSchema,
  updateListingAvailabilitySchema,
  updateListingInspectionOptionsSchema,
  updateListingSchema,
  updateVirtualDetailsSchema,
  validationHook,
  verifyEmailSchema,
} from '../utils/validators'

const agentRoutes = factory.createApp()

agentRoutes.post(
  '/register',
  zValidator('json', registerAgentSchema, validationHook),
  registerAgentHandler
)

agentRoutes.post(
  '/verify-email',
  zValidator('json', verifyEmailSchema, validationHook),
  verifyAgentEmailHandler
)

agentRoutes.post(
  '/resend-verification-code',
  zValidator('json', resendVerificationCodeSchema, validationHook),
  resendAgentCodeHandler
)

agentRoutes.post(
  '/login',
  zValidator('json', loginSchema, validationHook),
  loginAgentHandler
)

agentRoutes.post(
  '/forgot-password',
  zValidator('json', forgotPasswordSchema, validationHook),
  forgotAgentPasswordHandler
)

agentRoutes.post(
  '/reset-password',
  zValidator('json', resetPasswordSchema, validationHook),
  resetAgentPasswordHandler
)

agentRoutes.post(
  '/change-password',
  authenticateAgent,
  zValidator('json', changePasswordSchema, validationHook),
  changeAgentPasswordHandler
)

agentRoutes.get('/me', authenticateAgent, getAgentMeHandler)

agentRoutes.patch(
  '/me',
  authenticateAgent,
  zValidator('json', updateAgentSchema, validationHook),
  updateAgentMeHandler
)

agentRoutes.get('/kyc', authenticateAgent, getAgentKycHandler)

agentRoutes.post('/kyc', authenticateAgent, submitAgentKycHandler)

// Agent Property Listings
agentRoutes.post(
  '/listings/media',
  authenticateAgent,
  uploadListingMediaHandler
)

agentRoutes.post(
  '/listings',
  authenticateAgent,
  zValidator('json', createListingSchema, validationHook),
  createAgentListingHandler
)

agentRoutes.get(
  '/listings',
  authenticateAgent,
  zValidator('query', paginationQuerySchema, validationHook),
  listAgentListingsHandler
)

agentRoutes.get('/listings/:id', authenticateAgent, getAgentListingByIdHandler)

agentRoutes.patch(
  '/listings/:id',
  authenticateAgent,
  zValidator('json', updateListingSchema, validationHook),
  updateAgentListingHandler
)

agentRoutes.patch(
  '/listings/:id/availability',
  authenticateAgent,
  zValidator('json', updateListingAvailabilitySchema, validationHook),
  updateAgentListingAvailabilityHandler
)

agentRoutes.delete(
  '/listings/:id',
  authenticateAgent,
  deleteAgentListingHandler
)

// Agent Listing-Level Property Verification
agentRoutes.post(
  '/listings/:id/verification/upload',
  authenticateAgent,
  uploadPropertyVerificationDocsHandler
)

agentRoutes.post(
  '/listings/:id/verification',
  authenticateAgent,
  zValidator('json', submitPropertyVerificationSchema, validationHook),
  submitPropertyVerificationHandler
)

agentRoutes.get(
  '/listings/:id/verification',
  authenticateAgent,
  getMyListingVerificationHandler
)

// Agent Inspection Settings & Schedule Management
agentRoutes.get('/inspection-settings', authenticateAgent, getListerSettingsHandler)

agentRoutes.put(
  '/inspection-settings',
  authenticateAgent,
  zValidator('json', updateInspectionSettingsSchema, validationHook),
  updateListerSettingsHandler
)

agentRoutes.get(
  '/inspection-availability',
  authenticateAgent,
  getAvailabilityWindowsHandler
)

agentRoutes.put(
  '/inspection-availability',
  authenticateAgent,
  zValidator('json', setAvailabilityWindowsSchema, validationHook),
  setAvailabilityWindowsHandler
)

agentRoutes.get(
  '/inspection-blocked-dates',
  authenticateAgent,
  getBlockedDatesHandler
)

agentRoutes.post(
  '/inspection-blocked-dates',
  authenticateAgent,
  zValidator('json', createBlockedDateSchema, validationHook),
  addBlockedDateHandler
)

agentRoutes.delete(
  '/inspection-blocked-dates/:id',
  authenticateAgent,
  removeBlockedDateHandler
)

agentRoutes.patch(
  '/listings/:id/inspection-options',
  authenticateAgent,
  zValidator('json', updateListingInspectionOptionsSchema, validationHook),
  updateListingInspectionOptionsHandler
)

// Agent Inspection Bookings Management
agentRoutes.get(
  '/inspections',
  authenticateAgent,
  zValidator('query', inspectionBookingQuerySchema, validationHook),
  listListerInspectionsHandler
)

agentRoutes.get(
  '/inspections/:id',
  authenticateAgent,
  getListerInspectionByIdHandler
)

agentRoutes.post(
  '/inspections/:id/confirm',
  authenticateAgent,
  zValidator('json', confirmInspectionBookingSchema, validationHook),
  listerConfirmInspectionHandler
)

agentRoutes.post(
  '/inspections/:id/decline',
  authenticateAgent,
  zValidator('json', declineInspectionBookingSchema, validationHook),
  listerDeclineInspectionHandler
)

agentRoutes.post(
  '/inspections/:id/reschedule',
  authenticateAgent,
  zValidator('json', proposeRescheduleSchema, validationHook),
  listerProposeRescheduleHandler
)

agentRoutes.post(
  '/inspections/:id/reschedule/accept',
  authenticateAgent,
  listerAcceptRescheduleHandler
)

agentRoutes.post(
  '/inspections/:id/reschedule/reject',
  authenticateAgent,
  zValidator('json', rejectRescheduleSchema, validationHook),
  listerRejectRescheduleHandler
)

agentRoutes.post(
  '/inspections/:id/cancel',
  authenticateAgent,
  zValidator('json', cancelInspectionBookingSchema, validationHook),
  listerCancelInspectionHandler
)

agentRoutes.patch(
  '/inspections/:id/virtual-details',
  authenticateAgent,
  zValidator('json', updateVirtualDetailsSchema, validationHook),
  listerUpdateVirtualDetailsHandler
)

agentRoutes.post(
  '/inspections/:id/complete',
  authenticateAgent,
  listerCompleteInspectionHandler
)

agentRoutes.post(
  '/inspections/:id/no-show',
  authenticateAgent,
  listerMarkNoShowHandler
)

agentRoutes.patch(
  '/inspections/:id/fee',
  authenticateAgent,
  zValidator('json', updateInspectionFeeStatusSchema, validationHook),
  listerUpdateFeeStatusHandler
)

// Agent Inquiries & Messaging
agentRoutes.get(
  '/inquiries',
  authenticateAgent,
  zValidator('query', inquiryListQuerySchema, validationHook),
  listListerInquiriesHandler
)

agentRoutes.get(
  '/inquiries/unread-count',
  authenticateAgent,
  getListerUnreadCountHandler
)

agentRoutes.get(
  '/inquiries/:id',
  authenticateAgent,
  zValidator('query', inquiryDetailQuerySchema, validationHook),
  getListerInquiryByIdHandler
)

agentRoutes.post(
  '/inquiries/:id/messages',
  authenticateAgent,
  zValidator('json', sendInquiryMessageSchema, validationHook),
  listerSendMessageHandler
)

agentRoutes.post(
  '/inquiries/:id/close',
  authenticateAgent,
  listerCloseInquiryHandler
)

// Agent Reviews & Replies
agentRoutes.get(
  '/reviews',
  authenticateAgent,
  zValidator('query', listerReviewListQuerySchema, validationHook),
  listListerReviewsHandler
)

agentRoutes.post(
  '/reviews/:id/reply',
  authenticateAgent,
  zValidator('json', replyToReviewSchema, validationHook),
  replyToReviewHandler
)

agentRoutes.delete(
  '/reviews/:id/reply',
  authenticateAgent,
  deleteReviewReplyHandler
)

export default agentRoutes

