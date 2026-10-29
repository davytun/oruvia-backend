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
import type { ChangeAgentPasswordDto } from './dto/change-password.dto.js';
import type { ForgotAgentPasswordDto } from './dto/forgot-password.dto.js';
import type { LoginAgentDto } from './dto/login-agent.dto.js';
import type { RegisterAgentDto } from './dto/register-agent.dto.js';
import type { ResendAgentVerificationCodeDto } from './dto/resend-verification-code.dto.js';
import type { ResetAgentPasswordDto } from './dto/reset-password.dto.js';
import type { VerifyAgentEmailDto } from './dto/verify-email.dto.js';
import { AgentUser } from './entities/agent-user.entity.js';
import {
  AgentVerificationCode,
  type VerificationCodePurpose,
} from './entities/agent-verification-code.entity.js';
import type { AgentJwtPayload } from './interfaces/jwt-payload.interface.js';
import type { AgentProfile } from './interfaces/agent-profile.interface.js';

const PASSWORD_SALT_ROUNDS = 10;
const CODE_EXPIRY_MS = 15 * 60 * 1000;
const CODE_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFICATION_ATTEMPTS = 5;

// Precomputed dummy bcrypt hash with 10 rounds to equalize execution time for invalid users
const DUMMY_BCRYPT_HASH =
  '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ123456';

@Injectable()
export class AgentsService {
  private readonly hmacKey: string;

  constructor(
    @InjectRepository(AgentUser)
    private readonly agentRepository: Repository<AgentUser>,
    @InjectRepository(AgentVerificationCode)
    private readonly codeRepository: Repository<AgentVerificationCode>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService<Env, true>,
  ) {
    this.hmacKey = this.config.getOrThrow<string>('JWT_SECRET');
  }

