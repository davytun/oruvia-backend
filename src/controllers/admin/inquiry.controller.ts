import type { Context } from 'hono'
import type { AppEnv } from '../../config/env'
import {
  adminGetInquiryById,
  adminListInquiries,
} from '../../services/admin/inquiry.service'
import { sendPaginated, sendSuccess } from '../../utils/response'
import type { AdminInquiryQueryInput } from '../../utils/validators'

/**
 * Admin: List platform-wide property inquiries (read-only)
 */
export async function adminListInquiriesHandler(c: Context<AppEnv>) {
  const query = c.req.valid('query' as never) as AdminInquiryQueryInput
  const result = await adminListInquiries(c.get('db'), query)
  return sendPaginated(c, result.items, {
    page: result.page,
    per_page: result.perPage,
    total_records: result.total,
  })
}

/**
 * Admin: Get full inquiry conversation and messages (read-only)
 */
export async function adminGetInquiryByIdHandler(c: Context<AppEnv>) {
  const id = c.req.param('id') as string
  const result = await adminGetInquiryById(c.get('db'), id)
  return sendSuccess(c, result)
}

