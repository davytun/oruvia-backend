import { PROPERTY_TYPES } from './listings.constants.js';

export const multipartListingBody = {
  description: 'Listing fields plus 3-10 photos (JPEG/PNG/WebP, max 5 MB each)',
  schema: {
    type: 'object',
    required: [
      'photos',
      'title',
      'listingType',
      'price',
      'state',
      'city',
      'propertyType',
      'bedrooms',
      'bathrooms',
      'description',
    ],
    properties: {
      photos: {
        type: 'array',
        items: { type: 'string', format: 'binary' },
        minItems: 3,
        maxItems: 10,
      },
      title: { type: 'string', example: '3-bedroom duplex with BQ in Lekki' },
      listingType: { type: 'string', enum: ['rent', 'sale'], example: 'rent' },
      price: { type: 'integer', example: 2500000 },
      state: { type: 'string', example: 'Lagos' },
      city: { type: 'string', example: 'Lekki' },
      propertyType: { type: 'string', enum: [...PROPERTY_TYPES], example: 'duplex' },
      bedrooms: { type: 'integer', example: 3 },
      bathrooms: { type: 'integer', example: 2 },
      description: {
        type: 'string',
        example: 'Modern duplex in a secured estate.',
      },
      amenities: {
        type: 'array',
        items: { type: 'string' },
        example: ['parking', 'borehole'],
      },
      address: { type: 'string', nullable: true, example: '10 Awodey Street' },
      latitude: { type: 'number', nullable: true, example: 6.5244 },
      longitude: { type: 'number', nullable: true, example: 3.3792 },
    },
  },
};
