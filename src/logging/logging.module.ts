import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import type { Env } from '../config/env.validation.js';
import { buildPinoHttpOptions } from './pino.config.js';

@Global()
@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: buildPinoHttpOptions(config),
      }),
    }),
  ],
  exports: [LoggerModule],
})
export class LoggingModule {}
