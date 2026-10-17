import type { ConfigService } from '@nestjs/config';
import type { Params } from 'nestjs-pino';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { pino } from 'pino';
import {
  REQUEST_ID_HEADER,
  VALID_INBOUND_ID,
} from '../common/middleware/request-id.middleware.js';
import type { Env } from '../config/env.validation.js';

export const SENSITIVE_REDACTION_PATHS = [
  'password',
  '*.password',
  '*.*.password',
  '*.*.*.password',
  'passwordHash',
  '*.passwordHash',
  '*.*.passwordHash',
  'password_hash',
  '*.password_hash',
  '*.*.password_hash',
  'token',
  '*.token',
  '*.*.token',
  'accessToken',
  '*.accessToken',
  '*.*.accessToken',
  'refreshToken',
  '*.refreshToken',
  '*.*.refreshToken',
  'token_version',
  '*.token_version',
  '*.*.token_version',
  'tokenVersion',
  '*.tokenVersion',
  '*.*.tokenVersion',
  'code',
  '*.code',
  '*.*.code',
  'verificationCode',
  '*.verificationCode',
  '*.*.verificationCode',
  'resetCode',
  '*.resetCode',
  '*.*.resetCode',
  'authorization',
  '*.authorization',
  'cookie',
  '*.cookie',
  'set-cookie',
  '*.set-cookie',
  'req.headers.authorization',
  'req.headers.cookie',
  'headers.authorization',
  'headers.cookie',
  'res.headers["set-cookie"]',
  'JWT_SECRET',
  '*.JWT_SECRET',
  'SMTP_PASS',
  '*.SMTP_PASS',
  'DB_PASSWORD',
  '*.DB_PASSWORD',
  'smtpPass',
  '*.smtpPass',
  'dbPassword',
  '*.dbPassword',
];

export function buildPinoHttpOptions(
  config: ConfigService<Env, true>,
): Params['pinoHttp'] {
  const nodeEnv = config.get<string>('NODE_ENV', 'development');
  const logLevel = config.get<string>('LOG_LEVEL', 'info');
  const isPretty = nodeEnv === 'development';

  return {
    level: logLevel,
    // Auto-logging is disabled because HTTP request lifecycle completion is
    // handled cleanly by LoggingInterceptor (success) and AllExceptionsFilter (errors),
    // ensuring exactly ONE log entry per request with zero duplicate records.
    autoLogging: false,
    base: {
      service: 'oruvia-backend',
      environment: nodeEnv,
    },
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
    formatters: {
      level: (label: string) => ({ level: label }),
    },
    serializers: {
      req: (req: unknown) => {
        if (!req || typeof req !== 'object') return req;
        const rawReq = req as {
          id?: string;
          method?: string;
          url?: string;
        };
        return {
          id: rawReq.id,
          method: rawReq.method,
          url: rawReq.url ? rawReq.url.split('?')[0] : rawReq.url,
        };
      },
      err: (err: unknown) => {
        if (!err || typeof err !== 'object') return err;
        const serialized = pino.stdSerializers.err(err as Error);
        // Ensure sensitive database parameters or query credentials cannot leak
        if (
          serialized &&
          'parameters' in (serialized as Record<string, unknown>)
        ) {
          delete (serialized as Record<string, unknown>).parameters;
        }
        return serialized;
      },
    },
    redact: {
      paths: SENSITIVE_REDACTION_PATHS,
      censor: '[REDACTED]',
    },
    genReqId: (req: IncomingMessage, res: ServerResponse) => {
      const existing =
        (res as unknown as { locals?: { requestId?: string } }).locals
          ?.requestId ||
        (req.headers[REQUEST_ID_HEADER.toLowerCase()] as string | undefined);
      if (existing && VALID_INBOUND_ID.test(existing)) {
        return existing;
      }
      return (
        (res as unknown as { locals?: { requestId?: string } }).locals
          ?.requestId ?? 'unknown'
      );
    },
    transport: isPretty
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            singleLine: false,
          },
        }
      : undefined,
  };
}
