import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, Max, Min } from 'class-validator';
import { IsEnumValues } from '../../common/validation/enum-validator.js';
import {
  LISTING_TYPES,
  PROPERTY_TYPES,
  type ListingType,
  type PropertyType,
} from '../listings.constants.js';
import { PaginatedQueryDto } from './paginated-query.dto.js';

export class SearchListingsQueryDto extends PaginatedQueryDto {
  @ApiPropertyOptional({ enum: LISTING_TYPES })
  @IsEnumValues(LISTING_TYPES)
  listingType?: ListingType;

  @ApiPropertyOptional({ example: 500000 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ example: 5000000 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsString()
  @Max(60)
  state?: string;

  @ApiPropertyOptional({ example: 'Lekki' })
  @IsString()
  @Max(60)
  city?: string;

  @ApiPropertyOptional({ enum: PROPERTY_TYPES })
  @IsEnumValues(PROPERTY_TYPES)
  propertyType?: PropertyType;

  @ApiPropertyOptional({ example: 3, description: 'Minimum number of bedrooms.' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bedrooms?: number;
}
