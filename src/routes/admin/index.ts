import { factory } from '../../config/env'
import adminAuthRoutes from './auth.routes'
import adminCatalogRoutes from './catalog.routes'
import adminInquiryRoutes from './inquiry.routes'
import adminInspectionRoutes from './inspection.routes'
import adminKycRoutes from './kyc.routes'
import adminListingRoutes from './listing.routes'
import adminPropertyVerificationRoutes from './property-verification.routes'
import adminReviewRoutes from './review.routes'

/**
 * Root Admin Router (`/api/v1/admins`)
 * Links all modular Admin sub-routers together under `/api/v1/admins`
 */
const adminRoutes = factory.createApp()

adminRoutes.route('/', adminAuthRoutes)
adminRoutes.route('/kyc', adminKycRoutes)
adminRoutes.route('/', adminCatalogRoutes)
adminRoutes.route('/listings', adminListingRoutes)
adminRoutes.route('/property-verifications', adminPropertyVerificationRoutes)
adminRoutes.route('/inspections', adminInspectionRoutes)
adminRoutes.route('/inquiries', adminInquiryRoutes)
adminRoutes.route('/reviews', adminReviewRoutes)

export default adminRoutes
