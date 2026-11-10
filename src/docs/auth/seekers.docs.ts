import { buildRoleAuthPaths } from './shared'

/**
 * Seekers Auth & Profile OpenAPI Paths (`/api/v1/seekers/*`)
 */
export const seekerPaths = {
  ...buildRoleAuthPaths(
    'seekers',
    'seeker',
    'Seekers',
    '#/components/schemas/SeekerProfile',
    {
      preferred_location: {
        type: 'string',
        example: 'Abeokuta, Ogun',
      },
    },
    {
      preferred_location: {
        type: ['string', 'null'],
        example: 'Ikeja, Lagos',
      },
    },
    'seeker.demo@oruvia.ng'
  ),
}
