import { zValidator } from '@hono/zod-validator'
import { factory } from '../config/env'
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
import { authenticateAgent } from '../middleware/auth.middleware'
import {
  changePasswordSchema,
  createListingSchema,
  forgotPasswordSchema,
  loginSchema,
  paginationQuerySchema,
  registerAgentSchema,
  resendVerificationCodeSchema,
  resetPasswordSchema,
  updateAgentSchema,
  updateListingAvailabilitySchema,
  updateListingSchema,
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

export default agentRoutes

