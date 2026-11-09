import { createFactory } from 'hono/factory'
import type { Database } from '../database'
import type { AccountType } from './constants'

/**
 * Authenticated user attached to request context (`c.get('user')`)
 */
export interface AuthUser {
  id: string
  email: string
  accountType: AccountType
  tokenVersion: number
}

/**
 * Cloudflare Worker Bindings extended with environment secrets
 */
export type AppBindings = Omit<CloudflareBindings, 'APP_ENV'> & {
  APP_ENV?: string
  JWT_SECRET?: string
  JWT_EXPIRES_IN_SECONDS?: string
  BREVO_API_KEY?: string
  RESEND_API_KEY?: string
  R2_PUBLIC_URL?: string
}

/**
 * Request-scoped variables stored in Hono context (`c.var` / `c.get()`)
 */
export interface AppVariables {
  user?: AuthUser
  db: Database
  requestId: string
}

/**
 * Shared Hono App Environment
 */
export interface AppEnv {
  Bindings: AppBindings
  Variables: AppVariables
}

export const factory = createFactory<AppEnv>()
