import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import type { Env } from '../../../config/env.validation.js';
import { AdminUser } from '../entities/admin-user.entity.js';
import type { AdminJwtPayload } from '../interfaces/jwt-payload.interface.js';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    configService: ConfigService<Env, true>,
    @InjectRepository(AdminUser)
    private readonly adminRepository: Repository<AdminUser>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      issuer: 'oruvia-api',
      audience: 'oruvia-admin',
    });
  }

  async validate(payload: AdminJwtPayload): Promise<AdminUser> {
    if (!payload?.sub || payload.accountType !== 'admin') {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid admin token payload',
      });
    }

    const admin = await this.adminRepository.findOne({
      where: { id: payload.sub },
    });

    if (!admin) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Admin account not found',
      });
    }

    if (admin.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Session has expired or been revoked',
      });
    }

    if (admin.status !== 'ACTIVE') {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Admin account is inactive or suspended',
      });
    }

    return admin;
  }
}
