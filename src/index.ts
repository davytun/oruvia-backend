import { Scalar } from '@scalar/hono-api-reference'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { requestId } from 'hono/request-id'
import { secureHeaders } from 'hono/secure-headers'
import { type AppEnv, factory } from './config/env'
import { buildOpenApiSpec } from './config/openapi'
import { createDb, dbMiddleware } from './database'
import { errorHandler, notFoundHandler } from './middleware'
import apiRoutes from './routes'
import { processScheduledInspectionTasks } from './services/cron.service'
import { sendSuccess } from './utils/response'

const app = factory.createApp()

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:3000',
]

// Global Middlewares
app.use('*', requestId())
app.use('*', logger())
app.use('*', secureHeaders())
app.use(
  '*',
  cors({
    origin: (origin, c) => {
      if (!origin) return undefined

      if (ALLOWED_ORIGINS.includes(origin)) {
        return origin
      }

      const envFrontend = c.env?.FRONTEND_URL
      if (envFrontend && origin === envFrontend) {
        return origin
      }

      if (/^https:\/\/([a-z0-9-]+\.)?oruvia\.ng$/.test(origin)) {
        return origin
      }

      if (/^https:\/\/[a-z0-9-]+\.oruvia\.pages\.dev$/.test(origin)) {
        return origin
      }

      return undefined
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposeHeaders: ['Content-Length', 'X-Request-Id'],
    credentials: true,
    maxAge: 86400,
  })
)
app.use('*', prettyJSON())
app.use('*', dbMiddleware)

// Root status endpoint
app.get('/', (c) => {
  return sendSuccess(c, {
    name: c.env?.APP_NAME || 'Oruvia',
    tagline: 'Oruvia: Your path to a roof.',
    version: '1.0.0',
    docs_url: '/docs',
    openapi_url: '/openapi.json',
  })
})

// OpenAPI 3.1 JSON Spec
app.get('/openapi.json', (c) => {
  const origin = new URL(c.req.url).origin
  return c.json(buildOpenApiSpec(origin))
})

// Interactive Scalar API Reference UI at /docs
app.get(
  '/docs',
  Scalar({
    url: '/openapi.json',
    pageTitle: 'Oruvia API Reference',
    theme: 'kepler',
  })
)

// API v1 Routes
app.route('/api/v1', apiRoutes)

// Global Error & 404 Handlers
app.notFound(notFoundHandler)
app.onError(errorHandler)

export type AppType = typeof app

const worker = Object.assign(app, {
  async scheduled(
    _event: unknown,
    env: AppEnv['Bindings'],
    ctx: ExecutionContext
  ) {
    if (env.DB) {
      const db = createDb(env.DB)
      ctx.waitUntil(
        processScheduledInspectionTasks(db, env)
          .then((res) => {
            console.log(
              `[Cron] Hourly inspection tasks: ${res.remindersSent} reminders sent, ${res.expiredCount} expired.`
            )
          })
          .catch((err) => {
            console.error('[Cron] Error processing inspection tasks:', err)
          })
      )
    }
  },
})

export default worker
