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
import type { SeekerUser } from './entities/seeker-user.entity.js';
import type { SeekerVerificationCode } from './entities/seeker-verification-code.entity.js';
import { SeekersService } from './seekers.service.js';

describe('SeekersService', () => {
  let service: SeekersService;
  let seekerRepo: Partial<Record<keyof Repository<SeekerUser>, any>>;
  let codeRepo: Partial<Record<keyof Repository<SeekerVerificationCode>, any>>;
  let jwtService: Partial<Record<keyof JwtService, any>>;
  let mailService: Partial<Record<keyof MailService, any>>;
  let dataSource: Partial<Record<keyof DataSource, any>>;
  let configService: Partial<Record<keyof ConfigService, any>>;
  let mockManager: any;

  const testHmacSecret = 'super-secret-seeker-jwt-key-for-dev-32chars';

  beforeEach(() => {
    seekerRepo = {
      findOne: vi.fn(),
      create: vi.fn((entity) => ({
        ...entity,
        id: 'seeker-123',
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

    service = new SeekersService(
      seekerRepo as any,
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
    it('creates a new unverified seeker, saves hashed code, and dispatches email', async () => {
      seekerRepo.findOne!.mockResolvedValue(null);

      const result = await service.register({
        fullName: 'Jane Doe',
        email: '  Jane.Doe@EXAMPLE.com  ',
        password: 'Password123!',
      });

      expect(seekerRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'jane.doe@example.com' },
      });
      expect(seekerRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Jane Doe',
          email: 'jane.doe@example.com',
          isEmailVerified: false,
        }),
      );
      expect(result).toMatchObject({
        id: 'seeker-123',
        fullName: 'Jane Doe',
        email: 'jane.doe@example.com',
        isEmailVerified: false,
      });
      expect(mailService.sendVerificationCode).toHaveBeenCalledWith(
        'jane.doe@example.com',
        expect.stringMatching(/^\d{6}$/),
      );
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('rejects duplicate email with 409 ConflictException', async () => {
      seekerRepo.findOne!.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          fullName: 'Jane Doe',
          email: 'jane.doe@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('handles concurrent duplicate registration from database 23505 unique violation', async () => {
      seekerRepo.findOne!.mockResolvedValue(null);
      seekerRepo.save!.mockRejectedValue({ code: '23505' });

      await expect(
        service.register({
          fullName: 'Jane Doe',
          email: 'jane.doe@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('verifyEmail', () => {
    it('rejects nonexistent seeker with 404', async () => {
      seekerRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.verifyEmail({ email: 'unknown@example.com', code: '123456' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects already verified email with 400', async () => {
      seekerRepo.findOne!.mockResolvedValue({ isEmailVerified: true });

      await expect(
        service.verifyEmail({ email: 'verified@example.com', code: '123456' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when no active code exists', async () => {
      seekerRepo.findOne!.mockResolvedValue({
        id: 'seeker-1',
        isEmailVerified: false,
      });
      mockManager.findOne.mockResolvedValue(null);

      await expect(
        service.verifyEmail({ email: 'seeker@example.com', code: '123456' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects expired code', async () => {
      seekerRepo.findOne!.mockResolvedValue({
        id: 'seeker-1',
        isEmailVerified: false,
      });
      mockManager.findOne.mockResolvedValue({
        expiresAt: new Date(Date.now() - 60000), // 1 min ago
        attempts: 0,
        maxAttempts: 5,
      });

      await expect(
        service.verifyEmail({ email: 'seeker@example.com', code: '123456' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('increments attempts on invalid code and rejects', async () => {
      seekerRepo.findOne!.mockResolvedValue({
        id: 'seeker-1',
        isEmailVerified: false,
      });
      const hashed = generateTestHmacHash('654321');
      const activeCode = {
        codeHash: hashed,
        expiresAt: new Date(Date.now() + 600000),
        attempts: 2,
        maxAttempts: 5,
      };
      mockManager.findOne.mockResolvedValue(activeCode);

      await expect(
        service.verifyEmail({ email: 'seeker@example.com', code: '111111' }),
      ).rejects.toThrow(BadRequestException);
      expect(activeCode.attempts).toBe(3);
      expect(mockManager.save).toHaveBeenCalledWith(activeCode);
    });

    it('verifies account and marks code as used on valid code', async () => {
      const seeker = {
        id: 'seeker-1',
        isEmailVerified: false,
        email: 'seeker@example.com',
      };
      seekerRepo.findOne!.mockResolvedValue(seeker);
      const hashed = generateTestHmacHash('123456');
      const activeCode = {
        codeHash: hashed,
        expiresAt: new Date(Date.now() + 600000),
        attempts: 0,
        maxAttempts: 5,
        usedAt: null,
      };
      mockManager.findOne.mockResolvedValue(activeCode);

      const result = await service.verifyEmail({
        email: 'seeker@example.com',
        code: '123456',
      });

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(mockManager.save).toHaveBeenCalledWith(activeCode);
      expect(mockManager.save).toHaveBeenCalledWith(seeker);
      expect(result.message).toBe('Email verified successfully');
      expect(result.seeker.isEmailVerified).toBe(true);
    });
  });

  describe('resendVerificationCode', () => {
    it('returns generic message without disclosing existence if account does not exist', async () => {
      seekerRepo.findOne!.mockResolvedValue(null);

      const result = await service.resendVerificationCode({
        email: 'unknown@example.com',
      });

      expect(result.message).toContain('If an unverified account with that email exists');
      expect(mailService.sendVerificationCode).not.toHaveBeenCalled();
    });

    it('returns generic message without sending code if account is already verified', async () => {
      seekerRepo.findOne!.mockResolvedValue({ isEmailVerified: true });

      const result = await service.resendVerificationCode({
        email: 'verified@example.com',
      });

      expect(result.message).toContain('If an unverified account with that email exists');
      expect(mailService.sendVerificationCode).not.toHaveBeenCalled();
    });

    it('invalidates prior codes and sends a new one for unverified seeker', async () => {
      const seeker = {
        id: 'seeker-1',
        email: 'seeker@example.com',
        isEmailVerified: false,
      };
      seekerRepo.findOne!.mockResolvedValue(seeker);

      const result = await service.resendVerificationCode({
        email: 'seeker@example.com',
      });

      expect(codeRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          seekerId: 'seeker-1',
          purpose: 'EMAIL_VERIFICATION',
        }),
        expect.objectContaining({ usedAt: expect.any(Date) }),
      );
      expect(mailService.sendVerificationCode).toHaveBeenCalledWith(
        'seeker@example.com',
        expect.stringMatching(/^\d{6}$/),
      );
      expect(result.message).toContain('If an unverified account with that email exists');
    });

    it('enforces 60-second cooldown between requests for the same account', async () => {
      const seeker = {
        id: 'seeker-1',
        email: 'seeker@example.com',
        isEmailVerified: false,
      };
      seekerRepo.findOne!.mockResolvedValue(seeker);
      codeRepo.findOne!.mockResolvedValue({ id: 'recent-code' }); // recent code exists

      await expect(
        service.resendVerificationCode({ email: 'seeker@example.com' }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('login', () => {
    it('rejects unknown user with 401 and executes timing-safe dummy comparison', async () => {
      seekerRepo.findOne!.mockResolvedValue(null);
      const compareSpy = vi.spyOn(bcrypt, 'compare');

      await expect(
        service.login({ email: 'unknown@example.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(compareSpy).toHaveBeenCalled();
    });

    it('rejects incorrect password with 401', async () => {
      const passwordHash = await bcrypt.hash('correctPassword123', 10);
      seekerRepo.findOne!.mockResolvedValue({
        id: 'seeker-1',
        email: 'seeker@example.com',
        passwordHash,
        isEmailVerified: true,
      });

      await expect(
        service.login({
          email: 'seeker@example.com',
          password: 'wrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects unverified seeker with 403 ForbiddenException', async () => {
      const passwordHash = await bcrypt.hash('correctPassword123', 10);
      seekerRepo.findOne!.mockResolvedValue({
        id: 'seeker-1',
        email: 'seeker@example.com',
        passwordHash,
        isEmailVerified: false,
      });

      await expect(
        service.login({
          email: 'seeker@example.com',
          password: 'correctPassword123',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns access token and profile on valid verified login', async () => {
      const passwordHash = await bcrypt.hash('correctPassword123', 10);
      const seeker = {
        id: 'seeker-1',
        fullName: 'Jane Doe',
        email: 'seeker@example.com',
        passwordHash,
        isEmailVerified: true,
        tokenVersion: 0,
      };
      seekerRepo.findOne!.mockResolvedValue(seeker);

      const result = await service.login({
        email: 'seeker@example.com',
        password: 'correctPassword123',
      });

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'seeker-1',
        email: 'seeker@example.com',
        tokenVersion: 0,
        accountType: 'seeker',
      });
      expect(result).toMatchObject({
        accessToken: 'jwt-mock-token',
        seeker: {
          id: 'seeker-1',
          fullName: 'Jane Doe',
          email: 'seeker@example.com',
          isEmailVerified: true,
        },
      });
    });
  });

  describe('changePassword', () => {
    it('rejects invalid current password with 400', async () => {
      const passwordHash = await bcrypt.hash('oldPassword123', 10);
      seekerRepo.findOne!.mockResolvedValue({
        id: 'seeker-1',
        passwordHash,
        tokenVersion: 0,
      });

      await expect(
        service.changePassword('seeker-1', {
          currentPassword: 'wrongOldPassword',
          newPassword: 'newPassword123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects identical new password with 400', async () => {
      const passwordHash = await bcrypt.hash('samePassword123', 10);
      seekerRepo.findOne!.mockResolvedValue({
        id: 'seeker-1',
        passwordHash,
        tokenVersion: 0,
      });

      await expect(
        service.changePassword('seeker-1', {
          currentPassword: 'samePassword123',
          newPassword: 'samePassword123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates password and increments tokenVersion to revoke old sessions', async () => {
      const passwordHash = await bcrypt.hash('oldPassword123', 10);
      const seeker = { id: 'seeker-1', passwordHash, tokenVersion: 0 };
      seekerRepo.findOne!.mockResolvedValue(seeker);

      const result = await service.changePassword('seeker-1', {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
      });

      expect(seeker.tokenVersion).toBe(1);
      expect(seekerRepo.save).toHaveBeenCalledWith(seeker);
      expect(result.message).toBe('Password changed successfully');
    });
  });

  describe('forgotPassword', () => {
    it('returns generic message without disclosing if account exists', async () => {
      seekerRepo.findOne!.mockResolvedValue(null);

      const result = await service.forgotPassword({
        email: 'nonexistent@example.com',
      });

      expect(result.message).toContain('If an account with that email exists');
      expect(mailService.sendPasswordResetCode).not.toHaveBeenCalled();
    });

    it('dispatches reset code when account exists', async () => {
      seekerRepo.findOne!.mockResolvedValue({
        id: 'seeker-1',
        email: 'seeker@example.com',
      });

      const result = await service.forgotPassword({
        email: 'seeker@example.com',
      });

      expect(result.message).toContain('If an account with that email exists');
      expect(mailService.sendPasswordResetCode).toHaveBeenCalledWith(
        'seeker@example.com',
        expect.stringMatching(/^\d{6}$/),
      );
    });
  });

  describe('resetPassword', () => {
    it('updates password, increments tokenVersion, and marks code as used', async () => {
      const seeker = {
        id: 'seeker-1',
        email: 'seeker@example.com',
        passwordHash: 'old',
        tokenVersion: 2,
      };
      seekerRepo.findOne!.mockResolvedValue(seeker);
      const hashed = generateTestHmacHash('999888');
      const activeCode = {
        codeHash: hashed,
        expiresAt: new Date(Date.now() + 600000),
        attempts: 0,
        maxAttempts: 5,
        usedAt: null,
      };
      mockManager.findOne.mockResolvedValue(activeCode);

      const result = await service.resetPassword({
        email: 'seeker@example.com',
        code: '999888',
        newPassword: 'brandNewPassword123',
      });

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(seeker.tokenVersion).toBe(3);
      expect(mockManager.save).toHaveBeenCalledWith(activeCode);
      expect(mockManager.save).toHaveBeenCalledWith(seeker);
      expect(result.message).toBe('Password reset successfully');
    });
  });
});
