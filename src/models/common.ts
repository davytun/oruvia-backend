import { text } from 'drizzle-orm/sqlite-core'

/**
 * Reusable primary key UUID column for SQLite / Cloudflare D1 tables
 */
export const idColumn = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID())

/**
 * Reusable created_at and updated_at ISO timestamp columns
 */
export const timestamps = {
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString())
    .$onUpdateFn(() => new Date().toISOString()),
}

