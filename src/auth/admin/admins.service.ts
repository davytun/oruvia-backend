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
import type { Env } from '../../config/env.validation.js';
import { MailService } from '../../mail/mail.service.js';
import {
  CODE_RESEND_COOLDOWN_SECONDS,
  VERIFICATION_CODE_EXPIRY_MINUTES,
  VERIFICATION_CODE_MAX_ATTEMPTS,
} from '../common/auth.constants.js';
import type { ChangeAdminPasswordDto } from './dto/change-password.dto.js';
import type { ForgotAdminPasswordDto } from './dto/forgot-password.dto.js';
import type { LoginAdminDto } from './dto/login-admin.dto.js';
import type { ProvisionAdminDto } from './dto/provision-admin.dto.js';
import type { ResetAdminPasswordDto } from './dto/reset-password.dto.js';
import { AdminUser } from './entities/admin-user.entity.js';
import { AdminVerificationCode } from './entities/admin-verification-code.entity.js';
import type { AdminProfile } from './interfaces/admin-profile.interface.js';
import type { AdminJwtPayload } from './interfaces/jwt-payload.interface.js';

// Pre-computed dummy hash to prevent timing attacks when checking non-existent accounts
const DUMMY_BCRYPT_HASH =
  '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ0123456';

@Injectable()
export class AdminsService {
  private readonly hmacSecret: string;

  constructor(
    @InjectRepository(AdminUser)
    private readonly adminRepository: Repository<AdminUser>,
    @InjectRepository(AdminVerificationCode)
    private readonly codeRepository: Repository<AdminVerificationCode>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly dataSource: DataSource,
    configService: ConfigService<Env, true>,
  ) {
    this.hmacSecret = configService.getOrThrow<string>('JWT_SECRET');
  }

  private generateHmacHash(code: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hmac = crypto
      .createHmac('sha256', this.hmacSecret)
      .update(`${salt}:${code}`)
      .digest('hex');
    return `${salt}:${hmac}`;
  }

