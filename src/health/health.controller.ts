import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  /** Succeeds only if the app is up and PostgreSQL answers a real query. */
  @Get()
  async check() {
    try {
      await this.dataSource.query('SELECT 1');
    } catch (error) {
      // The client only sees the safe message; the global exception filter logs
      // the cause (with the request ID) server-side.
      throw new ServiceUnavailableException('Database unavailable', {
        cause: error,
      });
    }

    return { status: 'ok', database: 'up' };
  }
}
