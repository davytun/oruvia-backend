import type { AppBindings } from '../config/env'

export function getHealthStatus(env?: AppBindings) {
  return {
    service: env?.APP_NAME || 'Oruvia',
    tagline: 'Oruvia: Your path to a roof.',
    environment: env?.APP_ENV || 'development',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  }
}

