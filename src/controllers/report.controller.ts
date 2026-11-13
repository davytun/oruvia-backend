import type { Context } from 'hono'
import type { AppEnv } from '../config/env'
import {
  createReport,
  listMyReports,
  type ReporterRole,
} from '../services/report.service'
import { sendCreated, sendPaginated } from '../utils/response'
import {
  createReportSchema,
  myReportListQuerySchema,
} from '../utils/validators'

export async function listMyReportsHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const user = c.get('user')!
  const query = myReportListQuerySchema.parse(c.req.query())
  const result = await listMyReports(
    db,
    user.accountType as ReporterRole,
    user.id,
    query
  )
  return sendPaginated(c, result.items, result.pagination)
}

export async function createReportHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const user = c.get('user')!
  const body = await c.req.json()
  const input = createReportSchema.parse(body)
  const report = await createReport(
    db,
    user.accountType as ReporterRole,
    user.id,
    input
  )
  return sendCreated(c, { report })
}

