import { zValidator } from '@hono/zod-validator'
import { factory } from '../config/env'
import {
  changeAgentPasswordHandler,
  forgotAgentPasswordHandler,
  getAgentMeHandler,
  loginAgentHandler,
  registerAgentHandler,
  resendAgentCodeHandler,
  resetAgentPasswordHandler,
  updateAgentMeHandler,
  verifyAgentEmailHandler,
} from '../controllers/agent.controller'
import { authenticateAgent } from '../middleware/auth.middleware'
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerAgentSchema,
  resendVerificationCodeSchema,
  resetPasswordSchema,
  updateAgentSchema,
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

export default agentRoutes

