export interface SeekerProfile {
  id: string;
  fullName: string;
  email: string;
  isEmailVerified: boolean;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
