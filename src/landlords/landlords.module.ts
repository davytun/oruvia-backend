import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Env } from '../config/env.validation.js';
import { LandlordUser } from './entities/landlord-user.entity.js';
import { LandlordVerificationCode } from './entities/landlord-verification-code.entity.js';
import { LandlordJwtAuthGuard } from './guards/landlord-jwt-auth.guard.js';
import { LandlordsController } from './landlords.controller.js';
import { LandlordsService } from './landlords.service.js';
import { LandlordJwtStrategy } from './strategies/landlord-jwt.strategy.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([LandlordUser, LandlordVerificationCode]),
    PassportModule.register({ defaultStrategy: 'landlord-jwt' }),
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
            audience: 'oruvia-landlord',
          },
        };
      },
    }),
  ],
  controllers: [LandlordsController],
  providers: [LandlordsService, LandlordJwtStrategy, LandlordJwtAuthGuard],
  exports: [LandlordsService, LandlordJwtAuthGuard],
})
export class LandlordsModule {}
