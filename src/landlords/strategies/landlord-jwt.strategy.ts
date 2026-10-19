import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import type { Env } from '../../config/env.validation.js';
import { LandlordUser } from '../entities/landlord-user.entity.js';
import type { LandlordJwtPayload } from '../interfaces/jwt-payload.interface.js';

@Injectable()
export class LandlordJwtStrategy extends PassportStrategy(
  Strategy,
  'landlord-jwt',
) {
  constructor(
    config: ConfigService<Env, true>,
    @InjectRepository(LandlordUser)
    private readonly landlordRepository: Repository<LandlordUser>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      issuer: 'oruvia-api',
      audience: 'oruvia-landlord',
    });
  }

  async validate(payload: LandlordJwtPayload): Promise<LandlordUser> {
    if (payload.accountType !== 'landlord' || !payload.sub) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid token payload',
      });
    }

    const landlord = await this.landlordRepository.findOne({
      where: { id: payload.sub },
    });

    if (!landlord) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Landlord account not found',
      });
    }

    // Invalidate tokens issued before password changes/resets
    if (landlord.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Token has been revoked',
      });
    }

    return landlord;
  }
}
