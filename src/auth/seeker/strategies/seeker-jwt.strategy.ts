import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import type { Env } from '../../../config/env.validation.js';
import { SeekerUser } from '../entities/seeker-user.entity.js';
import type { SeekerJwtPayload } from '../interfaces/jwt-payload.interface.js';

@Injectable()
export class SeekerJwtStrategy extends PassportStrategy(Strategy, 'seeker-jwt') {
  constructor(
    config: ConfigService<Env, true>,
    @InjectRepository(SeekerUser)
    private readonly seekerRepository: Repository<SeekerUser>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      issuer: 'oruvia-api',
      audience: 'oruvia-seeker',
    });
  }

  async validate(payload: SeekerJwtPayload): Promise<SeekerUser> {
    if (payload.accountType !== 'seeker' || !payload.sub) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid token payload',
      });
    }

    const seeker = await this.seekerRepository.findOne({
      where: { id: payload.sub },
    });

    if (!seeker) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Seeker account not found',
      });
    }

    // Invalidate tokens issued before password changes/resets
    if (seeker.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Token has been revoked',
      });
    }

    return seeker;
  }
}
