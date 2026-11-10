import type { Context } from 'hono'
import type { AppEnv } from '../config/env'
import {
  getActivePropertyTypes,
  getActiveStatesWithCities,
} from '../services/catalog.service'
import { sendSuccess } from '../utils/response'
import type { PropertyCategory } from '../config/constants'

/**
 * GET /api/v1/locations
 * Returns active states with their active cities
 */
export async function getActiveLocationsHandler(c: Context<AppEnv>) {
  const result = await getActiveStatesWithCities(c.get('db'))
  return sendSuccess(c, result)
}

/**
 * GET /api/v1/property-types
 * Returns active Nigerian property types
 */
export async function getActivePropertyTypesHandler(c: Context<AppEnv>) {
  const category = c.req.query('category') as PropertyCategory | undefined
  const result = await getActivePropertyTypes(c.get('db'), category)
  return sendSuccess(c, result)
}

