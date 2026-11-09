import { zValidator } from '@hono/zod-validator'
import { factory } from '../config/env'
import { login, logout, refresh, register } from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth.middleware'
import {
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  validationHook,
} from '../utils/validators'

const authRoutes = factory.createApp()

authRoutes.post(
  '/register',
  zValidator('json', registerSchema, validationHook),
  register
)

authRoutes.post(
  '/login',
  zValidator('json', loginSchema, validationHook),
  login
)

authRoutes.post(
  '/refresh',
  zValidator('json', refreshTokenSchema, validationHook),
  refresh
)

authRoutes.post('/logout', authenticate, logout)

export default authRoutes

