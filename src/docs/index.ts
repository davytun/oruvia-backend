import { adminAuthPaths } from './admin/auth.docs'
import { adminCatalogPaths } from './admin/catalog.docs'
import { adminKycPaths } from './admin/kyc.docs'
import { adminListingPaths } from './admin/listings.docs'
import { agentPaths } from './auth/agents.docs'
import { landlordPaths } from './auth/landlords.docs'
import { seekerPaths } from './auth/seekers.docs'
import { publicCatalogPaths } from './marketplace/catalog.docs'
import {
  agentListingPaths,
  landlordListingPaths,
  publicListingPaths,
} from './marketplace/listings.docs'
import { openApiSchemas } from './schemas'
import { healthPaths } from './system/health.docs'

/**
 * Assemble the complete OpenAPI 3.1 specification from modular domain folders
 * with `x-tagGroups` so Scalar renders nested folders (`System`, `Auth & KYC`, `Marketplace & Listings`, `Admin`).
 */
export function buildOpenApiSpec(serverUrl = 'https://api.oruvia.workers.dev') {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Oruvia API',
      version: '1.0.0',
      description:
        'Oruvia Proptech & Real Estate Marketplace API — Connecting property seekers with verified landlords and real estate agents across Nigeria.\n\n### Pre-Verified Demo Accounts (Password: `Password123!`)\n| Role | Email | Badge / Admin Role |\n| :--- | :--- | :--- |\n| **Super Admin** | `admin@oruvia.ng` | `super_admin` |\n| **Regular Admin** | `kyc.admin@oruvia.ng` | `admin` |\n| **Licensed Agent** | `agent.verified@oruvia.ng` | `licensed_agent` |\n| **Verified Agent** | `agent.standard@oruvia.ng` | `verified_agent` |\n| **Pending Agent** | `agent.pending@oruvia.ng` | *(pending KYC)* |\n| **Verified Owner (Landlord)** | `landlord.verified@oruvia.ng` | `verified_owner` |\n| **Verified Landlord** | `landlord.standard@oruvia.ng` | `verified_landlord` |\n| **Pending Landlord** | `landlord.pending@oruvia.ng` | *(pending KYC)* |\n| **Seeker** | `seeker.demo@oruvia.ng` | — |\n\n**Tagline:** Oruvia: Your path to a roof.',
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
      {
        name: 'Catalog & Discovery',
        description:
          'Public lookups for supported States, Cities, and authentic Nigerian House Types (`/api/v1/locations`, `/api/v1/property-types`)',
      },
      {
        name: 'Listings Discovery',
        description:
          'Public property search and details with full Nigerian pricing package breakdown (`/api/v1/listings/*`)',
      },
      {
        name: 'Agent Listings',
        description:
          'Property listing creation, photo upload, availability updates, and management for verified Agents (`/api/v1/agents/listings/*`)',
      },
      {
        name: 'Landlord Listings',
        description:
          'Property listing creation, photo upload, availability updates, and management for verified Landlords (`/api/v1/landlords/listings/*`)',
      },
      {
        name: 'Admin Auth & Management',
        description:
          'Admin authentication, profile, and Super Admin provisioning/suspension of Admin accounts (`/api/v1/admins/*`)',
      },
      {
        name: 'Admin KYC Verification',
        description:
          'Admin KYC document verification for Agents and Landlords (`/api/v1/admins/kyc/*`)',
      },
      {
        name: 'Admin Locations & House Types',
        description:
          'Admin management of supported States, Cities, and Nigerian Property Types (`/api/v1/admins/locations/*`, `/api/v1/admins/property-types/*`)',
      },
      {
        name: 'Admin Listing Moderation',
        description:
          'Admin review queue, approval, rejection, and suspension of property listings (`/api/v1/admins/listings/*`)',
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
      {
        name: 'Marketplace & Listings',
        tags: [
          'Catalog & Discovery',
          'Listings Discovery',
          'Agent Listings',
          'Landlord Listings',
        ],
      },
      {
        name: 'Admin',
        tags: [
          'Admin Auth & Management',
          'Admin KYC Verification',
          'Admin Locations & House Types',
          'Admin Listing Moderation',
        ],
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
      ...publicCatalogPaths,
      ...publicListingPaths,
      ...agentListingPaths,
      ...landlordListingPaths,
      ...adminAuthPaths,
      ...adminKycPaths,
      ...adminCatalogPaths,
      ...adminListingPaths,
    },
  }
}
