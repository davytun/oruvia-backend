import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Env } from '../config/env.validation.js';
import { buildDataSourceOptions } from './database.config.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        ...buildDataSourceOptions({
          DB_HOST: config.getOrThrow('DB_HOST'),
          DB_PORT: config.getOrThrow('DB_PORT'),
          DB_USERNAME: config.getOrThrow('DB_USERNAME'),
          DB_PASSWORD: config.getOrThrow('DB_PASSWORD'),
          DB_NAME: config.getOrThrow('DB_NAME'),
          DB_SSL: config.getOrThrow('DB_SSL'),
          DB_LOGGING: config.getOrThrow('DB_LOGGING'),
        }),
        autoLoadEntities: true,
        // Fail fast at startup instead of retrying for ~30s.
        retryAttempts: 3,
      }),
    }),
  ],
})
export class DatabaseModule {}