  toProfile(agent: AgentUser): AgentProfile {
    return {
      id: agent.id,
      fullName: agent.fullName,
      email: agent.email,
      isEmailVerified: agent.isEmailVerified,
      emailVerifiedAt: agent.emailVerifiedAt,
      verificationStatus: agent.verificationStatus,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private generate6DigitCode(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  private hashCode(code: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hmac = crypto
      .createHmac('sha256', this.hmacKey)
      .update(`${salt}:${code}`)
      .digest('hex');
    return `${salt}:${hmac}`;
  }

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
    agentId: string,
    email: string,
    purpose: VerificationCodePurpose,
  ): Promise<void> {
    // Check account-based cooldown to prevent email inbox flooding abuse
    const recentCode = await this.codeRepository.findOne({
      where: {
        agentId,
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
      { agentId, purpose, usedAt: IsNull() },
      { usedAt: new Date() },
    );

    const code = this.generate6DigitCode();
    const codeHash = this.hashCode(code);
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MS);

    const codeRecord = this.codeRepository.create({
      agentId,
      codeHash,
      purpose,
      expiresAt,
      attempts: 0,
      maxAttempts: MAX_VERIFICATION_ATTEMPTS,
    });
    await this.codeRepository.save(codeRecord);

    if (purpose === 'EMAIL_VERIFICATION') {
      await this.mailService.sendVerificationCode(email, code, 'agent');
    } else {
      await this.mailService.sendPasswordResetCode(email, code, 'agent');
    }
  }

  async register(dto: RegisterAgentDto): Promise<AgentProfile> {
    const email = this.normalizeEmail(dto.email);

    const existing = await this.agentRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'Email is already registered',
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS);
    const agent = this.agentRepository.create({
      fullName: dto.fullName.trim(),
      email,
      passwordHash,
      isEmailVerified: false,
    });

    try {
      await this.agentRepository.save(agent);
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException({
          code: 'EMAIL_ALREADY_REGISTERED',
          message: 'Email is already registered',
        });
      }
      throw error;
    }

    await this.createAndSendCode(agent.id, agent.email, 'EMAIL_VERIFICATION');

    return this.toProfile(agent);
  }

  async verifyEmail(
    dto: VerifyAgentEmailDto,
  ): Promise<{ message: string; agent: AgentProfile }> {
    const email = this.normalizeEmail(dto.email);
    const agent = await this.agentRepository.findOne({ where: { email } });

    if (!agent) {
      throw new NotFoundException({
        code: 'AGENT_NOT_FOUND',
        message: 'Agent account not found',
      });
    }

    if (agent.isEmailVerified) {
      throw new BadRequestException({
        code: 'EMAIL_ALREADY_VERIFIED',
        message: 'Email is already verified',
      });
    }

    // Atomic transaction with row-level lock prevents race conditions on attempts & consumption
    return await this.dataSource.transaction(async (manager) => {
      const activeCode = await manager.findOne(AgentVerificationCode, {
        where: {
          agentId: agent.id,
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

      agent.isEmailVerified = true;
      agent.emailVerifiedAt = new Date();
      await manager.save(agent);

      return {
        message: 'Email verified successfully',
        agent: this.toProfile(agent),
      };
    });
  }

  async resendVerificationCode(
    dto: ResendAgentVerificationCodeDto,
  ): Promise<{ message: string }> {
    const email = this.normalizeEmail(dto.email);
    const agent = await this.agentRepository.findOne({ where: { email } });

    // Timing-safe: return generic message regardless of existence or verification status
    if (agent && !agent.isEmailVerified) {
      await this.createAndSendCode(agent.id, agent.email, 'EMAIL_VERIFICATION');
    }

    return {
      message:
        'If an unverified account with that email exists, a new verification code has been sent.',
    };
  }

  async login(
    dto: LoginAgentDto,
  ): Promise<{ accessToken: string; agent: AgentProfile }> {
    const email = this.normalizeEmail(dto.email);
    const agent = await this.agentRepository.findOne({ where: { email } });

    // Timing-safe credential check to eliminate email enumeration timing attacks
    if (!agent) {
      await bcrypt.compare(dto.password, DUMMY_BCRYPT_HASH);
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    const isMatch = await bcrypt.compare(dto.password, agent.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    if (!agent.isEmailVerified) {
      throw new ForbiddenException({
        code: 'EMAIL_NOT_VERIFIED',
        message:
          'Email address is not verified. Please verify your email before logging in.',
      });
    }

    const payload: AgentJwtPayload = {
      sub: agent.id,
      email: agent.email,
      tokenVersion: agent.tokenVersion,
      accountType: 'agent',
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      agent: this.toProfile(agent),
    };
  }

  async changePassword(
    agentId: string,
    dto: ChangeAgentPasswordDto,
  ): Promise<{ message: string }> {
    const agent = await this.agentRepository.findOne({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundException({
        code: 'AGENT_NOT_FOUND',
        message: 'Agent account not found',
      });
    }

    const isMatch = await bcrypt.compare(
      dto.currentPassword,
      agent.passwordHash,
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

    agent.passwordHash = await bcrypt.hash(
      dto.newPassword,
      PASSWORD_SALT_ROUNDS,
    );
    // Invalidate existing sessions/tokens
    agent.tokenVersion += 1;
    await this.agentRepository.save(agent);

    return { message: 'Password changed successfully' };
  }

  async forgotPassword(dto: ForgotAgentPasswordDto): Promise<{ message: string }> {
    const email = this.normalizeEmail(dto.email);
    const agent = await this.agentRepository.findOne({ where: { email } });

    // Do not disclose whether email exists
    if (agent) {
      await this.createAndSendCode(agent.id, agent.email, 'PASSWORD_RESET');
    }

    return {
      message:
        'If an account with that email exists, a password reset code has been sent.',
    };
  }

  async resetPassword(dto: ResetAgentPasswordDto): Promise<{ message: string }> {
    const email = this.normalizeEmail(dto.email);
    const agent = await this.agentRepository.findOne({ where: { email } });

    if (!agent) {
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
      const activeCode = await manager.findOne(AgentVerificationCode, {
        where: {
          agentId: agent.id,
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

      agent.passwordHash = newPasswordHash;
      agent.tokenVersion += 1; // Invalidate all existing tokens
      await manager.save(agent);

      return { message: 'Password reset successfully' };
    });
  }
}
