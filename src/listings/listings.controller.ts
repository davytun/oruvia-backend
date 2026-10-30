import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { PaginatedResult } from '../common/interfaces/pagination.interface.js';
import { SearchListingsQueryDto } from './dto/search-listings.query.dto.js';
import {
  type ListingDetailResponse,
  type ListingResponse,
} from './listings.constants.js';
import { ListingsService } from './listings.service.js';

@ApiTags('Listings')
@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Get()
  @ApiOperation({
    summary: 'Search active listings',
    description:
      'Public, paginated search. Filters: listingType, minPrice/maxPrice, state, city, propertyType, and a minimum bedrooms count. Newest first.',
  })
  @ApiOkResponse({ description: 'Paginated list of active listings.' })
  async search(
    @Query() query: SearchListingsQueryDto,
  ): Promise<PaginatedResult<ListingResponse>> {
    return this.listingsService.search(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get listing detail',
    description:
      'Returns a single active listing with its snapshot Verified badge and lister display name.',
  })
  @ApiOkResponse({ description: 'Listing detail returned.' })
  @ApiNotFoundResponse({ description: 'Listing not found (LISTING_NOT_FOUND).' })
  async detail(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ListingDetailResponse> {
    return this.listingsService.findDetail(id);
  }
}
