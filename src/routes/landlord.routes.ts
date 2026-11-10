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
import { authenticateLandlord } from '../middleware/auth.middleware'
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerLandlordSchema,
  resendVerificationCodeSchema,
  resetPasswordSchema,
  updateLandlordSchema,
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

export default landlordRoutes

