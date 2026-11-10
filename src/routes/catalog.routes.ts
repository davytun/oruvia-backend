import { factory } from '../config/env'
import {
  getActiveLocationsHandler,
  getActivePropertyTypesHandler,
} from '../controllers/catalog.controller'

const catalogRoutes = factory.createApp()

catalogRoutes.get('/locations', getActiveLocationsHandler)
catalogRoutes.get('/property-types', getActivePropertyTypesHandler)

export default catalogRoutes

