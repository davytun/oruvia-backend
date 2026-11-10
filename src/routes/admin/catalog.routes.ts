import { zValidator } from '@hono/zod-validator'
import { factory } from '../../config/env'
import {
  adminCreateCityHandler,
  adminCreatePropertyTypeHandler,
  adminCreateStateHandler,
  adminListCitiesHandler,
  adminListPropertyTypesHandler,
  adminListStatesHandler,
  adminUpdateCityHandler,
  adminUpdatePropertyTypeHandler,
  adminUpdateStateHandler,
} from '../../controllers/admin/catalog.controller'
import { authenticateAdmin } from '../../middleware'
import {
  cityListQuerySchema,
  createCitySchema,
  createPropertyTypeSchema,
  createStateSchema,
  idParamSchema,
  propertyTypeListQuerySchema,
  updateCitySchema,
  updatePropertyTypeSchema,
  updateStateSchema,
  validationHook,
} from '../../utils/validators'

const adminCatalogRoutes = factory.createApp()

adminCatalogRoutes.use('*', authenticateAdmin)

// States
adminCatalogRoutes.get('/locations/states', adminListStatesHandler)
adminCatalogRoutes.post(
  '/locations/states',
  zValidator('json', createStateSchema, validationHook),
  adminCreateStateHandler
)
adminCatalogRoutes.patch(
  '/locations/states/:id',
  zValidator('param', idParamSchema, validationHook),
  zValidator('json', updateStateSchema, validationHook),
  adminUpdateStateHandler
)

// Cities
adminCatalogRoutes.get(
  '/locations/cities',
  zValidator('query', cityListQuerySchema, validationHook),
  adminListCitiesHandler
)
adminCatalogRoutes.post(
  '/locations/cities',
  zValidator('json', createCitySchema, validationHook),
  adminCreateCityHandler
)
adminCatalogRoutes.patch(
  '/locations/cities/:id',
  zValidator('param', idParamSchema, validationHook),
  zValidator('json', updateCitySchema, validationHook),
  adminUpdateCityHandler
)

// Property Types
adminCatalogRoutes.get(
  '/property-types',
  zValidator('query', propertyTypeListQuerySchema, validationHook),
  adminListPropertyTypesHandler
)
adminCatalogRoutes.post(
  '/property-types',
  zValidator('json', createPropertyTypeSchema, validationHook),
  adminCreatePropertyTypeHandler
)
adminCatalogRoutes.patch(
  '/property-types/:id',
  zValidator('param', idParamSchema, validationHook),
  zValidator('json', updatePropertyTypeSchema, validationHook),
  adminUpdatePropertyTypeHandler
)

export default adminCatalogRoutes

