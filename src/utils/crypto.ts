import { sign, verify } from 'hono/jwt'
import type { AuthUser } from '../config/env'

const PBKDF2_ITERATIONS = 100_000
const SALT_BYTE_LENGTH = 16
const KEY_BIT_LENGTH = 256
const DEFAULT_JWT_SECRET = 'oruvia-dev-jwt-secret-change-in-production'
const DEFAULT_JWT_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7 // 7 days

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

export interface JwtTokenPayload {
  id: string
  email: string
  iat: number
  exp: number
}

/**
 * Sign a JWT access token for an authenticated user
 */
export async function signAccessToken(
  user: AuthUser,
  secret: string = DEFAULT_JWT_SECRET,
  expiresInSeconds: number = DEFAULT_JWT_EXPIRES_IN_SECONDS
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    id: user.id,
    email: user.email,
    iat: now,
    exp: now + expiresInSeconds,
  }
  return sign(payload, secret, 'HS256')
}

/**
 * Verify and decode a JWT access token
 */
export async function verifyAccessToken(
  token: string,
  secret: string = DEFAULT_JWT_SECRET
): Promise<JwtTokenPayload> {
  const payload = await verify(token, secret, 'HS256')
  return {
    id: String(payload.id),
    email: String(payload.email),
    iat: Number(payload.iat),
    exp: Number(payload.exp),
  }
}
