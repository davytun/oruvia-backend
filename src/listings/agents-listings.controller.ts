import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { CurrentAgent } from '../auth/agent/decorators/current-agent.decorator.js';
import { AgentUser } from '../auth/agent/entities/agent-user.entity.js';
import { AgentJwtAuthGuard } from '../auth/agent/guards/agent-jwt-auth.guard.js';
import type { PaginatedResult } from '../common/interfaces/pagination.interface.js';
import { CreateListingDto } from './dto/create-listing.dto.js';
import { MyListingsQueryDto } from './dto/my-listings.query.dto.js';
import { UpdateListingStatusDto } from './dto/update-listing-status.dto.js';
import { UpdateListingDto } from './dto/update-listing.dto.js';
import {
  DashboardListRoute,
  DashboardRemoveRoute,
  DashboardUpdateRoute,
  DashboardUpdateStatusRoute,
} from './decorators/lister-dashboard-routes.js';
import { multipartListingBody } from './listing-multipart-body.js';
import { RequireVerifiedListerGuard } from './guards/require-verified-lister.guard.js';
import {
  LISTING_MAX_PHOTOS,
  LISTING_MAX_PHOTO_BYTES,
  LISTING_PUBLISH_THROTTLE_LIMIT,
  LISTING_THROTTLE_BUCKET,
  LISTING_THROTTLE_TTL_MS,
  type ListingDashboardResponse,
  type ListingDetailResponse,
} from './listings.constants.js';
import { ListingsService } from './listings.service.js';

@ApiTags('Agents Listings')
@Controller('agents/listings')
export class AgentsListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Throttle({ [LISTING_THROTTLE_BUCKET]: { limit: LISTING_PUBLISH_THROTTLE_LIMIT, ttl: LISTING_THROTTLE_TTL_MS } })
  @UseGuards(AgentJwtAuthGuard, RequireVerifiedListerGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data')
  @ApiBody(multipartListingBody)
  @UseInterceptors(
    FilesInterceptor('photos', LISTING_MAX_PHOTOS, {
      storage: memoryStorage(),
      limits: { fileSize: LISTING_MAX_PHOTO_BYTES, files: LISTING_MAX_PHOTOS },
    }),
  )
  @Post()
  @ApiOperation({
    summary: 'Publish a new listing',
    description:
      'Creates an active listing owned by the authenticated agent. Requires an approved KYC status; identity is snapshotted as the Verified badge at publish time.',
  })
  @ApiCreatedResponse({ description: 'Listing published successfully.' })
  @ApiBadRequestResponse({
    description:
      'Insufficient photos (LISTING_PHOTOS_INSUFFICIENT), invalid type/size, or validation failure.',
  })
  @ApiForbiddenResponse({
    description: 'KYC not approved (KYC_NOT_APPROVED); current status is embedded.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, or expired JWT token.',
  })
  async create(
    @CurrentAgent() agent: AgentUser,
    @Body() dto: CreateListingDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ): Promise<ListingDetailResponse> {
    return this.listingsService.create(
      agent,
      'agent',
      dto,
      files.map((file) => ({ buffer: file.buffer, mimeType: file.mimetype })),
    );
  }

  // ------------------------------------------------------------------
  // Phase 2 — dashboard. JWT only: the KYC soft-gate guards publishing,
  // not managing listings already live. Ownership is enforced in the
  // service by scoping every query to the authenticated lister. Route
  // docs/throttle/guard bundle lives in decorators/lister-dashboard-routes.
  // ------------------------------------------------------------------

  @DashboardListRoute(AgentJwtAuthGuard)
  @Get()
  async findOwn(
    @CurrentAgent() agent: AgentUser,
    @Query() query: MyListingsQueryDto,
  ): Promise<PaginatedResult<ListingDashboardResponse>> {
    return this.listingsService.findOwn(agent, 'agent', query);
  }

  // Declared before ':id' so the literal '/status' segment wins matching.
  @DashboardUpdateStatusRoute(AgentJwtAuthGuard)
  @Patch(':id/status')
  async updateStatus(
    @CurrentAgent() agent: AgentUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateListingStatusDto,
  ): Promise<ListingDashboardResponse> {
    return this.listingsService.updateStatus(agent, 'agent', id, dto.status);
  }

  @DashboardUpdateRoute(AgentJwtAuthGuard)
  @Patch(':id')
  async update(
    @CurrentAgent() agent: AgentUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateListingDto,
  ): Promise<ListingDashboardResponse> {
    return this.listingsService.update(agent, 'agent', id, dto);
  }

  @DashboardRemoveRoute(AgentJwtAuthGuard)
  @Delete(':id')
  async remove(
    @CurrentAgent() agent: AgentUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.listingsService.remove(agent, 'agent', id);
  }
}
