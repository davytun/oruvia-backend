import Joi from 'joi';

export interface Env {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  /** Comma-separated list of allowed browser origins. Empty disables CORS. */
  CORS_ORIGINS: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  DB_SSL: boolean;
  DB_LOGGING: boolean;
}

const envSchema = Joi.object<Env, true>({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  CORS_ORIGINS: Joi.string().allow('').default(''),

  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().port().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_SSL: Joi.boolean().default(false),
  DB_LOGGING: Joi.boolean().default(false),
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

  return value;
}
