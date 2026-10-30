import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  LISTING_DEFAULT_PAGE_SIZE,
  LISTING_MAX_PAGE_SIZE,
  LISTING_TYPES,
  PROPERTY_TYPES,
  type ListingType,
  type PropertyType,
} from '../listings.constants.js';

export class SearchListingsQueryDto {
  @ApiPropertyOptional({ enum: LISTING_TYPES })
  @IsOptional()
  @IsEnum(LISTING_TYPES as readonly string[])
  listingType?: ListingType;

  @ApiPropertyOptional({ example: 500000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ example: 5000000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsOptional()
  @IsString()
  @Max(60)
  state?: string;

  @ApiPropertyOptional({ example: 'Lekki' })
  @IsOptional()
  @IsString()
  @Max(60)
  city?: string;

  @ApiPropertyOptional({ enum: PROPERTY_TYPES })
  @IsOptional()
  @IsEnum(PROPERTY_TYPES as readonly string[])
  propertyType?: PropertyType;

  @ApiPropertyOptional({ example: 3, description: 'Minimum number of bedrooms.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bedrooms?: number;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ example: 12, default: LISTING_DEFAULT_PAGE_SIZE, maximum: LISTING_MAX_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(LISTING_MAX_PAGE_SIZE)
  limit: number = LISTING_DEFAULT_PAGE_SIZE;
}
