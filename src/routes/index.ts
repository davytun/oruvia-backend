import { factory } from '../config/env'
import { healthCheck } from '../controllers/health.controller'
import adminRoutes from './admin'
import agentRoutes from './agent.routes'
import catalogRoutes from './catalog.routes'
import landlordRoutes from './landlord.routes'
import publicListingRoutes from './listing.routes'
import seekerRoutes from './seeker.routes'

const apiRoutes = factory.createApp()

apiRoutes.get('/health', healthCheck)
apiRoutes.route('/', catalogRoutes)
apiRoutes.route('/listings', publicListingRoutes)
apiRoutes.route('/seekers', seekerRoutes)
apiRoutes.route('/agents', agentRoutes)
apiRoutes.route('/landlords', landlordRoutes)
apiRoutes.route('/admins', adminRoutes)

export default apiRoutes
