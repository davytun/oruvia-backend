import { and, asc, eq } from 'drizzle-orm'
import type { Database } from '../../database'
import {
  cities,
  propertyTypes,
  states,
  type City,
  type PropertyType,
  type State,
} from '../../models'
import { ConflictError, NotFoundError } from '../../utils/errors'
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * List all States (Admin)
 */
export async function adminListStates(db: Database): Promise<State[]> {
  return db.select().from(states).orderBy(asc(states.name))
}

/**
 * Create a new State (Admin)
 */
export async function adminCreateState(
  db: Database,
  input: CreateStateInput
): Promise<State> {
  const slug = input.slug ? slugify(input.slug) : slugify(input.name)

  const [existingName] = await db
    .select({ id: states.id })
    .from(states)
    .where(eq(states.name, input.name))
    .limit(1)

  if (existingName) {
    throw new ConflictError(`A state with the name "${input.name}" already exists.`)
  }

  const [existingSlug] = await db
    .select({ id: states.id })
    .from(states)
    .where(eq(states.slug, slug))
    .limit(1)

  if (existingSlug) {
    throw new ConflictError(`A state with the slug "${slug}" already exists.`)
  }

  const [created] = await db
    .insert(states)
    .values({
      name: input.name,
      slug,
      isActive: input.is_active ?? true,
    })
    .returning()

  return created
}

/**
 * Update a State (Admin)
 */
export async function adminUpdateState(
  db: Database,
  stateId: string,
  input: UpdateStateInput
): Promise<State> {
  const [existing] = await db
    .select()
    .from(states)
    .where(eq(states.id, stateId))
    .limit(1)

  if (!existing) {
    throw new NotFoundError('State not found.')
  }

  const updateFields: Partial<typeof states.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  }

  if (input.name !== undefined) {
    const [dup] = await db
      .select({ id: states.id })
      .from(states)
      .where(eq(states.name, input.name))
      .limit(1)
    if (dup && dup.id !== stateId) {
      throw new ConflictError(`A state with the name "${input.name}" already exists.`)
    }
    updateFields.name = input.name
  }

  if (input.slug !== undefined) {
    const slug = slugify(input.slug)
    const [dup] = await db
      .select({ id: states.id })
      .from(states)
      .where(eq(states.slug, slug))
      .limit(1)
    if (dup && dup.id !== stateId) {
      throw new ConflictError(`A state with the slug "${slug}" already exists.`)
    }
    updateFields.slug = slug
  }

  if (input.is_active !== undefined) {
    updateFields.isActive = input.is_active
  }

  const [updated] = await db
    .update(states)
    .set(updateFields)
    .where(eq(states.id, stateId))
    .returning()

  return updated
}

/**
 * List Cities (Admin)
 */
