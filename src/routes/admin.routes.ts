import { zValidator } from '@hono/zod-validator'
import { factory } from '../config/env'
import {
  changeAdminPasswordHandler,
  createAdminHandler,
  forgotAdminPasswordHandler,
  getAdminMeHandler,
  listAdminsHandler,
  listAgentKycHandler,
  listAgentsForAdminHandler,
  listLandlordKycHandler,
  listLandlordsForAdminHandler,
  listSeekersForAdminHandler,
  loginAdminHandler,
  resetAdminPasswordHandler,
  reviewAgentKycHandler,
  reviewLandlordKycHandler,
  updateAdminMeHandler,
  updateUserSuspensionHandler,
} from '../controllers/admin.controller'
import { authenticateAdmin } from '../middleware/auth.middleware'
import {
  changePasswordSchema,
  createAdminSchema,
  forgotPasswordSchema,
  idParamSchema,
  kycListQuerySchema,
  loginSchema,
  paginationQuerySchema,
  resetPasswordSchema,
  reviewKycSchema,
  updateAdminSchema,
  updateUserSuspensionSchema,
  userRoleParamSchema,
  validationHook,
} from '../utils/validators'

const adminRoutes = factory.createApp()

// Public Admin Auth Routes
adminRoutes.post(
  '/login',
  zValidator('json', loginSchema, validationHook),
  loginAdminHandler
)

adminRoutes.post(
  '/forgot-password',
  zValidator('json', forgotPasswordSchema, validationHook),
  forgotAdminPasswordHandler
)

adminRoutes.post(
  '/reset-password',
  zValidator('json', resetPasswordSchema, validationHook),
  resetAdminPasswordHandler
)

// Protected Admin Routes (Requires valid Admin Bearer JWT)
adminRoutes.post(
  '/',
  authenticateAdmin,
  zValidator('json', createAdminSchema, validationHook),
  createAdminHandler
)

adminRoutes.get(
  '/',
  authenticateAdmin,
  zValidator('query', paginationQuerySchema, validationHook),
  listAdminsHandler
)

adminRoutes.post(
  '/change-password',
  authenticateAdmin,
  zValidator('json', changePasswordSchema, validationHook),
  changeAdminPasswordHandler
)

adminRoutes.get('/me', authenticateAdmin, getAdminMeHandler)

adminRoutes.patch(
  '/me',
  authenticateAdmin,
  zValidator('json', updateAdminSchema, validationHook),
  updateAdminMeHandler
)

// Admin KYC Review Routes
adminRoutes.get(
  '/kyc/agents',
  authenticateAdmin,
  zValidator('query', kycListQuerySchema, validationHook),
  listAgentKycHandler
)

adminRoutes.patch(
  '/kyc/agents/:id/review',
  authenticateAdmin,
  zValidator('param', idParamSchema, validationHook),
  zValidator('json', reviewKycSchema, validationHook),
  reviewAgentKycHandler
)

adminRoutes.get(
  '/kyc/landlords',
  authenticateAdmin,
  zValidator('query', kycListQuerySchema, validationHook),
  listLandlordKycHandler
)

adminRoutes.patch(
  '/kyc/landlords/:id/review',
  authenticateAdmin,
  zValidator('param', idParamSchema, validationHook),
  zValidator('json', reviewKycSchema, validationHook),
  reviewLandlordKycHandler
)

// Admin User Management Routes
adminRoutes.get(
  '/users/seekers',
  authenticateAdmin,
  zValidator('query', paginationQuerySchema, validationHook),
  listSeekersForAdminHandler
)

adminRoutes.get(
  '/users/agents',
  authenticateAdmin,
  zValidator('query', paginationQuerySchema, validationHook),
  listAgentsForAdminHandler
)

adminRoutes.get(
  '/users/landlords',
  authenticateAdmin,
  zValidator('query', paginationQuerySchema, validationHook),
  listLandlordsForAdminHandler
)

adminRoutes.patch(
  '/users/:role/:id/status',
  authenticateAdmin,
  zValidator('param', userRoleParamSchema, validationHook),
  zValidator('json', updateUserSuspensionSchema, validationHook),
  updateUserSuspensionHandler
)

export default adminRoutes

