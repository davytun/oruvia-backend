import { Logger as NestLogger, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation.js';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { Env } from './config/env.validation.js';
import { ConfigService } from '@nestjs/config';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { LoggingModule } from './logging/logging.module.js';
import { MailModule } from './mail/mail.module.js';
import { LandlordsModule } from './landlords/landlords.module.js';
import { SeekersModule } from './seekers/seekers.module.js';
import { AgentsModule } from './agents/agents.module.js';

@Module({
  imports: [
    LoggingModule,
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const isTest = config.get('NODE_ENV') === 'test';
        return [
          {
            name: 'default',
            ttl: 60000,
            limit: isTest ? 1000 : 100,
          },
          {
            name: 'auth',
            ttl: 60000,
            limit: isTest ? 1000 : 10,
          },
        ];
      },
    }),
    DatabaseModule,
    HealthModule,
    MailModule,
    SeekersModule,
    LandlordsModule,
    AgentsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements OnApplicationShutdown {
  private readonly logger = new NestLogger('AppLifecycle');

  onApplicationShutdown(signal?: string): void {
    this.logger.log(
      { signal: signal ?? 'MANUAL' },
      `Application shutdown initiated via signal: ${signal ?? 'MANUAL'}`,
    );
  }
}
