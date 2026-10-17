import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Env } from '../config/env.validation.js';
import { SeekerUser } from './entities/seeker-user.entity.js';
import { SeekerVerificationCode } from './entities/seeker-verification-code.entity.js';
import { SeekerJwtAuthGuard } from './guards/seeker-jwt-auth.guard.js';
import { SeekersController } from './seekers.controller.js';
import { SeekersService } from './seekers.service.js';
import { SeekerJwtStrategy } from './strategies/seeker-jwt.strategy.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([SeekerUser, SeekerVerificationCode]),
    PassportModule.register({ defaultStrategy: 'seeker-jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const expiresIn = config.get<string>('JWT_EXPIRES_IN', { infer: true }) ?? '1d';
        return {
          secret: config.getOrThrow<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: expiresIn as any,
            issuer: 'oruvia-api',
            audience: 'oruvia-seeker',
          },
        };
      },
    }),
  ],
  controllers: [SeekersController],
  providers: [SeekersService, SeekerJwtStrategy, SeekerJwtAuthGuard],
  exports: [SeekersService, SeekerJwtAuthGuard],
})
export class SeekersModule {}
