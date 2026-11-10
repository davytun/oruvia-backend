/**
 * System / Health Check OpenAPI Paths
 */
export const healthPaths = {
  '/api/v1/health': {
    get: {
      tags: ['Health'],
      summary: 'Health check',
      responses: {
        '200': {
          description: 'Service is healthy',
          content: {
            'application/json': {
              example: {
                success: true,
                data: {
                  service: 'Oruvia',
                  tagline: 'Oruvia: Your path to a roof.',
                  environment: 'production',
                  status: 'healthy',
                  timestamp: '2026-11-10T08:00:00.000Z',
                },
              },
            },
          },
        },
      },
    },
  },
}