  private async verifyCodeHash(code: string, storedHash: string): Promise<boolean> {
    if (storedHash.includes(':')) {
      const [salt, hash] = storedHash.split(':');
      if (!salt || !hash) return false;

      const expectedHmac = crypto
        .createHmac('sha256', this.hmacSecret)
        .update(`${salt}:${code}`)
        .digest('hex');

      const expectedBuffer = Buffer.from(expectedHmac, 'utf8');
      const actualBuffer = Buffer.from(hash, 'utf8');

      if (expectedBuffer.length !== actualBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
    }

    return bcrypt.compare(code, storedHash);
  }

  async provisionInitialAdmin(dto: ProvisionAdminDto): Promise<AdminProfile> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const existing = await this.adminRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictException({
        code: 'ADMIN_ALREADY_EXISTS',
        message: 'An admin account with this email address already exists',
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const admin = this.adminRepository.create({
      fullName: dto.fullName.trim(),
      email: normalizedEmail,
      passwordHash,
      status: 'ACTIVE',
      tokenVersion: 0,
      lastLoginAt: null,
    });

    try {
      const saved = await this.adminRepository.save(admin);
      return this.toProfile(saved);
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException({
          code: 'ADMIN_ALREADY_EXISTS',
          message: 'An admin account with this email address already exists',
        });
      }
      throw error;
    }
  }

  async login(
    dto: LoginAdminDto,
  ): Promise<{ accessToken: string; admin: AdminProfile }> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const admin = await this.adminRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (!admin) {
      await bcrypt.compare(dto.password, DUMMY_BCRYPT_HASH);
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      admin.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    if (admin.status !== 'ACTIVE') {
      throw new ForbiddenException({
        code: 'ADMIN_ACCOUNT_INACTIVE',
        message: 'Admin account is inactive or suspended',
      });
    }

    admin.lastLoginAt = new Date();
    await this.adminRepository.save(admin);

    const payload: AdminJwtPayload = {
      sub: admin.id,
      email: admin.email,
      tokenVersion: admin.tokenVersion,
      accountType: 'admin',
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      admin: this.toProfile(admin),
    };
  }

  async changePassword(
    adminId: string,
    dto: ChangeAdminPasswordDto,
  ): Promise<{ message: string }> {
    const admin = await this.adminRepository.findOne({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException({
        code: 'ADMIN_NOT_FOUND',
        message: 'Admin account not found',
      });
    }

    const isCurrentValid = await bcrypt.compare(
      dto.currentPassword,
      admin.passwordHash,
    );

    if (!isCurrentValid) {
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

    admin.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    admin.tokenVersion += 1;

    await this.adminRepository.save(admin);

    return { message: 'Password changed successfully' };
  }

  async forgotPassword(
    dto: ForgotAdminPasswordDto,
  ): Promise<{ message: string }> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const genericResponse = {
      message:
        'If an account with that email exists, a password reset code has been sent.',
    };

    const admin = await this.adminRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (!admin || admin.status !== 'ACTIVE') {
      return genericResponse;
    }

    const recentCode = await this.codeRepository.findOne({
      where: {
        adminId: admin.id,
        purpose: 'PASSWORD_RESET',
        createdAt: MoreThan(
          new Date(Date.now() - CODE_RESEND_COOLDOWN_SECONDS * 1000),
        ),
      },
      order: { createdAt: 'DESC' },
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

    await this.codeRepository.update(
      {
        adminId: admin.id,
        purpose: 'PASSWORD_RESET',
        usedAt: IsNull(),
      },
      {
        expiresAt: new Date(),
      },
    );

    const rawCode = crypto.randomInt(100000, 1000000).toString();
    const codeHash = this.generateHmacHash(rawCode);

    const expiresAt = new Date(
      Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000,
    );

    const newCode = this.codeRepository.create({
      adminId: admin.id,
      codeHash,
      purpose: 'PASSWORD_RESET',
      expiresAt,
      attempts: 0,
      maxAttempts: VERIFICATION_CODE_MAX_ATTEMPTS,
    });

    await this.codeRepository.save(newCode);

    await this.mailService.sendPasswordResetCode(
      admin.email,
      rawCode,
      'admin',
    );

    return genericResponse;
  }

  async resetPassword(
    dto: ResetAdminPasswordDto,
  ): Promise<{ message: string }> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const admin = await this.adminRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (!admin) {
      throw new BadRequestException({
        code: 'INVALID_RESET_CODE',
        message: 'Invalid or expired password reset code',
      });
    }

    await this.dataSource.transaction(async (manager) => {
      const activeCode = await manager.findOne(AdminVerificationCode, {
        where: {
          adminId: admin.id,
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

      if (activeCode.attempts >= activeCode.maxAttempts) {
        throw new BadRequestException({
          code: 'INVALID_RESET_CODE',
          message: 'Maximum attempts exceeded. Request a new code.',
        });
      }

      if (new Date() > activeCode.expiresAt) {
        throw new BadRequestException({
          code: 'INVALID_RESET_CODE',
          message: 'Verification code has expired',
        });
      }

      const isValid = await this.verifyCodeHash(
        dto.code,
        activeCode.codeHash,
      );

      if (!isValid) {
        activeCode.attempts += 1;
        await manager.save(activeCode);

        throw new BadRequestException({
          code: 'INVALID_RESET_CODE',
          message: 'Invalid password reset code',
        });
      }

      activeCode.usedAt = new Date();
      await manager.save(activeCode);

      admin.passwordHash = await bcrypt.hash(dto.newPassword, 10);
      admin.tokenVersion += 1;

      await manager.save(admin);
    });

    return { message: 'Password reset successfully' };
  }

  toProfile(admin: AdminUser): AdminProfile {
    return {
      id: admin.id,
      fullName: admin.fullName,
      email: admin.email,
      status: admin.status,
      lastLoginAt: admin.lastLoginAt,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    };
  }
}
