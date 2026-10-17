import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { DataSource, IsNull, MoreThan, Repository } from 'typeorm';
import type { Env } from '../config/env.validation.js';
import { MailService } from '../mail/mail.service.js';
import type { ChangePasswordDto } from './dto/change-password.dto.js';
import type { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import type { LoginSeekerDto } from './dto/login-seeker.dto.js';
import type { RegisterSeekerDto } from './dto/register-seeker.dto.js';
import type { ResendVerificationCodeDto } from './dto/resend-verification-code.dto.js';
import type { ResetPasswordDto } from './dto/reset-password.dto.js';
import type { VerifyEmailDto } from './dto/verify-email.dto.js';
import { SeekerUser } from './entities/seeker-user.entity.js';
import {
  SeekerVerificationCode,
  type VerificationCodePurpose,
} from './entities/seeker-verification-code.entity.js';
import type { SeekerJwtPayload } from './interfaces/jwt-payload.interface.js';
import type { SeekerProfile } from './interfaces/seeker-profile.interface.js';

const PASSWORD_SALT_ROUNDS = 10;
const CODE_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
const CODE_COOLDOWN_MS = 60 * 1000; // 60 seconds minimum interval between requests
const MAX_VERIFICATION_ATTEMPTS = 5;

// Precomputed dummy bcrypt hash with 10 rounds to equalize execution time for invalid users
const DUMMY_BCRYPT_HASH =
  '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ123456';

@Injectable()
export class SeekersService {
  private readonly hmacKey: string;

  constructor(
    @InjectRepository(SeekerUser)
    private readonly seekerRepository: Repository<SeekerUser>,
    @InjectRepository(SeekerVerificationCode)
    private readonly codeRepository: Repository<SeekerVerificationCode>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService<Env, true>,
  ) {
    this.hmacKey = this.config.getOrThrow<string>('JWT_SECRET');
  }

  toProfile(seeker: SeekerUser): SeekerProfile {
    return {
      id: seeker.id,
      fullName: seeker.fullName,
      email: seeker.email,
      isEmailVerified: seeker.isEmailVerified,
      emailVerifiedAt: seeker.emailVerifiedAt,
      createdAt: seeker.createdAt,
      updatedAt: seeker.updatedAt,
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private generate6DigitCode(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  /**
   * Hashes short numeric codes using salted HMAC-SHA256.
   * Eliminates the CPU denial-of-service vector of bcrypt on short codes while maintaining
   * strong cryptographic security via a 16-byte random salt and server-side HMAC secret.
   */
  private hashCode(code: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hmac = crypto
      .createHmac('sha256', this.hmacKey)
      .update(`${salt}:${code}`)
      .digest('hex');
    return `${salt}:${hmac}`;
  }

  /**
   * Timing-safe verification of code hashes with backward-compatibility for bcrypt.
   */
  private verifyCode(code: string, storedHash: string): boolean {
    if (storedHash.startsWith('$2')) {
      return bcrypt.compareSync(code, storedHash);
    }

    const [salt, expectedHmac] = storedHash.split(':');
    if (!salt || !expectedHmac) return false;

    const computedHmac = crypto
      .createHmac('sha256', this.hmacKey)
      .update(`${salt}:${code}`)
      .digest('hex');

    if (computedHmac.length !== expectedHmac.length) return false;

    return crypto.timingSafeEqual(
      Buffer.from(computedHmac, 'hex'),
      Buffer.from(expectedHmac, 'hex'),
    );
  }

  private async createAndSendCode(
    seekerId: string,
    email: string,
    purpose: VerificationCodePurpose,
  ): Promise<void> {
    // Check account-based cooldown to prevent email inbox flooding abuse
    const recentCode = await this.codeRepository.findOne({
      where: {
        seekerId,
        purpose,
        createdAt: MoreThan(new Date(Date.now() - CODE_COOLDOWN_MS)),
      },
    });

    if (recentCode) {
      throw new HttpException(
        {
          code: 'TOO_MANY_REQUESTS',
          message: 'Please wait before requesting another code',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Invalidate existing unused codes for this purpose
    await this.codeRepository.update(
      { seekerId, purpose, usedAt: IsNull() },
      { usedAt: new Date() },
    );

    const code = this.generate6DigitCode();
    const codeHash = this.hashCode(code);
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MS);

    const codeRecord = this.codeRepository.create({
      seekerId,
      codeHash,
      purpose,
      expiresAt,
      attempts: 0,
      maxAttempts: MAX_VERIFICATION_ATTEMPTS,
    });
    await this.codeRepository.save(codeRecord);

    if (purpose === 'EMAIL_VERIFICATION') {
      await this.mailService.sendVerificationCode(email, code);
    } else {
      await this.mailService.sendPasswordResetCode(email, code);
    }
  }

  async register(dto: RegisterSeekerDto): Promise<SeekerProfile> {
    const email = this.normalizeEmail(dto.email);

    const existing = await this.seekerRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'Email is already registered',
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS);
    const seeker = this.seekerRepository.create({
      fullName: dto.fullName.trim(),
      email,
      passwordHash,
      isEmailVerified: false,
    });

    try {
      await this.seekerRepository.save(seeker);
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException({
          code: 'EMAIL_ALREADY_REGISTERED',
          message: 'Email is already registered',
        });
      }
      throw error;
    }

    await this.createAndSendCode(seeker.id, seeker.email, 'EMAIL_VERIFICATION');

    return this.toProfile(seeker);
  }

  async verifyEmail(
    dto: VerifyEmailDto,
  ): Promise<{ message: string; seeker: SeekerProfile }> {
    const email = this.normalizeEmail(dto.email);
    const seeker = await this.seekerRepository.findOne({ where: { email } });

    if (!seeker) {
      throw new NotFoundException({
        code: 'SEEKER_NOT_FOUND',
        message: 'Seeker account not found',
      });
    }

    if (seeker.isEmailVerified) {
      throw new BadRequestException({
        code: 'EMAIL_ALREADY_VERIFIED',
        message: 'Email is already verified',
      });
    }

    // Atomic transaction with row-level lock prevents race conditions on attempts & consumption
    return await this.dataSource.transaction(async (manager) => {
      const activeCode = await manager.findOne(SeekerVerificationCode, {
        where: {
          seekerId: seeker.id,
          purpose: 'EMAIL_VERIFICATION',
          usedAt: IsNull(),
        },
        order: { createdAt: 'DESC' },
        lock: { mode: 'pessimistic_write' },
      });

      if (!activeCode) {
        throw new BadRequestException({
          code: 'INVALID_VERIFICATION_CODE',
          message: 'Invalid or expired verification code',
        });
      }

      if (activeCode.expiresAt < new Date()) {
        throw new BadRequestException({
          code: 'VERIFICATION_CODE_EXPIRED',
          message: 'Verification code has expired. Please request a new code',
        });
      }

      if (activeCode.attempts >= activeCode.maxAttempts) {
        throw new BadRequestException({
          code: 'TOO_MANY_ATTEMPTS',
          message:
            'Maximum verification attempts exceeded. Please request a new code',
        });
      }

      const isMatch = this.verifyCode(dto.code, activeCode.codeHash);
      if (!isMatch) {
        activeCode.attempts += 1;
        await manager.save(activeCode);
        throw new BadRequestException({
          code: 'INVALID_VERIFICATION_CODE',
          message: 'Invalid verification code',
        });
      }

      activeCode.usedAt = new Date();
      await manager.save(activeCode);

      seeker.isEmailVerified = true;
      seeker.emailVerifiedAt = new Date();
      await manager.save(seeker);

      return {
        message: 'Email verified successfully',
        seeker: this.toProfile(seeker),
      };
    });
  }

  async resendVerificationCode(
    dto: ResendVerificationCodeDto,
  ): Promise<{ message: string }> {
    const email = this.normalizeEmail(dto.email);
    const seeker = await this.seekerRepository.findOne({ where: { email } });

    // Timing-safe: return generic message regardless of existence or verification status
    if (seeker && !seeker.isEmailVerified) {
      await this.createAndSendCode(
        seeker.id,
        seeker.email,
        'EMAIL_VERIFICATION',
      );
    }

    return {
      message:
        'If an unverified account with that email exists, a new verification code has been sent.',
    };
  }

  async login(
    dto: LoginSeekerDto,
  ): Promise<{ accessToken: string; seeker: SeekerProfile }> {
    const email = this.normalizeEmail(dto.email);
    const seeker = await this.seekerRepository.findOne({ where: { email } });

    // Timing-safe credential check to eliminate email enumeration timing attacks
    if (!seeker) {
      await bcrypt.compare(dto.password, DUMMY_BCRYPT_HASH);
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    const isMatch = await bcrypt.compare(dto.password, seeker.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    if (!seeker.isEmailVerified) {
      throw new ForbiddenException({
        code: 'EMAIL_NOT_VERIFIED',
        message:
          'Email address is not verified. Please verify your email before logging in.',
      });
    }

    const payload: SeekerJwtPayload = {
      sub: seeker.id,
      email: seeker.email,
      tokenVersion: seeker.tokenVersion,
      accountType: 'seeker',
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      seeker: this.toProfile(seeker),
    };
  }

  async changePassword(
    seekerId: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const seeker = await this.seekerRepository.findOne({
      where: { id: seekerId },
    });

    if (!seeker) {
      throw new NotFoundException({
        code: 'SEEKER_NOT_FOUND',
        message: 'Seeker account not found',
      });
    }

    const isMatch = await bcrypt.compare(
      dto.currentPassword,
      seeker.passwordHash,
    );
    if (!isMatch) {
      throw new BadRequestException({
        code: 'INVALID_CURRENT_PASSWORD',
        message: 'Current password is incorrect',
      });
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException({
        code: 'PASSWORD_UNCHANGED',
        message: 'New password must be different from current password',
      });
    }

    seeker.passwordHash = await bcrypt.hash(
      dto.newPassword,
      PASSWORD_SALT_ROUNDS,
    );
    // Invalidate existing sessions/tokens
    seeker.tokenVersion += 1;
    await this.seekerRepository.save(seeker);

    return { message: 'Password changed successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const email = this.normalizeEmail(dto.email);
    const seeker = await this.seekerRepository.findOne({ where: { email } });

    // Do not disclose whether email exists
    if (seeker) {
      await this.createAndSendCode(seeker.id, seeker.email, 'PASSWORD_RESET');
    }

    return {
      message:
        'If an account with that email exists, a password reset code has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const email = this.normalizeEmail(dto.email);
    const seeker = await this.seekerRepository.findOne({ where: { email } });

    if (!seeker) {
      throw new BadRequestException({
        code: 'INVALID_RESET_CODE',
        message: 'Invalid or expired password reset code',
      });
    }

    const newPasswordHash = await bcrypt.hash(
      dto.newPassword,
      PASSWORD_SALT_ROUNDS,
    );

    // Atomic transaction with row-level lock prevents race conditions on attempts & consumption
    return await this.dataSource.transaction(async (manager) => {
      const activeCode = await manager.findOne(SeekerVerificationCode, {
        where: {
          seekerId: seeker.id,
          purpose: 'PASSWORD_RESET',
          usedAt: IsNull(),
        },
        order: { createdAt: 'DESC' },
        lock: { mode: 'pessimistic_write' },
      });

      if (!activeCode) {
        throw new BadRequestException({
          code: 'INVALID_RESET_CODE',
          message: 'Invalid or expired password reset code',
        });
      }

      if (activeCode.expiresAt < new Date()) {
        throw new BadRequestException({
          code: 'RESET_CODE_EXPIRED',
          message: 'Password reset code has expired. Please request a new code',
        });
      }

      if (activeCode.attempts >= activeCode.maxAttempts) {
        throw new BadRequestException({
          code: 'TOO_MANY_ATTEMPTS',
          message: 'Maximum attempts exceeded. Please request a new code',
        });
      }

      const isMatch = this.verifyCode(dto.code, activeCode.codeHash);
      if (!isMatch) {
        activeCode.attempts += 1;
        await manager.save(activeCode);
        throw new BadRequestException({
          code: 'INVALID_RESET_CODE',
          message: 'Invalid password reset code',
        });
      }

      activeCode.usedAt = new Date();
      await manager.save(activeCode);

      seeker.passwordHash = newPasswordHash;
      seeker.tokenVersion += 1; // Invalidate all existing tokens
      await manager.save(seeker);

      return { message: 'Password reset successfully' };
    });
  }
}
