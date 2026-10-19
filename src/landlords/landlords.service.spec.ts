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
import type { MailService } from '../mail/mail.service.js';
import type { LandlordUser } from './entities/landlord-user.entity.js';
import type { LandlordVerificationCode } from './entities/landlord-verification-code.entity.js';
import { LandlordsService } from './landlords.service.js';

describe('LandlordsService', () => {
  let service: LandlordsService;
  let landlordRepo: Partial<Record<keyof Repository<LandlordUser>, any>>;
  let codeRepo: Partial<Record<keyof Repository<LandlordVerificationCode>, any>>;
  let jwtService: Partial<Record<keyof JwtService, any>>;
  let mailService: Partial<Record<keyof MailService, any>>;
  let dataSource: Partial<Record<keyof DataSource, any>>;
  let configService: Partial<Record<keyof ConfigService, any>>;
  let mockManager: any;

  const testHmacSecret = 'super-secret-landlord-jwt-key-for-dev-32chars';

  beforeEach(() => {
    landlordRepo = {
      findOne: vi.fn(),
      create: vi.fn((entity) => ({
        ...entity,
        id: 'landlord-123',
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
      signAsync: vi.fn().mockResolvedValue('jwt-mock-token'),
    };

    mailService = {
      sendVerificationCode: vi.fn().mockResolvedValue(undefined),
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

    service = new LandlordsService(
      landlordRepo as any,
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

  describe('register', () => {
    it('creates a new unverified landlord, saves hashed code, and dispatches email', async () => {
      landlordRepo.findOne!.mockResolvedValue(null);

      const result = await service.register({
        fullName: 'John Landlord',
        email: 'Landlord@Example.COM',
        password: 'Password123!',
      });

      expect(landlordRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'landlord@example.com' },
      });
      expect(landlordRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'John Landlord',
          email: 'landlord@example.com',
          isEmailVerified: false,
        }),
      );
      expect(landlordRepo.save).toHaveBeenCalled();
      expect(codeRepo.save).toHaveBeenCalled();
      expect(mailService.sendVerificationCode).toHaveBeenCalledWith(
        'landlord@example.com',
        expect.stringMatching(/^\d{6}$/),
        'landlord',
      );
      expect(result.email).toBe('landlord@example.com');
      expect(result.isEmailVerified).toBe(false);
    });

    it('rejects duplicate email with ConflictException', async () => {
      landlordRepo.findOne!.mockResolvedValue({ id: 'existing-id' });

      await expect(
        service.register({
          fullName: 'John Duplicate',
          email: 'landlord@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('handles race condition unique violation error 23505', async () => {
      landlordRepo.findOne!.mockResolvedValue(null);
      landlordRepo.save!.mockRejectedValue({ code: '23505' });

      await expect(
        service.register({
          fullName: 'John Race',
          email: 'landlord@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('verifyEmail', () => {
    it('rejects if landlord is not found', async () => {
      landlordRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.verifyEmail({ email: 'unknown@example.com', code: '123456' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects if email is already verified', async () => {
      landlordRepo.findOne!.mockResolvedValue({
        id: 'landlord-1',
        isEmailVerified: true,
      });

      await expect(
        service.verifyEmail({ email: 'verified@example.com', code: '123456' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects if no active code found', async () => {
      landlordRepo.findOne!.mockResolvedValue({
        id: 'landlord-1',
        isEmailVerified: false,
      });
      mockManager.findOne.mockResolvedValue(null);

      await expect(
        service.verifyEmail({ email: 'landlord@example.com', code: '123456' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects expired code', async () => {
      landlordRepo.findOne!.mockResolvedValue({
        id: 'landlord-1',
        isEmailVerified: false,
      });
      mockManager.findOne.mockResolvedValue({
        expiresAt: new Date(Date.now() - 1000),
        attempts: 0,
        maxAttempts: 5,
      });

      await expect(
        service.verifyEmail({ email: 'landlord@example.com', code: '123456' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects if max attempts exceeded', async () => {
      landlordRepo.findOne!.mockResolvedValue({
        id: 'landlord-1',
        isEmailVerified: false,
      });
      mockManager.findOne.mockResolvedValue({
        expiresAt: new Date(Date.now() + 60000),
        attempts: 5,
        maxAttempts: 5,
      });

      await expect(
        service.verifyEmail({ email: 'landlord@example.com', code: '123456' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('increments attempts on invalid code', async () => {
      landlordRepo.findOne!.mockResolvedValue({
        id: 'landlord-1',
        isEmailVerified: false,
      });
      const activeCode = {
        codeHash: generateTestHmacHash('999999'),
        expiresAt: new Date(Date.now() + 60000),
        attempts: 1,
        maxAttempts: 5,
      };
      mockManager.findOne.mockResolvedValue(activeCode);

      await expect(
        service.verifyEmail({ email: 'landlord@example.com', code: '123456' }),
      ).rejects.toThrow(BadRequestException);

      expect(activeCode.attempts).toBe(2);
      expect(mockManager.save).toHaveBeenCalledWith(activeCode);
    });

    it('verifies code successfully and updates landlord', async () => {
      const landlord = {
        id: 'landlord-1',
        email: 'landlord@example.com',
        isEmailVerified: false,
        emailVerifiedAt: null,
      };
      landlordRepo.findOne!.mockResolvedValue(landlord);
      const activeCode = {
        codeHash: generateTestHmacHash('123456'),
        expiresAt: new Date(Date.now() + 60000),
        attempts: 0,
        maxAttempts: 5,
        usedAt: null,
      };
      mockManager.findOne.mockResolvedValue(activeCode);

      const result = await service.verifyEmail({
        email: 'landlord@example.com',
        code: '123456',
      });

      expect(activeCode.usedAt).toBeInstanceOf(Date);
      expect(landlord.isEmailVerified).toBe(true);
      expect(landlord.emailVerifiedAt).toBeInstanceOf(Date);
      expect(result.message).toBe('Email verified successfully');
      expect(result.landlord.isEmailVerified).toBe(true);
    });

    it('supports legacy bcrypt hashes for backward compatibility', async () => {
      const landlord = {
        id: 'landlord-1',
        email: 'landlord@example.com',
        isEmailVerified: false,
        emailVerifiedAt: null,
      };
      landlordRepo.findOne!.mockResolvedValue(landlord);
      const bcryptHash = await bcrypt.hash('654321', 10);
      const activeCode = {
        codeHash: bcryptHash,
        expiresAt: new Date(Date.now() + 60000),
        attempts: 0,
        maxAttempts: 5,
        usedAt: null,
      };
      mockManager.findOne.mockResolvedValue(activeCode);

      const result = await service.verifyEmail({
        email: 'landlord@example.com',
        code: '654321',
      });

      expect(result.message).toBe('Email verified successfully');
      expect(landlord.isEmailVerified).toBe(true);
    });
  });

  describe('resendVerificationCode', () => {
    it('dispatches code if unverified landlord exists', async () => {
      landlordRepo.findOne!.mockResolvedValue({
        id: 'landlord-1',
        email: 'landlord@example.com',
        isEmailVerified: false,
      });

      const result = await service.resendVerificationCode({
        email: 'landlord@example.com',
      });

      expect(mailService.sendVerificationCode).toHaveBeenCalledWith(
        'landlord@example.com',
        expect.stringMatching(/^\d{6}$/),
        'landlord',
      );
      expect(result.message).toContain('If an unverified account');
    });

    it('enforces 60-second cooldown', async () => {
      landlordRepo.findOne!.mockResolvedValue({
        id: 'landlord-1',
        email: 'landlord@example.com',
        isEmailVerified: false,
      });
      codeRepo.findOne!.mockResolvedValue({
        id: 'recent-code',
        createdAt: new Date(),
      });

      await expect(
        service.resendVerificationCode({ email: 'landlord@example.com' }),
      ).rejects.toThrow(HttpException);
    });

    it('returns generic message without leaking nonexistence', async () => {
      landlordRepo.findOne!.mockResolvedValue(null);

      const result = await service.resendVerificationCode({
        email: 'ghost@example.com',
      });

      expect(mailService.sendVerificationCode).not.toHaveBeenCalled();
      expect(result.message).toContain('If an unverified account');
    });
  });

  describe('login', () => {
    it('performs timing-safe dummy check and rejects unknown landlord with 401', async () => {
      landlordRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'unknown@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects incorrect password with 401', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword123!', 10);
      landlordRepo.findOne!.mockResolvedValue({
        id: 'landlord-1',
        email: 'landlord@example.com',
        passwordHash,
        isEmailVerified: true,
      });

      await expect(
        service.login({
          email: 'landlord@example.com',
          password: 'WrongPassword123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects unverified landlord with 403 Forbidden', async () => {
      const password = 'CorrectPassword123!';
      const passwordHash = await bcrypt.hash(password, 10);
      landlordRepo.findOne!.mockResolvedValue({
        id: 'landlord-1',
        email: 'landlord@example.com',
        passwordHash,
        isEmailVerified: false,
      });

      await expect(
        service.login({
          email: 'landlord@example.com',
          password,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns access token and profile on valid verified login', async () => {
      const password = 'CorrectPassword123!';
      const passwordHash = await bcrypt.hash(password, 10);
      const landlord = {
        id: 'landlord-1',
        fullName: 'John Landlord',
        email: 'landlord@example.com',
        passwordHash,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        tokenVersion: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      landlordRepo.findOne!.mockResolvedValue(landlord);

      const result = await service.login({
        email: 'landlord@example.com',
        password,
      });

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'landlord-1',
        email: 'landlord@example.com',
        tokenVersion: 3,
        accountType: 'landlord',
      });
      expect(result.accessToken).toBe('jwt-mock-token');
      expect(result.landlord.email).toBe('landlord@example.com');
    });
  });

  describe('changePassword', () => {
    it('rejects if landlord is not found', async () => {
      landlordRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.changePassword('missing-id', {
          currentPassword: 'old',
          newPassword: 'new',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects invalid current password with 400', async () => {
      const passwordHash = await bcrypt.hash('RealOldPassword123!', 10);
      landlordRepo.findOne!.mockResolvedValue({
        id: 'landlord-1',
        passwordHash,
      });

      await expect(
        service.changePassword('landlord-1', {
          currentPassword: 'WrongOldPassword123!',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects identical new password with 400', async () => {
      const password = 'SamePassword123!';
      const passwordHash = await bcrypt.hash(password, 10);
      landlordRepo.findOne!.mockResolvedValue({
        id: 'landlord-1',
        passwordHash,
      });

      await expect(
        service.changePassword('landlord-1', {
          currentPassword: password,
          newPassword: password,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates password and increments tokenVersion to revoke old sessions', async () => {
      const currentPassword = 'OldPassword123!';
      const passwordHash = await bcrypt.hash(currentPassword, 10);
      const landlord = {
        id: 'landlord-1',
        passwordHash,
        tokenVersion: 1,
      };
      landlordRepo.findOne!.mockResolvedValue(landlord);

      const result = await service.changePassword('landlord-1', {
        currentPassword,
        newPassword: 'BrandNewPassword123!',
      });

      expect(landlord.tokenVersion).toBe(2);
      expect(landlordRepo.save).toHaveBeenCalledWith(landlord);
      expect(result.message).toBe('Password changed successfully');
    });
  });

  describe('forgotPassword', () => {
    it('returns generic message without leaking account existence for unknown email', async () => {
      landlordRepo.findOne!.mockResolvedValue(null);

      const result = await service.forgotPassword({
        email: 'ghost@example.com',
      });

      expect(mailService.sendPasswordResetCode).not.toHaveBeenCalled();
      expect(result.message).toContain('If an account with that email exists');
    });

    it('sends password reset code for existing landlord', async () => {
      landlordRepo.findOne!.mockResolvedValue({
        id: 'landlord-1',
        email: 'landlord@example.com',
      });

      const result = await service.forgotPassword({
        email: 'landlord@example.com',
      });

      expect(mailService.sendPasswordResetCode).toHaveBeenCalledWith(
        'landlord@example.com',
        expect.stringMatching(/^\d{6}$/),
        'landlord',
      );
      expect(result.message).toContain('If an account with that email exists');
    });
  });

  describe('resetPassword', () => {
    it('rejects if landlord not found', async () => {
      landlordRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          email: 'unknown@example.com',
          code: '123456',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects if active reset code not found', async () => {
      landlordRepo.findOne!.mockResolvedValue({ id: 'landlord-1' });
      mockManager.findOne.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          email: 'landlord@example.com',
          code: '123456',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects expired reset code', async () => {
      landlordRepo.findOne!.mockResolvedValue({ id: 'landlord-1' });
      mockManager.findOne.mockResolvedValue({
        expiresAt: new Date(Date.now() - 1000),
        attempts: 0,
        maxAttempts: 5,
      });

      await expect(
        service.resetPassword({
          email: 'landlord@example.com',
          code: '123456',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('increments attempts on invalid reset code', async () => {
      landlordRepo.findOne!.mockResolvedValue({ id: 'landlord-1' });
      const activeCode = {
        codeHash: generateTestHmacHash('999999'),
        expiresAt: new Date(Date.now() + 60000),
        attempts: 2,
        maxAttempts: 5,
      };
      mockManager.findOne.mockResolvedValue(activeCode);

      await expect(
        service.resetPassword({
          email: 'landlord@example.com',
          code: '123456',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(activeCode.attempts).toBe(3);
      expect(mockManager.save).toHaveBeenCalledWith(activeCode);
    });

    it('resets password, revokes sessions with tokenVersion increment, and marks code used', async () => {
      const landlord = {
        id: 'landlord-1',
        passwordHash: 'oldHash',
        tokenVersion: 4,
      };
      landlordRepo.findOne!.mockResolvedValue(landlord);
      const activeCode = {
        codeHash: generateTestHmacHash('654321'),
        expiresAt: new Date(Date.now() + 60000),
        attempts: 0,
        maxAttempts: 5,
        usedAt: null,
      };
      mockManager.findOne.mockResolvedValue(activeCode);

      const result = await service.resetPassword({
        email: 'landlord@example.com',
        code: '654321',
        newPassword: 'BrandNewPassword123!',
      });

      expect(activeCode.usedAt).toBeInstanceOf(Date);
      expect(landlord.tokenVersion).toBe(5);
      expect(landlord.passwordHash).not.toBe('oldHash');
      expect(result.message).toBe('Password reset successfully');
    });
  });
});
