import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1'
import * as schema from '../models'
import { factory } from '../config/env'

export type Database = DrizzleD1Database<typeof schema>

/**
 * Create a Drizzle ORM instance bound to Cloudflare D1
 */
export function createDb(d1: D1Database): Database {
  return drizzle(d1, { schema })
}

/**
 * Middleware that attaches the Drizzle D1 instance to `c.var.db`
 */
export const dbMiddleware = factory.createMiddleware(async (c, next) => {
  if (c.env?.DB) {
    c.set('db', createDb(c.env.DB))
  }
  await next()
})
