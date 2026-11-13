import { zValidator } from '@hono/zod-validator'
import { factory } from '../config/env'
import {
  addSeekerFavoriteHandler,
  listSeekerFavoritesHandler,
  removeSeekerFavoriteHandler,
  toggleSeekerFavoriteHandler,
} from '../controllers/favorite.controller'
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
import { authenticateSeeker } from '../middleware/auth.middleware'
import {
  changePasswordSchema,
  favoritesQuerySchema,
  forgotPasswordSchema,
  loginSchema,
  registerSeekerSchema,
  resendVerificationCodeSchema,
  resetPasswordSchema,
  saveFavoriteSchema,
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

export default seekerRoutes

