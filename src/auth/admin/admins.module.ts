import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Env } from '../../config/env.validation.js';
import { AdminsController } from './admins.controller.js';
import { AdminsService } from './admins.service.js';
import { KycAdminController } from './kyc-admin.controller.js';
import { KycAdminService } from './kyc-admin.service.js';
import { AgentKycSubmission } from '../agent/entities/agent-kyc-submission.entity.js';
import { AgentUser } from '../agent/entities/agent-user.entity.js';
import { LandlordKycSubmission } from '../landlord/entities/landlord-kyc-submission.entity.js';
import { LandlordUser } from '../landlord/entities/landlord-user.entity.js';
import { KycModule } from '../kyc/kyc.module.js';
import { AdminUser } from './entities/admin-user.entity.js';
import { AdminVerificationCode } from './entities/admin-verification-code.entity.js';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard.js';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminUser,
      AdminVerificationCode,
      AgentKycSubmission,
      LandlordKycSubmission,
      AgentUser,
      LandlordUser,
    ]),
    KycModule,
    PassportModule.register({ defaultStrategy: 'admin-jwt' }),
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
            audience: 'oruvia-admin',
          },
        };
      },
    }),
  ],
  controllers: [AdminsController, KycAdminController],
  providers: [AdminsService, KycAdminService, AdminJwtStrategy, AdminJwtAuthGuard],
  exports: [AdminsService, KycAdminService, AdminJwtAuthGuard],
})
export class AdminsModule {}
export { AdminsModule as AdminModule };
