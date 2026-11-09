import { BadRequestError } from '../utils/errors'

export type StorageFolder =
  | 'properties/images'
  | 'properties/videos'
  | 'verification/documents'
  | 'avatars'

export interface UploadResult {
  key: string
  url: string
  contentType: string
  size: number
}

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
]

export const ALLOWED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
]

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]

/**
 * Storage Service: validates and manages media uploads in Cloudflare R2
 */
export function validateMediaFile(
  file: File,
  allowedMimeTypes: string[],
  maxSizeBytes: number
): void {
  if (!allowedMimeTypes.includes(file.type)) {
    throw new BadRequestError(
      `Unsupported file type "${file.type}". Allowed types: ${allowedMimeTypes.join(', ')}`
    )
  }

  if (file.size > maxSizeBytes) {
    const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(1)
    throw new BadRequestError(
      `File exceeds maximum allowed size of ${maxMb} MB`
    )
  }
}

export async function uploadFileToR2(
  bucket: R2Bucket,
  file: File,
  folder: StorageFolder,
  publicBaseUrl = ''
): Promise<UploadResult> {
  const extension = file.name.includes('.')
    ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    : ''
  const key = `${folder}/${crypto.randomUUID()}${extension}`

  const arrayBuffer = await file.arrayBuffer()
  await bucket.put(key, arrayBuffer, {
    httpMetadata: {
      contentType: file.type || 'application/octet-stream',
    },
  })

  const normalizedBase = publicBaseUrl.replace(/\/$/, '')
  const url = normalizedBase ? `${normalizedBase}/${key}` : `/media/${key}`

  return {
    key,
    url,
    contentType: file.type || 'application/octet-stream',
    size: file.size,
  }
}

export async function deleteFileFromR2(
  bucket: R2Bucket,
  key: string
): Promise<void> {
  await bucket.delete(key)
}

