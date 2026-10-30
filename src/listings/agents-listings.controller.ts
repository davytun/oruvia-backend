import {
  Body,
  Controller,
  Post,
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
import { CreateListingDto } from './dto/create-listing.dto.js';
import { multipartListingBody } from './listing-multipart-body.js';
import { RequireVerifiedListerGuard } from './guards/require-verified-lister.guard.js';
import {
  LISTING_MAX_PHOTOS,
  LISTING_MAX_PHOTO_BYTES,
  type ListingDetailResponse,
} from './listings.constants.js';
import { ListingsService } from './listings.service.js';

@ApiTags('Agents Listings')
@Controller('agents/listings')
export class AgentsListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Throttle({ auth: { limit: 10, ttl: 60000 } })
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
}
