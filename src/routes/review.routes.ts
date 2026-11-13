import { zValidator } from '@hono/zod-validator'
import { factory } from '../config/env'
import { getListerReviewsHandler } from '../controllers/review.controller'
import { publicReviewListQuerySchema, validationHook } from '../utils/validators'

const publicReviewRoutes = factory.createApp()

publicReviewRoutes.get(
  '/listers/:listerType/:listerId/reviews',
  zValidator('query', publicReviewListQuerySchema, validationHook),
  getListerReviewsHandler
)

export default publicReviewRoutes

