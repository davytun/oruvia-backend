import {
  Controller,
  Get,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly dataSource: DataSource) {}

  /** Succeeds only if the app is up and PostgreSQL answers a real query. */
  @Get()
  async check() {
    try {
      await this.dataSource.query('SELECT 1');
    } catch (error) {
      this.logger.error(
        `Database health check failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw new ServiceUnavailableException('Database unavailable');
    }

    return { status: 'ok', database: 'up' };
  }
}
