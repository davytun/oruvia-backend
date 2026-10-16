import { DataSource } from 'typeorm';
import { validateEnv } from '../config/env.validation.js';
import { buildDataSourceOptions } from './database.config.js';

/**
 * Entry point for the TypeORM CLI only (see the `migration:*` scripts in
 * package.json). The application itself uses `DatabaseModule`.
 * Environment variables are loaded by `node --env-file=.env`.
 */
export default new DataSource(buildDataSourceOptions(validateEnv(process.env)));
