import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Env } from '../../config/env.validation.js';
import { AgentsController } from './agents.controller.js';
import { AgentsService } from './agents.service.js';
import { AgentKycController } from './agent-kyc.controller.js';
import { AgentKycService } from './agent-kyc.service.js';
import { AgentUser } from './entities/agent-user.entity.js';
import { AgentVerificationCode } from './entities/agent-verification-code.entity.js';
import { AgentKycSubmission } from './entities/agent-kyc-submission.entity.js';
import { AgentJwtAuthGuard } from './guards/agent-jwt-auth.guard.js';
import { KycModule } from '../kyc/kyc.module.js';
import { AgentJwtStrategy } from './strategies/agent-jwt.strategy.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgentUser, AgentVerificationCode, AgentKycSubmission]),
    KycModule,
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
  controllers: [AgentsController, AgentKycController],
  providers: [AgentsService, AgentKycService, AgentJwtStrategy, AgentJwtAuthGuard],
  exports: [AgentsService, AgentKycService, AgentJwtAuthGuard],
})
export class AgentsModule {}
export { AgentsModule as AgentModule };
