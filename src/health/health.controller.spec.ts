import { ServiceUnavailableException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  const build = (query: () => Promise<unknown>) =>
    new HealthController({ query } as unknown as DataSource);

  it('reports ok when the database answers', async () => {
    const controller = build(() => Promise.resolve([{ '?column?': 1 }]));

    await expect(controller.check()).resolves.toEqual({
      status: 'ok',
      database: 'up',
    });
  });

  it('responds 503 without leaking the underlying error', async () => {
    const controller = build(() =>
      Promise.reject(new Error('password authentication failed')),
    );

    const error = await controller.check().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as ServiceUnavailableException).message).toBe(
      'Database unavailable',
    );
  });
});
