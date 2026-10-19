import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import type { Env } from '../../../config/env.validation.js';
import { AgentUser } from '../entities/agent-user.entity.js';
import type { AgentJwtPayload } from '../interfaces/jwt-payload.interface.js';

@Injectable()
export class AgentJwtStrategy extends PassportStrategy(
  Strategy,
  'agent-jwt',
) {
  constructor(
    config: ConfigService<Env, true>,
    @InjectRepository(AgentUser)
    private readonly agentRepository: Repository<AgentUser>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      issuer: 'oruvia-api',
      audience: 'oruvia-agent',
    });
  }

  async validate(payload: AgentJwtPayload): Promise<AgentUser> {
    if (payload.accountType !== 'agent' || !payload.sub) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid token payload',
      });
    }

    const agent = await this.agentRepository.findOne({
      where: { id: payload.sub },
    });

    if (!agent) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Agent account not found',
      });
    }

    // Invalidate tokens issued before password changes/resets
    if (agent.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Token has been revoked',
      });
    }

    return agent;
  }
}
