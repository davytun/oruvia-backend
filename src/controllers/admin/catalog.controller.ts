import type { Context } from 'hono'
import type { AppEnv } from '../../config/env'
import {
  adminCreateCity,
  adminCreatePropertyType,
  adminCreateState,
  adminListCities,
  adminListPropertyTypes,
  adminListStates,
  adminUpdateCity,
  adminUpdatePropertyType,
  adminUpdateState,
} from '../../services/admin/catalog.service'
import { sendCreated, sendSuccess } from '../../utils/response'
import type {
  CityListQueryInput,
  CreateCityInput,
  CreatePropertyTypeInput,
  CreateStateInput,
  PropertyTypeListQueryInput,
  UpdateCityInput,
  UpdatePropertyTypeInput,
  UpdateStateInput,
} from '../../utils/validators'

// States
export async function adminListStatesHandler(c: Context<AppEnv>) {
  const result = await adminListStates(c.get('db'))
  return sendSuccess(c, result)
}

export async function adminCreateStateHandler(c: Context<AppEnv>) {
  const input = c.req.valid('json' as never) as CreateStateInput
  const result = await adminCreateState(c.get('db'), input)
  return sendCreated(c, result)
}

export async function adminUpdateStateHandler(c: Context<AppEnv>) {
  const id = c.req.param('id') as string
  const input = c.req.valid('json' as never) as UpdateStateInput
  const result = await adminUpdateState(c.get('db'), id, input)
  return sendSuccess(c, result)
}

// Cities
export async function adminListCitiesHandler(c: Context<AppEnv>) {
  const query = c.req.valid('query' as never) as CityListQueryInput
  const result = await adminListCities(c.get('db'), query)
  return sendSuccess(c, result)
}

export async function adminCreateCityHandler(c: Context<AppEnv>) {
  const input = c.req.valid('json' as never) as CreateCityInput
  const result = await adminCreateCity(c.get('db'), input)
  return sendCreated(c, result)
}

export async function adminUpdateCityHandler(c: Context<AppEnv>) {
  const id = c.req.param('id') as string
  const input = c.req.valid('json' as never) as UpdateCityInput
  const result = await adminUpdateCity(c.get('db'), id, input)
  return sendSuccess(c, result)
}

// Property Types
export async function adminListPropertyTypesHandler(c: Context<AppEnv>) {
  const query = c.req.valid('query' as never) as PropertyTypeListQueryInput
  const result = await adminListPropertyTypes(c.get('db'), query)
  return sendSuccess(c, result)
}

export async function adminCreatePropertyTypeHandler(c: Context<AppEnv>) {
  const input = c.req.valid('json' as never) as CreatePropertyTypeInput
  const result = await adminCreatePropertyType(c.get('db'), input)
  return sendCreated(c, result)
}

export async function adminUpdatePropertyTypeHandler(c: Context<AppEnv>) {
  const id = c.req.param('id') as string
  const input = c.req.valid('json' as never) as UpdatePropertyTypeInput
  const result = await adminUpdatePropertyType(c.get('db'), id, input)
  return sendSuccess(c, result)
}
