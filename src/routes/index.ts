import { factory } from '../config/env'
import { healthCheck } from '../controllers/health.controller'

const apiRoutes = factory.createApp()

apiRoutes.get('/health', healthCheck)

export default apiRoutes
