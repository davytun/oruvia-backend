import { zValidator } from '@hono/zod-validator'
import { factory } from '../../config/env'
import {
  getAgentKycByIdHandler,
  getLandlordKycByIdHandler,
  listAgentKycHandler,
  listLandlordKycHandler,
  reviewAgentKycHandler,
  reviewLandlordKycHandler,
} from '../../controllers/admin/kyc.controller'
import { authenticateAdmin } from '../../middleware'
import {
  idParamSchema,
  kycListQuerySchema,
  reviewKycSchema,
  validationHook,
} from '../../utils/validators'

const adminKycRoutes = factory.createApp()

// All KYC review routes require an authenticated Admin (`super_admin` or `admin`)
adminKycRoutes.use('*', authenticateAdmin)

// Agent KYC Verification
adminKycRoutes.get(
  '/agents',
  zValidator('query', kycListQuerySchema, validationHook),
  listAgentKycHandler
)
adminKycRoutes.get(
  '/agents/:id',
  zValidator('param', idParamSchema, validationHook),
  getAgentKycByIdHandler
)
adminKycRoutes.patch(
  '/agents/:id/review',
  zValidator('param', idParamSchema, validationHook),
  zValidator('json', reviewKycSchema, validationHook),
  reviewAgentKycHandler
)

// Landlord KYC Verification
adminKycRoutes.get(
  '/landlords',
  zValidator('query', kycListQuerySchema, validationHook),
  listLandlordKycHandler
)
adminKycRoutes.get(
  '/landlords/:id',
  zValidator('param', idParamSchema, validationHook),
  getLandlordKycByIdHandler
)
adminKycRoutes.patch(
  '/landlords/:id/review',
  zValidator('param', idParamSchema, validationHook),
  zValidator('json', reviewKycSchema, validationHook),
  reviewLandlordKycHandler
)

export default adminKycRoutes
