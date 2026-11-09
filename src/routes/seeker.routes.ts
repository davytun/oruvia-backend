import { zValidator } from '@hono/zod-validator'
import { factory } from '../config/env'
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
  forgotPasswordSchema,
  loginSchema,
  registerSeekerSchema,
  resendVerificationCodeSchema,
  resetPasswordSchema,
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

export default seekerRoutes

