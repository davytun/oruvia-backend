import { UPLOAD_CONFIG } from '../config/constants'
import type { AppBindings } from '../config/env'
import { AppError, ValidationError } from '../utils/errors'

/**
 * Compute SHA-1 hex digest using Web Crypto API for Cloudinary upload signature
 */
async function sha1Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-1', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Validate an uploaded File from multipart/form-data
 */
export function validateUploadedFile(
  value: unknown,
  fieldName: string,
  required = true
): File | null {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw new ValidationError([
        {
          field: fieldName,
          issue: `${fieldName} file is required.`,
        },
      ])
    }
    return null
  }

  if (!(value instanceof File)) {
    throw new ValidationError([
      {
        field: fieldName,
        issue: `${fieldName} must be a valid file upload.`,
      },
    ])
  }

  if (value.size === 0) {
    throw new ValidationError([
      {
        field: fieldName,
        issue: `${fieldName} cannot be empty.`,
      },
    ])
  }

  if (value.size > UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES) {
    throw new ValidationError([
      {
        field: fieldName,
        issue: `${fieldName} must not exceed 5 MB.`,
      },
    ])
  }

  const allowedTypes = UPLOAD_CONFIG.ALLOWED_MIME_TYPES as readonly string[]
  if (!allowedTypes.includes(value.type)) {
    throw new ValidationError([
      {
        field: fieldName,
        issue: `${fieldName} must be a JPEG, PNG, WebP, or PDF file (received "${value.type || 'unknown'}").`,
      },
    ])
  }

  return value
}

/**
 * Upload a validated File to Cloudinary (with dev fallback when Cloudinary keys are unset)
 */
export async function uploadFileToCloudinary(
  env: AppBindings,
  file: File,
  folder: string
): Promise<string> {
  const cloudName = env.CLOUDINARY_CLOUD_NAME
  const apiKey = env.CLOUDINARY_API_KEY
  const apiSecret = env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    const safeName = (file.name || 'document')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .toLowerCase()
    const fallbackUrl = `https://res.cloudinary.com/oruvia-demo/image/upload/v1/${folder}/${Date.now()}_${safeName}`
    console.info(
      `[StorageService:Dev] Cloudinary credentials not set; returning simulated URL: ${fallbackUrl}`
    )
    return fallbackUrl
  }

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`
  const signature = await sha1Hex(paramsToSign)

  const formData = new FormData()
  formData.append('file', file)
  formData.append('api_key', apiKey)
  formData.append('timestamp', timestamp)
  formData.append('folder', folder)
  formData.append('signature', signature)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    {
      method: 'POST',
      body: formData,
    }
  )

  if (!response.ok) {
    const errText = await response.text()
    console.error(`[StorageService:Cloudinary] Upload failed: ${errText}`)
    throw new AppError(
      'Failed to upload verification document.',
      500,
      'INTERNAL_SERVER_ERROR'
    )
  }

  const result = (await response.json()) as { secure_url?: string }
  if (!result.secure_url) {
    throw new AppError(
      'Cloudinary did not return a secure document URL.',
      500,
      'INTERNAL_SERVER_ERROR'
    )
  }

  return result.secure_url
}
