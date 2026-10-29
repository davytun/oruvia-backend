import type { DataSourceOptions } from 'typeorm';
import type { Env } from '../config/env.validation.js';

export type DatabaseEnv = Pick<
  Env,
  | 'DB_HOST'
  | 'DB_PORT'
  | 'DB_USERNAME'
  | 'DB_PASSWORD'
  | 'DB_NAME'
  | 'DB_SSL'
  | 'DB_LOGGING'
  | 'DB_MIGRATIONS_RUN'
>;

// Globs are resolved against the compiled output (dist/), and TypeORM expects
// forward slashes even on Windows.
const srcDir = `${import.meta.dirname}/..`.replaceAll('\\', '/');

export function buildDataSourceOptions(env: DatabaseEnv): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl: env.DB_SSL ? { rejectUnauthorized: true } : false,
    synchronize: false,
    migrationsRun: env.DB_MIGRATIONS_RUN ?? false,
    logging: env.DB_LOGGING ? ['error', 'warn', 'migration'] : ['error'],
    entities: [`${srcDir}/**/*.entity.js`],
    migrations: [`${srcDir}/database/migrations/*.js`],
    migrationsTableName: 'migrations',
  };
}
