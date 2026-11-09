import type { Context } from 'hono'
import type { AppEnv } from '../config/env'
import { getHealthStatus } from '../services/health.service'
import { sendSuccess } from '../utils/response'

export function healthCheck(c: Context<AppEnv>) {
  const status = getHealthStatus(c.env)
  return sendSuccess(c, status)
}
