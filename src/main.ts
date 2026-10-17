import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { configureApp, API_PREFIX } from './app.setup.js';
import type { Env } from './config/env.validation.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(Logger);
  app.useLogger(logger);

  configureApp(app);

  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const port = config.getOrThrow<number>('PORT');
  const nodeEnv = config.getOrThrow<string>('NODE_ENV');
  const dbHost = config.get<string>('DB_HOST');
  const dbPort = config.get<number>('DB_PORT');
  const dbName = config.get<string>('DB_NAME');
  const emailProvider = config.get<string>('EMAIL_PROVIDER');
  const corsOrigins = config.get<string>('CORS_ORIGINS');

  await app.listen(port);

  logger.log(
    {
      port,
      environment: nodeEnv,
      database: { host: dbHost, port: dbPort, name: dbName },
      emailProvider,
      corsConfigured: Boolean(corsOrigins),
      apiPrefix: API_PREFIX,
      docsUrl: '/docs',
      msg: `Application started successfully on port ${port} [env=${nodeEnv}]`,
    },
    'Bootstrap',
  );
}
await bootstrap();

