import {
  Body,
  Controller,
  Get,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import {
  KYC_MAX_UPLOAD_BYTES,
  type KycStatusResponse,
} from '../kyc/kyc.constants.js';
import { CurrentLandlord } from './decorators/current-landlord.decorator.js';
import { SubmitLandlordKycDto } from './dto/submit-kyc.dto.js';
import { LandlordUser } from './entities/landlord-user.entity.js';
import { LandlordJwtAuthGuard } from './guards/landlord-jwt-auth.guard.js';
import { LandlordKycService } from './landlord-kyc.service.js';

@ApiTags('Landlords KYC')
@Throttle({ auth: { limit: 10, ttl: 60000 } })
@UseGuards(LandlordJwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@Controller('landlords/kyc')
export class LandlordKycController {
  constructor(private readonly kycService: LandlordKycService) {}

  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Government-issued ID image (JPEG/PNG/WebP, max 5 MB)',
    schema: {
      type: 'object',
      required: ['document', 'documentType'],
      properties: {
        document: { type: 'string', format: 'binary' },
        documentType: {
          type: 'string',
          enum: [
            'NIN_SLIP',
            'DRIVERS_LICENSE',
            'INTERNATIONAL_PASSPORT',
            'OTHER_GOVERNMENT_ID',
          ],
          example: 'NIN_SLIP',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('document', {
      storage: memoryStorage(),
      limits: { fileSize: KYC_MAX_UPLOAD_BYTES, files: 1 },
    }),
  )
  @Post('submit')
  @ApiOperation({
    summary: 'Submit identity document for KYC verification',
    description:
      'Uploads a government-issued ID (NIN slip, driver\u2019s licence, international passport, or any other government ID) and creates a pending submission for admin review. Oruvia never collects BVN.',
  })
  @ApiResponse({ status: 201, description: 'Submission created; status is `pending`.' })
  @ApiConflictResponse({
    description:
      'Already verified (KYC_ALREADY_APPROVED) or a submission is already awaiting review (KYC_ALREADY_PENDING).',
  })
  @ApiForbiddenResponse({
    description: 'Maximum submission attempts exceeded (KYC_ATTEMPTS_EXHAUSTED).',
  })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT token.' })
  async submit(
    @CurrentLandlord() landlord: LandlordUser,
    @Body() dto: SubmitLandlordKycDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<KycStatusResponse> {
    return this.kycService.submit(landlord, dto, file && {
      buffer: file.buffer,
      mimeType: file.mimetype,
    });
  }

  @Get()
  @ApiOperation({
    summary: 'Get current KYC status',
    description:
      'Returns verification status, the active submission (if any), the last rejection reason, and attempt counters. Drives the in-app verification banner.',
  })
  @ApiOkResponse({ description: 'Current KYC status returned.' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT token.' })
  async getStatus(
    @CurrentLandlord() landlord: LandlordUser,
  ): Promise<KycStatusResponse> {
    return this.kycService.getStatus(landlord);
  }

  @Get('document')
  @ApiOperation({
    summary: 'Download own most recent submitted document',
    description:
      'Streams the stored document bytes for the authenticated landlord\u2019s most recent submission. Documents are never served from public URLs.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT token.' })
  async getDocument(
    @CurrentLandlord() landlord: LandlordUser,
  ): Promise<StreamableFile> {
    const document = await this.kycService.getDocument(landlord);
    return new StreamableFile(document.buffer, {
      type: document.mimeType,
      disposition: 'inline',
    });
  }
}
