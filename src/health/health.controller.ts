import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  /** Succeeds only if the app is up and PostgreSQL answers a real query. */
  @Get()
  @ApiOperation({
    summary: 'Health and database connectivity check',
    description:
      'Pings the PostgreSQL database with `SELECT 1`. Returns 200 with database status or 503 if unreachable.',
  })
  @ApiOkResponse({
    description: 'Service is operational and database connection is healthy.',
    schema: {
      example: {
        status: 'ok',
        database: 'up',
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service Unavailable - PostgreSQL database is unreachable.',
  })
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
