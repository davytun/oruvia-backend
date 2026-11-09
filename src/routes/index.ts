import { factory } from '../config/env'
import { healthCheck } from '../controllers/health.controller'
import authRoutes from './auth.routes'
import meRoutes from './me.routes'

const apiRoutes = factory.createApp()

apiRoutes.get('/health', healthCheck)
apiRoutes.route('/auth', authRoutes)
apiRoutes.route('/me', meRoutes)

export default apiRoutes
