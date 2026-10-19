import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Env } from '../../config/env.validation.js';
import { AdminsController } from './admins.controller.js';
import { AdminsService } from './admins.service.js';
import { AdminUser } from './entities/admin-user.entity.js';
import { AdminVerificationCode } from './entities/admin-verification-code.entity.js';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard.js';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminUser, AdminVerificationCode]),
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
  controllers: [AdminsController],
  providers: [AdminsService, AdminJwtStrategy, AdminJwtAuthGuard],
  exports: [AdminsService, AdminJwtAuthGuard],
})
export class AdminsModule {}
export { AdminsModule as AdminModule };
