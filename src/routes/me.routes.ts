import { zValidator } from '@hono/zod-validator'
import { factory } from '../config/env'
import {
  activateAgent,
  activateLandlord,
  changePassword,
  editAgent,
  editLandlord,
  getMe,
  updateMe,
} from '../controllers/me.controller'
import { authenticate } from '../middleware/auth.middleware'
import {
  agentProfileSchema,
  changePasswordSchema,
  landlordProfileSchema,
  updateMeSchema,
  validationHook,
} from '../utils/validators'

const meRoutes = factory.createApp()

meRoutes.use('*', authenticate)

meRoutes.get('/', getMe)

meRoutes.patch(
  '/',
  zValidator('json', updateMeSchema, validationHook),
  updateMe
)

meRoutes.patch(
  '/password',
  zValidator('json', changePasswordSchema, validationHook),
  changePassword
)

meRoutes.post(
  '/agent',
  zValidator('json', agentProfileSchema, validationHook),
  activateAgent
)

meRoutes.patch(
  '/agent',
  zValidator('json', agentProfileSchema, validationHook),
  editAgent
)

meRoutes.post(
  '/landlord',
  zValidator('json', landlordProfileSchema, validationHook),
  activateLandlord
)

meRoutes.patch(
  '/landlord',
  zValidator('json', landlordProfileSchema, validationHook),
  editLandlord
)

export default meRoutes

