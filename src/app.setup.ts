import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
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

export const API_PREFIX = 'api/v1';

// Express's default, made explicit. JSON bodies here are small; file uploads
// will use multipart and get their own limits when that feature exists.
const BODY_LIMIT = '100kb';

/**
 * Application-wide settings shared by `main.ts` and the e2e tests so both run
 * the app exactly as it is configured in production.
 */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.setGlobalPrefix(API_PREFIX);

  // Registered first so every later stage (including body-parser failures)
  // already has a request ID.
  app.use(requestIdMiddleware);
  app.use(helmet());

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

  // Lets Nest close the HTTP server and the DB pool on SIGTERM/SIGINT.
  app.enableShutdownHooks();
}
