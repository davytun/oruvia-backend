import { adminAuthPaths } from './admin/auth.docs'
import { adminCatalogPaths } from './admin/catalog.docs'
import { adminInquiryPaths } from './admin/inquiries.docs'
import { adminInspectionPaths } from './admin/inspections.docs'
import { adminKycPaths } from './admin/kyc.docs'
import { adminListingPaths } from './admin/listings.docs'
import { adminPropertyVerificationPaths } from './admin/property-verification.docs'
import { adminReportPaths } from './admin/reports.docs'
import { adminReviewPaths } from './admin/reviews.docs'
import { agentPaths } from './auth/agents.docs'
import { landlordPaths } from './auth/landlords.docs'
import { seekerPaths } from './auth/seekers.docs'
import { publicCatalogPaths } from './marketplace/catalog.docs'
import { favoritePaths } from './marketplace/favorites.docs'
import {
  agentInquiryPaths,
  landlordInquiryPaths,
  seekerInquiryPaths,
} from './marketplace/inquiries.docs'
import {
  agentInspectionPaths,
  inspectionPaths,
  landlordInspectionPaths,
} from './marketplace/inspections.docs'
import {
  agentListingPaths,
  landlordListingPaths,
  publicListingPaths,
} from './marketplace/listings.docs'
import {
  agentPropertyVerificationPaths,
  landlordPropertyVerificationPaths,
} from './marketplace/property-verification.docs'
import {
  agentReportPaths,
  landlordReportPaths,
  seekerReportPaths,
} from './marketplace/reports.docs'
import {
  agentReviewPaths,
  landlordReviewPaths,
  publicReviewPaths,
  seekerReviewPaths,
} from './marketplace/reviews.docs'
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
        name: 'Favorites',
        description:
          'Save, toggle, list, and remove favorite property listings for Seekers (`/api/v1/seekers/favorites/*`)',
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
      {
        name: 'Inspections - Public Slots',
        description:
          'Public inspection slot calculation taking into account windows, blocked dates, notice hours, and conflicts (`/api/v1/listings/:idOrSlug/inspection-slots`)',
      },
      {
        name: 'Inspections - Seekers',
        description:
          'Inspection requests, reschedule proposals, cancellations, and timeline tracking for verified Seekers (`/api/v1/seekers/inspections/*`)',
      },
      {
        name: 'Inspections - Agents',
        description:
          'Inspection scheduling configuration, weekly availability windows, blackout dates, booking approvals, reschedule negotiation, and fee auditing for verified Agents (`/api/v1/agents/inspections/*`, `/api/v1/agents/inspection-settings`, etc.)',
      },
      {
        name: 'Inspections - Landlords',
        description:
          'Inspection scheduling configuration, weekly availability windows, blackout dates, booking approvals, reschedule negotiation, and fee auditing for verified Landlords (`/api/v1/landlords/inspections/*`, `/api/v1/landlords/inspection-settings`, etc.)',
      },
      {
        name: 'Admin - Inspection Moderation',
        description:
          'Admin oversight, status override, direct reschedule, cancellation, and fee auditing for property inspections (`/api/v1/admins/inspections/*`)',
      },
      {
        name: 'Inquiries - Seekers',
        description:
          'Start and continue property inquiries, track unread messages, and close conversations (`/api/v1/seekers/inquiries/*`)',
      },
      {
        name: 'Inquiries - Agents',
        description:
          'Receive and reply to property inquiries, track unread messages, and close conversations for Agents (`/api/v1/agents/inquiries/*`)',
      },
      {
        name: 'Inquiries - Landlords',
        description:
          'Receive and reply to property inquiries, track unread messages, and close conversations for Landlords (`/api/v1/landlords/inquiries/*`)',
      },
      {
        name: 'Inquiries - Real-Time WebSocket',
        description:
          'Cloudflare Durable Object WebSocket room (`/api/v1/inquiries/:id/ws`) for instant message push, typing indicators, live read receipts, and presence.',
      },
      {
        name: 'Admin - Inquiry Oversight',
        description:
          'Read-only Admin oversight of platform-wide property inquiry conversations (`/api/v1/admins/inquiries/*`)',
      },
      {
        name: 'Admin - Property Verification',
        description:
          'Admin review and approval of listing-level property ownership documents and physical site inspection requests (`/api/v1/admins/property-verifications/*`)',
      },
      {
        name: 'Reviews - Public',
        description:
          'Publicly visible property listing and lister (Agent/Landlord) reviews and rating breakdowns',
      },
      {
        name: 'Reviews - Seekers',
        description:
          'Seeker review submission, editing, and deletion (`/api/v1/seekers/reviews/*`)',
      },
      {
        name: 'Reviews - Agents',
        description:
          'Agent review inbox and reply management (`/api/v1/agents/reviews/*`)',
      },
      {
        name: 'Reviews - Landlords',
        description:
          'Landlord review inbox and reply management (`/api/v1/landlords/reviews/*`)',
      },
      {
        name: 'Admin - Reviews',
        description:
          'Platform-wide review moderation (hide, restore, delete) (`/api/v1/admins/reviews/*`)',
      },
      {
        name: 'Reports - Seekers',
        description:
          'Seeker submission and tracking of listing and user reports (`/api/v1/seekers/reports/*`)',
      },
      {
        name: 'Reports - Agents',
        description:
          'Agent submission and tracking of listing and user reports (`/api/v1/agents/reports/*`)',
      },
      {
        name: 'Reports - Landlords',
        description:
          'Landlord submission and tracking of listing and user reports (`/api/v1/landlords/reports/*`)',
      },
      {
        name: 'Admin - Reports & Moderation',
        description:
          'Admin review of listing and user reports and fraud enforcement actions (`/api/v1/admins/reports/*`)',
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
          'Favorites',
          'Agent Listings',
          'Landlord Listings',
        ],
      },
      {
        name: 'Inspections',
        tags: [
          'Inspections - Public Slots',
          'Inspections - Seekers',
          'Inspections - Agents',
          'Inspections - Landlords',
        ],
      },
      {
        name: 'Inquiries & Messaging',
        tags: [
          'Inquiries - Seekers',
          'Inquiries - Agents',
          'Inquiries - Landlords',
          'Inquiries - Real-Time WebSocket',
        ],
      },
      {
        name: 'Reviews & Ratings',
        tags: [
          'Reviews - Public',
          'Reviews - Seekers',
          'Reviews - Agents',
          'Reviews - Landlords',
        ],
      },
      {
        name: 'Reports & Safety',
        tags: [
          'Reports - Seekers',
          'Reports - Agents',
          'Reports - Landlords',
        ],
      },
      {
        name: 'Admin',
        tags: [
          'Admin Auth & Management',
          'Admin KYC Verification',
          'Admin Locations & House Types',
          'Admin Listing Moderation',
          'Admin - Property Verification',
          'Admin - Inspection Moderation',
          'Admin - Inquiry Oversight',
          'Admin - Reviews',
          'Admin - Reports & Moderation',
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
      ...favoritePaths,
      ...agentListingPaths,
      ...agentPropertyVerificationPaths,
      ...landlordListingPaths,
      ...landlordPropertyVerificationPaths,
      ...inspectionPaths,
      ...agentInspectionPaths,
      ...landlordInspectionPaths,
      ...seekerInquiryPaths,
      ...agentInquiryPaths,
      ...landlordInquiryPaths,
      ...publicReviewPaths,
      ...seekerReviewPaths,
      ...agentReviewPaths,
      ...landlordReviewPaths,
      ...seekerReportPaths,
      ...agentReportPaths,
      ...landlordReportPaths,
      ...adminAuthPaths,
      ...adminKycPaths,
      ...adminCatalogPaths,
      ...adminListingPaths,
      ...adminPropertyVerificationPaths,
      ...adminInspectionPaths,
      ...adminInquiryPaths,
      ...adminReviewPaths,
      ...adminReportPaths,
    },
  }
}
