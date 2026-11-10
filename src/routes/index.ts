import { factory } from '../config/env'
import { healthCheck } from '../controllers/health.controller'
import adminRoutes from './admin.routes'
import agentRoutes from './agent.routes'
import landlordRoutes from './landlord.routes'
import seekerRoutes from './seeker.routes'

const apiRoutes = factory.createApp()

apiRoutes.get('/health', healthCheck)
apiRoutes.route('/seekers', seekerRoutes)
apiRoutes.route('/agents', agentRoutes)
apiRoutes.route('/landlords', landlordRoutes)
apiRoutes.route('/admins', adminRoutes)

export default apiRoutes
