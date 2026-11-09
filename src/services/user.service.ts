import { and, eq, isNull, ne } from 'drizzle-orm'
import type { Database } from '../database'
import {
  admins,
  agents,
  landlords,
  seekers,
  sessions,
  users,
  type Admin,
  type Agent,
  type Landlord,
  type Seeker,
  type User,
} from '../models'
import { hashPassword, verifyPassword } from '../utils/crypto'
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors'
import type {
  AgentProfileInput,
  ChangePasswordInput,
  LandlordProfileInput,
  UpdateMeInput,
} from '../utils/validators'

export function formatPublicUser(
  user: User,
  roleRecords: {
    seeker: Seeker | null
    agent: Agent | null
    landlord: Landlord | null
    admin: Admin | null
  }
) {
  return {
    id: user.id,
    full_name: user.fullName,
    email: user.email,
    phone: user.phone,
    avatar_url: user.avatarUrl,
    email_verified_at: user.emailVerifiedAt,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
    profiles: {
      seeker: roleRecords.seeker
        ? {
            id: roleRecords.seeker.id,
            preferred_location: roleRecords.seeker.preferredLocation,
            created_at: roleRecords.seeker.createdAt,
          }
        : null,
      agent: roleRecords.agent
        ? {
            id: roleRecords.agent.id,
            agency_name: roleRecords.agent.agencyName,
            license_number: roleRecords.agent.licenseNumber,
            bio: roleRecords.agent.bio,
            whatsapp_number: roleRecords.agent.whatsappNumber,
            is_verified: roleRecords.agent.isVerified,
            verification_status: roleRecords.agent.verificationStatus,
            created_at: roleRecords.agent.createdAt,
          }
        : null,
      landlord: roleRecords.landlord
        ? {
            id: roleRecords.landlord.id,
            company_name: roleRecords.landlord.companyName,
            bio: roleRecords.landlord.bio,
            whatsapp_number: roleRecords.landlord.whatsappNumber,
            is_verified: roleRecords.landlord.isVerified,
            verification_status: roleRecords.landlord.verificationStatus,
            created_at: roleRecords.landlord.createdAt,
          }
        : null,
      admin: roleRecords.admin
        ? {
            id: roleRecords.admin.id,
            created_at: roleRecords.admin.createdAt,
          }
        : null,
    },
  }
}

export async function getUserWithProfiles(db: Database, userId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) {
    throw new NotFoundError('User')
  }

  const [seekerRows, agentRows, landlordRows, adminRows] = await Promise.all([
    db.select().from(seekers).where(eq(seekers.userId, userId)).limit(1),
    db.select().from(agents).where(eq(agents.userId, userId)).limit(1),
    db.select().from(landlords).where(eq(landlords.userId, userId)).limit(1),
    db.select().from(admins).where(eq(admins.userId, userId)).limit(1),
  ])

  return formatPublicUser(user, {
    seeker: seekerRows[0] || null,
    agent: agentRows[0] || null,
    landlord: landlordRows[0] || null,
    admin: adminRows[0] || null,
  })
}

export async function updateMyProfile(
  db: Database,
  userId: string,
  input: UpdateMeInput
) {
  const now = new Date().toISOString()

  if (
    input.full_name !== undefined ||
    input.phone !== undefined ||
    input.avatar_url !== undefined
  ) {
    await db
      .update(users)
      .set({
        ...(input.full_name !== undefined ? { fullName: input.full_name } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.avatar_url !== undefined ? { avatarUrl: input.avatar_url } : {}),
        updatedAt: now,
      })
      .where(eq(users.id, userId))
  }

  if (input.preferred_location !== undefined) {
    await db
      .update(seekers)
      .set({
        preferredLocation: input.preferred_location,
        updatedAt: now,
      })
      .where(eq(seekers.userId, userId))
  }

  return getUserWithProfiles(db, userId)
}

