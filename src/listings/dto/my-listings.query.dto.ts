import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnumValues } from '../../common/validation/enum-validator.js';
import { LISTING_STATUSES, type ListingStatus } from '../listings.constants.js';
import { PaginatedQueryDto } from './paginated-query.dto.js';

/** Query for the lister's own (dashboard) listing list. Includes inactive statuses. */
export class MyListingsQueryDto extends PaginatedQueryDto {
  @ApiPropertyOptional({ enum: LISTING_STATUSES, description: 'Defaults to all non-deleted statuses.' })
  @IsEnumValues(LISTING_STATUSES)
  status?: ListingStatus;
}
