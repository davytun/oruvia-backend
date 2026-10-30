import { PartialType } from '@nestjs/swagger';
import { CreateListingDto } from './create-listing.dto.js';

/**
 * Partial update of a listing's scalar fields (dashboard edit). Every
 * field of CreateListingDto becomes optional, inheriting its validators,
 * transforms and Swagger metadata — one source of truth for the edit surface.
 *
 * Photos are intentionally not editable in this phase; `imageUrls` stays
 * exactly as published. The service copies a whitelisted field list, so new
 * CreateListingDto fields are not mass-assigned until reviewed.
 */
export class UpdateListingDto extends PartialType(CreateListingDto) {}
