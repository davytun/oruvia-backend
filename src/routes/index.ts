import { factory } from '../config/env'
import { healthCheck } from '../controllers/health.controller'
import agentRoutes from './agent.routes'
import landlordRoutes from './landlord.routes'
import seekerRoutes from './seeker.routes'

const apiRoutes = factory.createApp()

apiRoutes.get('/health', healthCheck)
apiRoutes.route('/seekers', seekerRoutes)
apiRoutes.route('/agents', agentRoutes)
apiRoutes.route('/landlords', landlordRoutes)

export default apiRoutes
