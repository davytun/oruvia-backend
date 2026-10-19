import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import type { DataSource, Repository } from 'typeorm';
import type { MailService } from '../../mail/mail.service.js';
import { AdminsService } from './admins.service.js';
import type { AdminUser } from './entities/admin-user.entity.js';
import type { AdminVerificationCode } from './entities/admin-verification-code.entity.js';

describe('AdminsService', () => {
  let service: AdminsService;
  let adminRepo: Partial<Record<keyof Repository<AdminUser>, any>>;
  let codeRepo: Partial<Record<keyof Repository<AdminVerificationCode>, any>>;
  let jwtService: Partial<Record<keyof JwtService, any>>;
  let mailService: Partial<Record<keyof MailService, any>>;
  let dataSource: Partial<Record<keyof DataSource, any>>;
  let configService: Partial<Record<keyof ConfigService, any>>;
  let mockManager: any;

  const testHmacSecret = 'super-secret-admin-jwt-key-for-dev-32chars';

  beforeEach(() => {
    adminRepo = {
      findOne: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn((entity) => ({
        ...entity,
        id: 'admin-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      save: vi.fn((entity) => Promise.resolve(entity)),
    };

    codeRepo = {
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn((entity) => ({
        ...entity,
        id: 'code-123',
        createdAt: new Date(),
      })),
      save: vi.fn((entity) => Promise.resolve(entity)),
      update: vi.fn().mockResolvedValue({ affected: 1 }),
    };

    jwtService = {
      signAsync: vi.fn().mockResolvedValue('jwt-admin-token'),
    };

    mailService = {
      sendPasswordResetCode: vi.fn().mockResolvedValue(undefined),
    };

    mockManager = {
      findOne: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
    };

    dataSource = {
      transaction: vi.fn((callback) => callback(mockManager)),
    };

    configService = {
      getOrThrow: vi.fn().mockReturnValue(testHmacSecret),
    };

    service = new AdminsService(
      adminRepo as any,
      codeRepo as any,
      jwtService as any,
      mailService as any,
      dataSource as any,
      configService as any,
    );
  });

  const generateTestHmacHash = (code: string) => {
    const salt = 'aabbccddeeff00112233445566778899';
    const hmac = crypto
      .createHmac('sha256', testHmacSecret)
      .update(`${salt}:${code}`)
      .digest('hex');
    return `${salt}:${hmac}`;
  };

  describe('provisionInitialAdmin', () => {
    it('creates active admin with hashed password and returns safe profile', async () => {
      adminRepo.findOne!.mockResolvedValue(null);

      const result = await service.provisionInitialAdmin({
        fullName: 'Platform Admin',
        email: 'Admin@Oruvia.COM',
        password: 'SecurePassword123!',
      });

      expect(adminRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'admin@oruvia.com' },
      });
      expect(adminRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Platform Admin',
          email: 'admin@oruvia.com',
          status: 'ACTIVE',
          tokenVersion: 0,
        }),
      );
      expect(adminRepo.save).toHaveBeenCalled();
      expect(result.email).toBe('admin@oruvia.com');
      expect(result.status).toBe('ACTIVE');
    });

    it('rejects duplicate email with ConflictException', async () => {
      adminRepo.findOne!.mockResolvedValue({ id: 'existing-id' });

      await expect(
        service.provisionInitialAdmin({
          fullName: 'Duplicate Admin',
          email: 'admin@oruvia.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('handles database unique violation 23505', async () => {
      adminRepo.findOne!.mockResolvedValue(null);
      adminRepo.save!.mockRejectedValue({ code: '23505' });

      await expect(
        service.provisionInitialAdmin({
          fullName: 'Race Admin',
          email: 'admin@oruvia.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('performs timing-safe check and rejects nonexistent admin with 401', async () => {
      adminRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'unknown@oruvia.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects incorrect password with 401', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword123!', 10);
      adminRepo.findOne!.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@oruvia.com',
        passwordHash,
        status: 'ACTIVE',
      });

      await expect(
        service.login({
          email: 'admin@oruvia.com',
          password: 'WrongPassword123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects inactive or suspended admin with 403 Forbidden', async () => {
      const password = 'CorrectPassword123!';
      const passwordHash = await bcrypt.hash(password, 10);
      adminRepo.findOne!.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@oruvia.com',
        passwordHash,
        status: 'SUSPENDED',
      });

      await expect(
        service.login({
          email: 'admin@oruvia.com',
          password,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('succeeds for active admin, updates lastLoginAt, and returns access token', async () => {
      const password = 'CorrectPassword123!';
      const passwordHash = await bcrypt.hash(password, 10);
      const admin = {
        id: 'admin-1',
        fullName: 'Root Admin',
        email: 'admin@oruvia.com',
        passwordHash,
        status: 'ACTIVE',
        tokenVersion: 1,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      adminRepo.findOne!.mockResolvedValue(admin);

      const result = await service.login({
        email: 'admin@oruvia.com',
        password,
      });

      expect(admin.lastLoginAt).toBeInstanceOf(Date);
      expect(adminRepo.save).toHaveBeenCalledWith(admin);
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'admin-1',
        email: 'admin@oruvia.com',
        tokenVersion: 1,
        accountType: 'admin',
      });
      expect(result.accessToken).toBe('jwt-admin-token');
      expect(result.admin.email).toBe('admin@oruvia.com');
    });
  });

  describe('changePassword', () => {
    it('rejects if admin is not found', async () => {
      adminRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.changePassword('missing-id', {
          currentPassword: 'old',
          newPassword: 'new',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects invalid current password with 400', async () => {
      const passwordHash = await bcrypt.hash('CorrectOldPassword123!', 10);
      adminRepo.findOne!.mockResolvedValue({
        id: 'admin-1',
        passwordHash,
      });

      await expect(
        service.changePassword('admin-1', {
          currentPassword: 'WrongOldPassword123!',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects identical new password with 400', async () => {
      const password = 'SamePassword123!';
      const passwordHash = await bcrypt.hash(password, 10);
      adminRepo.findOne!.mockResolvedValue({
        id: 'admin-1',
        passwordHash,
      });

      await expect(
        service.changePassword('admin-1', {
          currentPassword: password,
          newPassword: password,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates password and increments tokenVersion to revoke old sessions', async () => {
      const currentPassword = 'OldPassword123!';
      const passwordHash = await bcrypt.hash(currentPassword, 10);
      const admin = {
        id: 'admin-1',
        passwordHash,
        tokenVersion: 2,
      };
      adminRepo.findOne!.mockResolvedValue(admin);

      const result = await service.changePassword('admin-1', {
        currentPassword,
        newPassword: 'BrandNewPassword123!',
      });

      expect(admin.tokenVersion).toBe(3);
      expect(adminRepo.save).toHaveBeenCalledWith(admin);
      expect(result.message).toBe('Password changed successfully');
    });
  });

  describe('forgotPassword', () => {
    it('returns generic message without disclosing non-existence for unknown email', async () => {
      adminRepo.findOne!.mockResolvedValue(null);

      const result = await service.forgotPassword({
        email: 'ghost@oruvia.com',
      });

      expect(mailService.sendPasswordResetCode).not.toHaveBeenCalled();
      expect(result.message).toContain('If an account with that email exists');
    });

    it('returns generic message for inactive admin without sending code', async () => {
      adminRepo.findOne!.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@oruvia.com',
        status: 'INACTIVE',
      });

      const result = await service.forgotPassword({
        email: 'admin@oruvia.com',
      });

      expect(mailService.sendPasswordResetCode).not.toHaveBeenCalled();
      expect(result.message).toContain('If an account with that email exists');
    });

    it('sends reset code for active admin', async () => {
      adminRepo.findOne!.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@oruvia.com',
        status: 'ACTIVE',
      });

      const result = await service.forgotPassword({
        email: 'admin@oruvia.com',
      });

      expect(mailService.sendPasswordResetCode).toHaveBeenCalledWith(
        'admin@oruvia.com',
        expect.stringMatching(/^\d{6}$/),
        'admin',
      );
      expect(result.message).toContain('If an account with that email exists');
    });

    it('enforces 60-second cooldown', async () => {
      adminRepo.findOne!.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@oruvia.com',
        status: 'ACTIVE',
      });
      codeRepo.findOne!.mockResolvedValue({
        id: 'recent-code',
        createdAt: new Date(),
      });

      await expect(
        service.forgotPassword({ email: 'admin@oruvia.com' }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('resetPassword', () => {
    it('rejects if admin not found', async () => {
      adminRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          email: 'unknown@oruvia.com',
          code: '123456',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects if active reset code not found', async () => {
      adminRepo.findOne!.mockResolvedValue({ id: 'admin-1' });
      mockManager.findOne.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          email: 'admin@oruvia.com',
          code: '123456',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects expired reset code', async () => {
      adminRepo.findOne!.mockResolvedValue({ id: 'admin-1' });
      mockManager.findOne.mockResolvedValue({
        expiresAt: new Date(Date.now() - 1000),
        attempts: 0,
        maxAttempts: 5,
      });

      await expect(
        service.resetPassword({
          email: 'admin@oruvia.com',
          code: '123456',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('increments attempts on invalid reset code', async () => {
      adminRepo.findOne!.mockResolvedValue({ id: 'admin-1' });
      const activeCode = {
        codeHash: generateTestHmacHash('999999'),
        expiresAt: new Date(Date.now() + 60000),
        attempts: 2,
        maxAttempts: 5,
      };
      mockManager.findOne.mockResolvedValue(activeCode);

      await expect(
        service.resetPassword({
          email: 'admin@oruvia.com',
          code: '123456',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(activeCode.attempts).toBe(3);
      expect(mockManager.save).toHaveBeenCalledWith(activeCode);
    });

    it('resets password, revokes sessions with tokenVersion increment, and marks code used', async () => {
      const admin = {
        id: 'admin-1',
        passwordHash: 'oldHash',
        tokenVersion: 5,
      };
      adminRepo.findOne!.mockResolvedValue(admin);
      const activeCode = {
        codeHash: generateTestHmacHash('654321'),
        expiresAt: new Date(Date.now() + 60000),
        attempts: 0,
        maxAttempts: 5,
        usedAt: null,
      };
      mockManager.findOne.mockResolvedValue(activeCode);

      const result = await service.resetPassword({
        email: 'admin@oruvia.com',
        code: '654321',
        newPassword: 'BrandNewPassword123!',
      });

      expect(activeCode.usedAt).toBeInstanceOf(Date);
      expect(admin.tokenVersion).toBe(6);
      expect(admin.passwordHash).not.toBe('oldHash');
      expect(result.message).toBe('Password reset successfully');
    });
  });
});
