import Joi from 'joi';

export interface Env {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent';
  /** Comma-separated list of allowed browser origins. Empty disables CORS. */
  CORS_ORIGINS: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  DB_SSL: boolean;
  DB_LOGGING: boolean;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  EMAIL_PROVIDER: 'console' | 'smtp';
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_SECURE: boolean;
  SMTP_USER: string;
  SMTP_PASS: string;
  EMAIL_FROM: string;
  TRUST_PROXY: string;
}

const envSchema = Joi.object<Env, true>({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  LOG_LEVEL: Joi.string()
    .valid('debug', 'info', 'warn', 'error', 'fatal', 'silent')
    .default('info'),
  CORS_ORIGINS: Joi.string().allow('').default(''),

  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().port().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_SSL: Joi.boolean().default(false),
  DB_LOGGING: Joi.boolean().default(false),

  JWT_SECRET: Joi.string()
    .min(32)
    .default('super-secret-seeker-jwt-key-for-dev-32chars'),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  EMAIL_PROVIDER: Joi.string().valid('console', 'smtp').default('console'),
  SMTP_HOST: Joi.string().allow('').default(''),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().allow('').default(''),
  SMTP_PASS: Joi.string().allow('').default(''),
  EMAIL_FROM: Joi.string().default('noreply@oruvia.com'),
  TRUST_PROXY: Joi.string().allow('').default(''),
});

/**
 * Validates raw environment variables and applies defaults. Used by
 * `ConfigModule` at startup and by the TypeORM CLI data source, so the app
 * and the migration tooling always agree on the same rules.
 *
 * Error messages only reference variable names, never values.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const { value, error } = envSchema.validate(config, {
    abortEarly: false,
    allowUnknown: true,
  });

  if (error) {
    const problems = error.details.map((detail) => detail.message).join('; ');
    throw new Error(`Invalid environment configuration: ${problems}`);
  }

  // Enforce strong, non-default JWT secret in production
  if (value.NODE_ENV === 'production') {
    if (
      !config.JWT_SECRET ||
      value.JWT_SECRET === 'super-secret-seeker-jwt-key-for-dev-32chars'
    ) {
      throw new Error(
        'Invalid environment configuration: "JWT_SECRET" is required and cannot use the development default in production',
      );
    }
  }

  // Enforce required SMTP credentials and host when EMAIL_PROVIDER is 'smtp'
  if (value.EMAIL_PROVIDER === 'smtp') {
    const missing: string[] = [];
    if (!value.SMTP_HOST || value.SMTP_HOST.trim() === '') {
      missing.push('"SMTP_HOST" is required when EMAIL_PROVIDER is "smtp"');
    }
    if (!value.SMTP_USER || value.SMTP_USER.trim() === '') {
      missing.push('"SMTP_USER" is required when EMAIL_PROVIDER is "smtp"');
    }
    if (!value.SMTP_PASS || value.SMTP_PASS.trim() === '') {
      missing.push('"SMTP_PASS" is required when EMAIL_PROVIDER is "smtp"');
    }
    if (!value.EMAIL_FROM || value.EMAIL_FROM.trim() === '') {
      missing.push('"EMAIL_FROM" is required when EMAIL_PROVIDER is "smtp"');
    }
    if (missing.length > 0) {
      throw new Error(`Invalid environment configuration: ${missing.join('; ')}`);
    }
  }

  return value;
}
