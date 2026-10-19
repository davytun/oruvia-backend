import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor.js';
import {
  REQUEST_ID_HEADER,
  requestIdMiddleware,
} from './common/middleware/request-id.middleware.js';
import { createValidationPipe } from './common/pipes/validation.pipe.js';
import type { Env } from './config/env.validation.js';

import { Logger } from 'nestjs-pino';

export const API_PREFIX = 'api/v1';

// Express's default, made explicit. JSON bodies here are small; file uploads
// will use multipart and get their own limits when that feature exists.
const BODY_LIMIT = '100kb';

export function setupSwagger(app: NestExpressApplication): void {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Oruvia Backend API')
    .setDescription(
      'Developer API documentation for the Oruvia housing platform. Features isolated multi-role authentication (Seekers, Landlords, Agents, and Admin modules), secure JWT lifecycle with session invalidation, HMAC-SHA256 verification codes, Nodemailer & React Email delivery, and health checks.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your Bearer access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag(
      'Seekers Authentication',
      'Registration, login, email verification, password management, and profile access for seekers',
    )
    .addTag(
      'Landlords Authentication',
      'Registration, login, email verification, password management, and profile access for landlords',
    )
    .addTag(
      'Agents Authentication',
      'Registration, login, email verification, password management, and profile access for agents',
    )
    .addTag(
      'Admin Authentication',
      'Administrative authentication, status enforcement, password recovery, and profile access for platform administrators',
    )
    .addTag(
      'Health',
      'Application liveness and PostgreSQL connectivity check',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'Oruvia API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
    },
  });
}

/**
 * Application-wide settings shared by `main.ts` and the e2e tests so both run
 * the app exactly as it is configured in production.
 */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  // Wire Pino structured logger if present in application context
  try {
    const logger = app.get(Logger);
    if (logger) {
      app.useLogger(logger);
    }
  } catch {
    // When running in bare test harnesses without LoggerModule, preserve default logger
  }

  app.setGlobalPrefix(API_PREFIX);

  // Registered first so every later stage (including body-parser failures)
  // already has a request ID.
  app.use(requestIdMiddleware);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          styleSrc: [`'self'`, `'unsafe-inline'`],
          imgSrc: [`'self'`, 'data:', 'https:'],
          scriptSrc: [`'self'`, `'unsafe-inline'`, `'unsafe-eval'`],
        },
      },
    }),
  );

  // Prevent client IP spoofing via forged X-Forwarded-For headers.
  // Explicitly false by default; enable only with specific trusted hop counts or CIDRs.
  const trustProxy = config.get<string>('TRUST_PROXY', { infer: true })?.trim();
  if (trustProxy) {
    const hops = Number(trustProxy);
    app.set('trust proxy', Number.isNaN(hops) ? trustProxy : hops);
  } else {
    app.set('trust proxy', false);
  }

  app.useBodyParser('json', { limit: BODY_LIMIT });
  app.useBodyParser('urlencoded', { limit: BODY_LIMIT, extended: true });

  const corsOrigins = config
    .getOrThrow<string>('CORS_ORIGINS')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (corsOrigins.length > 0) {
    app.enableCors({
      origin: corsOrigins,
      exposedHeaders: [REQUEST_ID_HEADER],
    });
  }

  // Outermost first: the logging interceptor times the whole handler, the
  // envelope wraps the result. Errors bypass both and go to the filter.
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseEnvelopeInterceptor(),
  );
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());

  // Configure interactive OpenAPI documentation (/docs)
  setupSwagger(app);

  // Lets Nest close the HTTP server and the DB pool on SIGTERM/SIGINT.
  app.enableShutdownHooks();
}
