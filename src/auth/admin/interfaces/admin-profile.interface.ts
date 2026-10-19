import type { AdminStatus } from '../entities/admin-user.entity.js';

export interface AdminProfile {
  id: string;
  fullName: string;
  email: string;
  status: AdminStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
