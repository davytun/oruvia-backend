import type { Context } from 'hono'
import type { AppEnv } from '../../config/env'
import {
  adminGetReportById,
  adminListReports,
  adminReviewReport,
} from '../../services/admin/report.service'
import { sendPaginated, sendSuccess } from '../../utils/response'
import {
  adminReportListQuerySchema,
  adminReviewReportSchema,
} from '../../utils/validators'

export async function adminListReportsHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const query = adminReportListQuerySchema.parse(c.req.query())
  const result = await adminListReports(db, query)
  return sendPaginated(c, result.items, result.pagination)
}

export async function adminGetReportByIdHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const reportId = c.req.param('id')!
  const report = await adminGetReportById(db, reportId)
  return sendSuccess(c, { report })
}

export async function adminReviewReportHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const admin = c.get('user')!
  const reportId = c.req.param('id')!
  const body = await c.req.json()
  const input = adminReviewReportSchema.parse(body)
  const report = await adminReviewReport(db, c.env, admin.id, reportId, input)
  return sendSuccess(c, { report })
}

