import { factory } from '../../config/env'
import adminAuthRoutes from './auth.routes'
import adminCatalogRoutes from './catalog.routes'
import adminInquiryRoutes from './inquiry.routes'
import adminInspectionRoutes from './inspection.routes'
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
adminRoutes.route('/inspections', adminInspectionRoutes)
adminRoutes.route('/inquiries', adminInquiryRoutes)

export default adminRoutes
