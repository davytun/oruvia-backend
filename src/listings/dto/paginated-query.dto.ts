import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  LISTING_DEFAULT_PAGE_SIZE,
  LISTING_MAX_PAGE_SIZE,
} from '../listings.constants.js';

/**
 * Shared pagination query fields. Extend this class (with a class
 * decorator adding further validators) so inherited constraints survive
 * the global ValidationPipe whitelist.
 */
export class PaginatedQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ example: LISTING_DEFAULT_PAGE_SIZE, default: LISTING_DEFAULT_PAGE_SIZE, maximum: LISTING_MAX_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(LISTING_MAX_PAGE_SIZE)
  limit: number = LISTING_DEFAULT_PAGE_SIZE;
}
