import type { ListerVerificationStatus } from '../../kyc/kyc.constants.js';

export interface AgentProfile {
  id: string;
  fullName: string;
  email: string;
  isEmailVerified: boolean;
  emailVerifiedAt: Date | null;
  verificationStatus: ListerVerificationStatus;
  createdAt: Date;
  updatedAt: Date;
}
