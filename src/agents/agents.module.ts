import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Env } from '../config/env.validation.js';
import { AgentsController } from './agents.controller.js';
import { AgentsService } from './agents.service.js';
import { AgentUser } from './entities/agent-user.entity.js';
import { AgentVerificationCode } from './entities/agent-verification-code.entity.js';
import { AgentJwtAuthGuard } from './guards/agent-jwt-auth.guard.js';
import { AgentJwtStrategy } from './strategies/agent-jwt.strategy.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgentUser, AgentVerificationCode]),
    PassportModule.register({ defaultStrategy: 'agent-jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const expiresIn =
          config.get<string>('JWT_EXPIRES_IN', { infer: true }) ?? '1d';
        return {
          secret: config.getOrThrow<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: expiresIn as any,
            issuer: 'oruvia-api',
            audience: 'oruvia-agent',
          },
        };
      },
    }),
  ],
  controllers: [AgentsController],
  providers: [AgentsService, AgentJwtStrategy, AgentJwtAuthGuard],
  exports: [AgentsService, AgentJwtAuthGuard],
})
export class AgentsModule {}
