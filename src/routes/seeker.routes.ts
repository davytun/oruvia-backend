import { zValidator } from '@hono/zod-validator'
import { factory } from '../config/env'
import {
  addSeekerFavoriteHandler,
  listSeekerFavoritesHandler,
  removeSeekerFavoriteHandler,
  toggleSeekerFavoriteHandler,
} from '../controllers/favorite.controller'
import {
  createSeekerInquiryHandler,
  getSeekerInquiryByIdHandler,
  getSeekerUnreadCountHandler,
  listSeekerInquiriesHandler,
  seekerCloseInquiryHandler,
  seekerSendMessageHandler,
} from '../controllers/inquiry.controller'
import {
  changeSeekerPasswordHandler,
  forgotSeekerPasswordHandler,
  getSeekerMeHandler,
  loginSeekerHandler,
  registerSeekerHandler,
  resendSeekerCodeHandler,
  resetSeekerPasswordHandler,
  updateSeekerMeHandler,
  verifySeekerEmailHandler,
} from '../controllers/seeker.controller'
import {
  createSeekerReviewHandler,
  deleteSeekerReviewHandler,
  listSeekerReviewsHandler,
  updateSeekerReviewHandler,
} from '../controllers/review.controller'
import { authenticateSeeker } from '../middleware/auth.middleware'
import {
  changePasswordSchema,
  createInquirySchema,
  createReviewSchema,
  favoritesQuerySchema,
  forgotPasswordSchema,
  inquiryDetailQuerySchema,
  inquiryListQuerySchema,
  loginSchema,
  paginationQuerySchema,
  registerSeekerSchema,
  resendVerificationCodeSchema,
  resetPasswordSchema,
  saveFavoriteSchema,
  sendInquiryMessageSchema,
  updateReviewSchema,
  updateSeekerSchema,
  validationHook,
  verifyEmailSchema,
} from '../utils/validators'

const seekerRoutes = factory.createApp()

seekerRoutes.post(
  '/register',
  zValidator('json', registerSeekerSchema, validationHook),
  registerSeekerHandler
)

seekerRoutes.post(
  '/verify-email',
  zValidator('json', verifyEmailSchema, validationHook),
  verifySeekerEmailHandler
)

seekerRoutes.post(
  '/resend-verification-code',
  zValidator('json', resendVerificationCodeSchema, validationHook),
  resendSeekerCodeHandler
)

seekerRoutes.post(
  '/login',
  zValidator('json', loginSchema, validationHook),
  loginSeekerHandler
)

seekerRoutes.post(
  '/forgot-password',
  zValidator('json', forgotPasswordSchema, validationHook),
  forgotSeekerPasswordHandler
)

seekerRoutes.post(
  '/reset-password',
  zValidator('json', resetPasswordSchema, validationHook),
  resetSeekerPasswordHandler
)

seekerRoutes.post(
  '/change-password',
  authenticateSeeker,
  zValidator('json', changePasswordSchema, validationHook),
  changeSeekerPasswordHandler
)

seekerRoutes.get('/me', authenticateSeeker, getSeekerMeHandler)

seekerRoutes.patch(
  '/me',
  authenticateSeeker,
  zValidator('json', updateSeekerSchema, validationHook),
  updateSeekerMeHandler
)

// Seeker Favorites & Saved Properties
seekerRoutes.get(
  '/favorites',
  authenticateSeeker,
  zValidator('query', favoritesQuerySchema, validationHook),
  listSeekerFavoritesHandler
)

seekerRoutes.post(
  '/favorites',
  authenticateSeeker,
  zValidator('json', saveFavoriteSchema, validationHook),
  addSeekerFavoriteHandler
)

seekerRoutes.post(
  '/favorites/toggle',
  authenticateSeeker,
  zValidator('json', saveFavoriteSchema, validationHook),
  toggleSeekerFavoriteHandler
)

seekerRoutes.delete(
  '/favorites/:listingId',
  authenticateSeeker,
  removeSeekerFavoriteHandler
)

// Seeker Inquiries & Messaging
seekerRoutes.post(
  '/inquiries',
  authenticateSeeker,
  zValidator('json', createInquirySchema, validationHook),
  createSeekerInquiryHandler
)

seekerRoutes.get(
  '/inquiries',
  authenticateSeeker,
  zValidator('query', inquiryListQuerySchema, validationHook),
  listSeekerInquiriesHandler
)

seekerRoutes.get(
  '/inquiries/unread-count',
  authenticateSeeker,
  getSeekerUnreadCountHandler
)

seekerRoutes.get(
  '/inquiries/:id',
  authenticateSeeker,
  zValidator('query', inquiryDetailQuerySchema, validationHook),
  getSeekerInquiryByIdHandler
)

seekerRoutes.post(
  '/inquiries/:id/messages',
  authenticateSeeker,
  zValidator('json', sendInquiryMessageSchema, validationHook),
  seekerSendMessageHandler
)

seekerRoutes.post(
  '/inquiries/:id/close',
  authenticateSeeker,
  seekerCloseInquiryHandler
)

// Seeker Reviews & Ratings
seekerRoutes.get(
  '/reviews',
  authenticateSeeker,
  zValidator('query', paginationQuerySchema, validationHook),
  listSeekerReviewsHandler
)

seekerRoutes.post(
  '/reviews',
  authenticateSeeker,
  zValidator('json', createReviewSchema, validationHook),
  createSeekerReviewHandler
)

seekerRoutes.patch(
  '/reviews/:id',
  authenticateSeeker,
  zValidator('json', updateReviewSchema, validationHook),
  updateSeekerReviewHandler
)

seekerRoutes.delete(
  '/reviews/:id',
  authenticateSeeker,
  deleteSeekerReviewHandler
)

export default seekerRoutes