export async function adminListCities(
  db: Database,
  query: CityListQueryInput
): Promise<City[]> {
  const conditions = []
  if (query.state_id) {
    conditions.push(eq(cities.stateId, query.state_id))
  }
  if (query.is_active !== undefined) {
    conditions.push(eq(cities.isActive, query.is_active === 'true'))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined
  return db
    .select()
    .from(cities)
    .where(whereClause)
    .orderBy(asc(cities.name))
}

/**
 * Create a City within a State (Admin)
 */
export async function adminCreateCity(
  db: Database,
  input: CreateCityInput
): Promise<City> {
  const [parentState] = await db
    .select({ id: states.id })
    .from(states)
    .where(eq(states.id, input.state_id))
    .limit(1)

  if (!parentState) {
    throw new NotFoundError('Parent state not found.')
  }

  const slug = input.slug ? slugify(input.slug) : slugify(input.name)

  const [existingSlug] = await db
    .select({ id: cities.id })
    .from(cities)
    .where(and(eq(cities.stateId, input.state_id), eq(cities.slug, slug)))
    .limit(1)

  if (existingSlug) {
    throw new ConflictError(
      `A city with the slug "${slug}" already exists in this state.`
    )
  }

  const [created] = await db
    .insert(cities)
    .values({
      stateId: input.state_id,
      name: input.name,
      slug,
      isActive: input.is_active ?? true,
    })
    .returning()

  return created
}

/**
 * Update a City (Admin)
 */
export async function adminUpdateCity(
  db: Database,
  cityId: string,
  input: UpdateCityInput
): Promise<City> {
  const [existing] = await db
    .select()
    .from(cities)
    .where(eq(cities.id, cityId))
    .limit(1)

  if (!existing) {
    throw new NotFoundError('City not found.')
  }

  const updateFields: Partial<typeof cities.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  }

  if (input.name !== undefined) {
    updateFields.name = input.name
  }

  if (input.slug !== undefined) {
    const slug = slugify(input.slug)
    const [dup] = await db
      .select({ id: cities.id })
      .from(cities)
      .where(and(eq(cities.stateId, existing.stateId), eq(cities.slug, slug)))
      .limit(1)
    if (dup && dup.id !== cityId) {
      throw new ConflictError(
        `A city with the slug "${slug}" already exists in this state.`
      )
    }
    updateFields.slug = slug
  }

  if (input.is_active !== undefined) {
    updateFields.isActive = input.is_active
  }

  const [updated] = await db
    .update(cities)
    .set(updateFields)
    .where(eq(cities.id, cityId))
    .returning()

  return updated
}

/**
 * List Property Types (Admin)
 */
export async function adminListPropertyTypes(
  db: Database,
  query: PropertyTypeListQueryInput
): Promise<PropertyType[]> {
  const conditions = []
  if (query.category) {
    conditions.push(eq(propertyTypes.category, query.category))
  }
  if (query.is_active !== undefined) {
    conditions.push(eq(propertyTypes.isActive, query.is_active === 'true'))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined
  return db
    .select()
    .from(propertyTypes)
    .where(whereClause)
    .orderBy(asc(propertyTypes.displayOrder), asc(propertyTypes.name))
}

/**
 * Create a Nigerian Property Type (Admin)
 */
export async function adminCreatePropertyType(
  db: Database,
  input: CreatePropertyTypeInput
): Promise<PropertyType> {
  const slug = slugify(input.slug).replace(/-/g, '_')

  const [existing] = await db
    .select({ id: propertyTypes.id })
    .from(propertyTypes)
    .where(eq(propertyTypes.slug, slug))
    .limit(1)

  if (existing) {
    throw new ConflictError(`A property type with slug "${slug}" already exists.`)
  }

  const [created] = await db
    .insert(propertyTypes)
    .values({
      slug,
      name: input.name,
      category: input.category,
      description: input.description ?? null,
      defaultBedrooms: input.default_bedrooms ?? null,
      displayOrder: input.display_order ?? 0,
      isActive: input.is_active ?? true,
    })
    .returning()

  return created
}

/**
 * Update a Property Type (Admin)
 */
export async function adminUpdatePropertyType(
  db: Database,
  typeId: string,
  input: UpdatePropertyTypeInput
): Promise<PropertyType> {
  const [existing] = await db
    .select()
    .from(propertyTypes)
    .where(eq(propertyTypes.id, typeId))
    .limit(1)

  if (!existing) {
    throw new NotFoundError('Property type not found.')
  }

  const updateFields: Partial<typeof propertyTypes.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  }

  if (input.name !== undefined) updateFields.name = input.name
  if (input.category !== undefined) updateFields.category = input.category
  if (input.description !== undefined) updateFields.description = input.description
  if (input.default_bedrooms !== undefined)
    updateFields.defaultBedrooms = input.default_bedrooms
  if (input.display_order !== undefined)
    updateFields.displayOrder = input.display_order
  if (input.is_active !== undefined) updateFields.isActive = input.is_active

  const [updated] = await db
    .update(propertyTypes)
    .set(updateFields)
    .where(eq(propertyTypes.id, typeId))
    .returning()

  return updated
}