export async function changeMyPassword(
  db: Database,
  userId: string,
  currentSessionId: string,
  input: ChangePasswordInput
) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) {
    throw new NotFoundError('User')
  }

  const isCurrentValid = await verifyPassword(
    input.current_password,
    user.passwordHash
  )
  if (!isCurrentValid) {
    throw new UnauthorizedError('Current password is incorrect.', [
      { field: 'current_password', issue: 'Current password is incorrect.' },
    ])
  }

  const newPasswordHash = await hashPassword(input.new_password)
  const now = new Date().toISOString()

  await db
    .update(users)
    .set({
      passwordHash: newPasswordHash,
      updatedAt: now,
    })
    .where(eq(users.id, userId))

  // Revoke all other active sessions for this user
  await db
    .update(sessions)
    .set({ revokedAt: now, updatedAt: now })
    .where(
      and(
        eq(sessions.userId, userId),
        ne(sessions.id, currentSessionId),
        isNull(sessions.revokedAt)
      )
    )

  return { updated: true }
}

export async function createAgentProfile(
  db: Database,
  userId: string,
  input: AgentProfileInput
) {
  const [existing] = await db
    .select({ id: agents.id })
    .from(agents)
    .where(eq(agents.userId, userId))
    .limit(1)

  if (existing) {
    throw new ConflictError('Agent profile already exists for this account.', [
      {
        field: 'role',
        issue: 'Agent profile already exists for this account.',
      },
    ])
  }

  await db.insert(agents).values({
    userId,
    agencyName: input.agency_name ?? null,
    licenseNumber: input.license_number ?? null,
    bio: input.bio ?? null,
    whatsappNumber: input.whatsapp_number ?? null,
  })

  return getUserWithProfiles(db, userId)
}

export async function updateAgentProfile(
  db: Database,
  userId: string,
  input: AgentProfileInput
) {
  const [existing] = await db
    .select({ id: agents.id })
    .from(agents)
    .where(eq(agents.userId, userId))
    .limit(1)

  if (!existing) {
    throw new NotFoundError('Agent profile')
  }

  await db
    .update(agents)
    .set({
      ...(input.agency_name !== undefined
        ? { agencyName: input.agency_name }
        : {}),
      ...(input.license_number !== undefined
        ? { licenseNumber: input.license_number }
        : {}),
      ...(input.bio !== undefined ? { bio: input.bio } : {}),
      ...(input.whatsapp_number !== undefined
        ? { whatsappNumber: input.whatsapp_number }
        : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(agents.userId, userId))

  return getUserWithProfiles(db, userId)
}

export async function createLandlordProfile(
  db: Database,
  userId: string,
  input: LandlordProfileInput
) {
  const [existing] = await db
    .select({ id: landlords.id })
    .from(landlords)
    .where(eq(landlords.userId, userId))
    .limit(1)

  if (existing) {
    throw new ConflictError(
      'Landlord profile already exists for this account.',
      [
        {
          field: 'role',
          issue: 'Landlord profile already exists for this account.',
        },
      ]
    )
  }

  await db.insert(landlords).values({
    userId,
    companyName: input.company_name ?? null,
    bio: input.bio ?? null,
    whatsappNumber: input.whatsapp_number ?? null,
  })

  return getUserWithProfiles(db, userId)
}

export async function updateLandlordProfile(
  db: Database,
  userId: string,
  input: LandlordProfileInput
) {
  const [existing] = await db
    .select({ id: landlords.id })
    .from(landlords)
    .where(eq(landlords.userId, userId))
    .limit(1)

  if (!existing) {
    throw new NotFoundError('Landlord profile')
  }

  await db
    .update(landlords)
    .set({
      ...(input.company_name !== undefined
        ? { companyName: input.company_name }
        : {}),
      ...(input.bio !== undefined ? { bio: input.bio } : {}),
      ...(input.whatsapp_number !== undefined
        ? { whatsappNumber: input.whatsapp_number }
        : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(landlords.userId, userId))

  return getUserWithProfiles(db, userId)
}

