/**
 * Shared KYC constants and types for lister identity verification
 * (Agents and Landlords). See docs/kyc-module.md for the full spec.
 */

export type ListerVerificationStatus =
  | 'unverified'
  | 'pending'
  | 'approved'
  | 'rejected';

export type KycSubmissionStatus = 'pending' | 'approved' | 'rejected';

export type KycDocumentType =
  | 'NIN_SLIP'
  | 'DRIVERS_LICENSE'
  | 'INTERNATIONAL_PASSPORT'
  | 'OTHER_GOVERNMENT_ID';

export const KYC_DOCUMENT_TYPES: readonly KycDocumentType[] = [
  'NIN_SLIP',
  'DRIVERS_LICENSE',
  'INTERNATIONAL_PASSPORT',
  'OTHER_GOVERNMENT_ID',
] as const;

/** Maximum submission attempts per account before submissions are locked. */
export const KYC_MAX_ATTEMPTS = 3;

/** Uploaded identity documents are images only, capped at 5 MB. */
export const KYC_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const KYC_ALLOWED_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

/** Extension whitelist applied to the validated MIME type of the upload. */
export const KYC_MIME_EXTENSIONS: ReadonlyMap<string, string> = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

/** Shape of `GET /{role}/kyc` — drives the in-app verification banner. */
export interface KycStatusResponse {
  verificationStatus: ListerVerificationStatus;
  activeSubmission: {
    id: string;
    documentType: KycDocumentType;
    status: KycSubmissionStatus;
    attempt: number;
    submittedAt: Date;
    reviewedAt: Date | null;
    rejectionReason: string | null;
  } | null;
  /** Present when the most recent submission was rejected. */
  lastRejection: {
    reason: string | null;
    rejectedAt: Date | null;
  } | null;
  attemptsUsed: number;
  maxAttempts: number;
}
