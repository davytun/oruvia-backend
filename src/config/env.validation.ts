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
  DB_MIGRATIONS_RUN: boolean;
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
  /** KYC document storage backend: `cloudinary` (production) or `local` (dev/test fallback). */
  KYC_STORAGE_PROVIDER: 'cloudinary' | 'local';
  KYC_UPLOAD_DIR: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  CLOUDINARY_KYC_FOLDER: string;
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
  DB_MIGRATIONS_RUN: Joi.boolean().default(false),

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

  KYC_STORAGE_PROVIDER: Joi.string()
    .valid('cloudinary', 'local')
    .default('local'),
  KYC_UPLOAD_DIR: Joi.string().default('uploads/kyc'),
  CLOUDINARY_CLOUD_NAME: Joi.string().allow('').default(''),
  CLOUDINARY_API_KEY: Joi.string().allow('').default(''),
  CLOUDINARY_API_SECRET: Joi.string().allow('').default(''),
  CLOUDINARY_KYC_FOLDER: Joi.string().default('oruvia/kyc'),
});

export function validateEnv(config: Record<string, unknown>): Env {
  const { value, error } = envSchema.validate(config, {
    abortEarly: false,
    allowUnknown: true,
  });

  if (error) {
    const problems = error.details.map((detail) => detail.message).join('; ');
    throw new Error(`Invalid environment configuration: ${problems}`);
  }

  if (value.NODE_ENV === 'production') {
    if (
      !config.JWT_SECRET ||
      value.JWT_SECRET === 'super-secret-seeker-jwt-key-for-dev-32chars'
    ) {
      throw new Error(
        'Invalid environment configuration: "JWT_SECRET" is required and cannot use the development default in production',
      );
    }

    // Local-disk KYC storage is a dev/test fallback only; production must use Cloudinary
    if (value.KYC_STORAGE_PROVIDER !== 'cloudinary') {
      throw new Error(
        'Invalid environment configuration: "KYC_STORAGE_PROVIDER" must be "cloudinary" in production',
      );
    }
  }

  if (value.KYC_STORAGE_PROVIDER === 'cloudinary') {
    const missing: string[] = [];
    if (!value.CLOUDINARY_CLOUD_NAME || value.CLOUDINARY_CLOUD_NAME.trim() === '') {
      missing.push('"CLOUDINARY_CLOUD_NAME" is required when KYC_STORAGE_PROVIDER is "cloudinary"');
    }
    if (!value.CLOUDINARY_API_KEY || value.CLOUDINARY_API_KEY.trim() === '') {
      missing.push('"CLOUDINARY_API_KEY" is required when KYC_STORAGE_PROVIDER is "cloudinary"');
    }
    if (!value.CLOUDINARY_API_SECRET || value.CLOUDINARY_API_SECRET.trim() === '') {
      missing.push('"CLOUDINARY_API_SECRET" is required when KYC_STORAGE_PROVIDER is "cloudinary"');
    }
    if (missing.length > 0) {
      throw new Error(`Invalid environment configuration: ${missing.join('; ')}`);
    }
  }

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
