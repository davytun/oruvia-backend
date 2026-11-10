import { agentPaths } from './auth/agents.docs'
import { landlordPaths } from './auth/landlords.docs'
import { seekerPaths } from './auth/seekers.docs'
import { openApiSchemas } from './schemas'
import { healthPaths } from './system/health.docs'

/**
 * Assemble the complete OpenAPI 3.1 specification from modular domain folders
 * with `x-tagGroups` so Scalar renders nested folders (`System`, `Auth` -> `Seekers`, `Agents`, `Landlords`).
 */
export function buildOpenApiSpec(serverUrl = 'https://api.oruvia.workers.dev') {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Oruvia API',
      version: '1.0.0',
      description:
        'Oruvia Proptech & Real Estate Marketplace API — Connecting property seekers with verified landlords and real estate agents across Nigeria.\n\n### Pre-Verified Demo Accounts (Password: `Password123!`)\n| Role | Email | Badge |\n| :--- | :--- | :--- |\n| **Licensed Agent** | `agent.verified@oruvia.ng` | `licensed_agent` |\n| **Verified Agent** | `agent.standard@oruvia.ng` | `verified_agent` |\n| **Verified Owner (Landlord)** | `landlord.verified@oruvia.ng` | `verified_owner` |\n| **Verified Landlord** | `landlord.standard@oruvia.ng` | `verified_landlord` |\n| **Seeker** | `seeker.demo@oruvia.ng` | — |\n\n**Tagline:** Oruvia: Your path to a roof.',
    },
    servers: [
      {
        url: serverUrl,
        description: 'API Server',
      },
    ],
    tags: [
      {
        name: 'Health',
        description: 'Service status and health check endpoints',
      },
      {
        name: 'Seekers',
        description:
          'Authentication and profile endpoints for Property Seekers (`/api/v1/seekers/*`)',
      },
      {
        name: 'Agents',
        description:
          'Authentication, profile, and KYC verification endpoints for Real Estate Agents (`/api/v1/agents/*`)',
      },
      {
        name: 'Landlords',
        description:
          'Authentication, profile, and KYC verification endpoints for Property Owners & Landlords (`/api/v1/landlords/*`)',
      },
    ],
    'x-tagGroups': [
      {
        name: 'System',
        tags: ['Health'],
      },
      {
        name: 'Auth & KYC',
        tags: ['Seekers', 'Agents', 'Landlords'],
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'Pass the role-scoped `access_token` returned from `/register` or `/login`.',
        },
      },
      schemas: openApiSchemas,
    },
    paths: {
      ...healthPaths,
      ...seekerPaths,
      ...agentPaths,
      ...landlordPaths,
    },
  }
}
