import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { requestId } from 'hono/request-id'
import { secureHeaders } from 'hono/secure-headers'
import { factory } from './config/env'
import { dbMiddleware } from './database'
import { errorHandler, notFoundHandler } from './middleware'
import apiRoutes from './routes'
import { sendSuccess } from './utils/response'

const app = factory.createApp()

// Global Middlewares
app.use('*', requestId())
app.use('*', logger())
app.use('*', secureHeaders())
app.use('*', cors())
app.use('*', prettyJSON())
app.use('*', dbMiddleware)

// Root status endpoint
app.get('/', (c) => {
  return sendSuccess(c, {
    name: c.env?.APP_NAME || 'Oruvia',
    tagline: 'Oruvia: Your path to a roof.',
    version: '1.0.0',
  })
})

// API v1 Routes
app.route('/api/v1', apiRoutes)

// Global Error & 404 Handlers
app.notFound(notFoundHandler)
app.onError(errorHandler)

export type AppType = typeof app
export default app
