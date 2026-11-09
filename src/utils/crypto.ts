import { sign, verify } from 'hono/jwt'
import { AUTH_CONFIG } from '../config/constants'
import { AppError } from './errors'

// Cloudflare Workers caps PBKDF2 at 100,000 iterations.
const PBKDF2_ITERATIONS = 100_000
const SALT_BYTE_LENGTH = 16
const KEY_BIT_LENGTH = 256

/**
 * Dummy PBKDF2 hash verified when a login email does not exist,
 * preventing timing-based email enumeration.
 */
export const DUMMY_PASSWORD_HASH = `pbkdf2_sha256$${PBKDF2_ITERATIONS}$${'0'.repeat(32)}$${'0'.repeat(64)}`

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i]
  }
  return diff === 0
}

/**
 * Hash a plaintext password using Web Crypto PBKDF2-SHA256
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTE_LENGTH))
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_BIT_LENGTH
  )

  const hashBytes = new Uint8Array(derivedBits)
  return `pbkdf2_sha256$${PBKDF2_ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(hashBytes)}`
}

/**
 * Verify a plaintext password against a stored PBKDF2-SHA256 hash
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const parts = storedHash.split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2_sha256') {
    return false
  }

  const iterations = parseInt(parts[1], 10)
  if (
    !Number.isInteger(iterations) ||
    iterations < 1 ||
    iterations > PBKDF2_ITERATIONS
  ) {
    return false
  }

  const salt = hexToBytes(parts[2])
  const expectedHash = hexToBytes(parts[3])

  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    expectedHash.length * 8
  )

  return timingSafeEqual(new Uint8Array(derivedBits), expectedHash)
}

/**
 * Generate a cryptographically random hex token (for refresh tokens)
 */
export function generateRandomToken(byteLength = 32): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(byteLength)))
}

/**
 * Compute SHA-256 hex digest of a token or code
 */
export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value)
  )
  return bytesToHex(new Uint8Array(digest))
}

export interface JwtTokenPayload {
  sub: string
  email: string
  sid: string
  iat: number
  exp: number
}

function resolveJwtSecret(secret?: string): string {
  if (!secret || secret.trim().length < 16) {
    throw new AppError(
      'Server authentication secret is not configured.',
      500,
      'INTERNAL_SERVER_ERROR'
    )
  }
  return secret
}

/**
 * Sign a short-lived JWT access token
 */
export async function signAccessToken(
  input: { userId: string; email: string; sessionId: string },
  secret?: string,
  expiresInSeconds: number = AUTH_CONFIG.ACCESS_TOKEN_TTL_SECONDS
): Promise<string> {
  const validSecret = resolveJwtSecret(secret)
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    sub: input.userId,
    email: input.email,
    sid: input.sessionId,
    iat: now,
    exp: now + expiresInSeconds,
  }
  return sign(payload, validSecret, 'HS256')
}

/**
 * Verify and decode a JWT access token
 */
export async function verifyAccessToken(
  token: string,
  secret?: string
): Promise<JwtTokenPayload> {
  const validSecret = resolveJwtSecret(secret)
  const payload = await verify(token, validSecret, 'HS256')
  if (
    typeof payload.sub !== 'string' ||
    typeof payload.email !== 'string' ||
    typeof payload.sid !== 'string'
  ) {
    throw new Error('Malformed access token payload')
  }

  return {
    sub: payload.sub,
    email: payload.email,
    sid: payload.sid,
    iat: Number(payload.iat),
    exp: Number(payload.exp),
  }
}
