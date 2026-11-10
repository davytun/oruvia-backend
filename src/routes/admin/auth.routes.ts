import { zValidator } from '@hono/zod-validator'
import { factory } from '../../config/env'
import {
  changeAdminPasswordHandler,
  createAdminHandler,
  forgotAdminPasswordHandler,
  getAdminMeHandler,
  listAdminsHandler,
  loginAdminHandler,
  resetAdminPasswordHandler,
  updateAdminMeHandler,
  updateAdminSuspensionHandler,
} from '../../controllers/admin/auth.controller'
import { authenticateAdmin, requireSuperAdmin } from '../../middleware'
import {
  changePasswordSchema,
  createAdminSchema,
  forgotPasswordSchema,
  idParamSchema,
  loginSchema,
  paginationQuerySchema,
  resetPasswordSchema,
  updateAdminSchema,
  updateAdminSuspensionSchema,
  validationHook,
} from '../../utils/validators'

const adminAuthRoutes = factory.createApp()

// Public Admin Auth
adminAuthRoutes.post(
  '/login',
  zValidator('json', loginSchema, validationHook),
  loginAdminHandler
)
adminAuthRoutes.post(
  '/forgot-password',
  zValidator('json', forgotPasswordSchema, validationHook),
  forgotAdminPasswordHandler
)
adminAuthRoutes.post(
  '/reset-password',
  zValidator('json', resetPasswordSchema, validationHook),
  resetAdminPasswordHandler
)

// Authenticated Admin Profile & Password
adminAuthRoutes.post(
  '/change-password',
  authenticateAdmin,
  zValidator('json', changePasswordSchema, validationHook),
  changeAdminPasswordHandler
)
adminAuthRoutes.get('/me', authenticateAdmin, getAdminMeHandler)
adminAuthRoutes.patch(
  '/me',
  authenticateAdmin,
  zValidator('json', updateAdminSchema, validationHook),
  updateAdminMeHandler
)

// Super Admin Management of Admin Accounts
adminAuthRoutes.get(
  '/',
  authenticateAdmin,
  requireSuperAdmin,
  zValidator('query', paginationQuerySchema, validationHook),
  listAdminsHandler
)
adminAuthRoutes.post(
  '/',
  authenticateAdmin,
  requireSuperAdmin,
  zValidator('json', createAdminSchema, validationHook),
  createAdminHandler
)
adminAuthRoutes.patch(
  '/:id/status',
  authenticateAdmin,
  requireSuperAdmin,
  zValidator('param', idParamSchema, validationHook),
  zValidator('json', updateAdminSuspensionSchema, validationHook),
  updateAdminSuspensionHandler
)

export default adminAuthRoutes
