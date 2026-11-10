import { and, asc, eq } from 'drizzle-orm'
import type { Database } from '../database'
import {
  cities,
  propertyTypes,
  states,
  type City,
  type PropertyType,
  type State,
} from '../models'
import type { PropertyCategory } from '../config/constants'

export interface StateWithCities extends State {
  cities: City[]
}

/**
 * Get all active States with their active Cities (public lookups)
 */
export async function getActiveStatesWithCities(
  db: Database
): Promise<StateWithCities[]> {
  const activeStates = await db
    .select()
    .from(states)
    .where(eq(states.isActive, true))
    .orderBy(asc(states.name))

  const activeCities = await db
    .select()
    .from(cities)
    .where(eq(cities.isActive, true))
    .orderBy(asc(cities.name))

  const citiesByStateId = new Map<string, City[]>()
  for (const city of activeCities) {
    const list = citiesByStateId.get(city.stateId) || []
    list.push(city)
    citiesByStateId.set(city.stateId, list)
  }

  return activeStates.map((st) => ({
    ...st,
    cities: citiesByStateId.get(st.id) || [],
  }))
}

/**
 * Get all active Nigerian Property Types (optionally filtered by category)
 */
export async function getActivePropertyTypes(
  db: Database,
  category?: PropertyCategory
): Promise<PropertyType[]> {
  const conditions = [eq(propertyTypes.isActive, true)]
  if (category) {
    conditions.push(eq(propertyTypes.category, category))
  }

  return db
    .select()
    .from(propertyTypes)
    .where(and(...conditions))
    .orderBy(asc(propertyTypes.displayOrder), asc(propertyTypes.name))
}
