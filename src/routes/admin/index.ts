import { factory } from '../../config/env'
import adminAuthRoutes from './auth.routes'
import adminCatalogRoutes from './catalog.routes'
import adminKycRoutes from './kyc.routes'
import adminListingRoutes from './listing.routes'

/**
 * Root Admin Router (`/api/v1/admins`)
 * Links all modular Admin sub-routers together under `/api/v1/admins`
 */
const adminRoutes = factory.createApp()

adminRoutes.route('/', adminAuthRoutes)
adminRoutes.route('/kyc', adminKycRoutes)
adminRoutes.route('/', adminCatalogRoutes)
adminRoutes.route('/listings', adminListingRoutes)

export default adminRoutes
