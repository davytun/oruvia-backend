import { ApiProperty } from '@nestjs/swagger';
import { IsEnumValues } from '../../common/validation/enum-validator.js';
import {
  LISTING_STATUSES,
  type ListingStatus,
} from '../listings.constants.js';

/** Body for the "mark rented/sold" dashboard action. */
export class UpdateListingStatusDto {
  @ApiProperty({ enum: LISTING_STATUSES, example: 'rented' })
  @IsEnumValues(LISTING_STATUSES)
  status!: ListingStatus;
}
