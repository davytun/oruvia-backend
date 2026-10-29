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
import { CurrentAgent } from './decorators/current-agent.decorator.js';
import { SubmitAgentKycDto } from './dto/submit-kyc.dto.js';
import { AgentUser } from './entities/agent-user.entity.js';
import { AgentJwtAuthGuard } from './guards/agent-jwt-auth.guard.js';
import { AgentKycService } from './agent-kyc.service.js';

@ApiTags('Agents KYC')
@Throttle({ auth: { limit: 10, ttl: 60000 } })
@UseGuards(AgentJwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@Controller('agents/kyc')
export class AgentKycController {
  constructor(private readonly kycService: AgentKycService) {}

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
    @CurrentAgent() agent: AgentUser,
    @Body() dto: SubmitAgentKycDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<KycStatusResponse> {
    return this.kycService.submit(agent, dto, file && {
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
  async getStatus(@CurrentAgent() agent: AgentUser): Promise<KycStatusResponse> {
    return this.kycService.getStatus(agent);
  }

  @Get('document')
  @ApiOperation({
    summary: 'Download own most recent submitted document',
    description:
      'Streams the stored document bytes for the authenticated agent\u2019s most recent submission. Documents are never served from public URLs.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT token.' })
  async getDocument(
    @CurrentAgent() agent: AgentUser,
  ): Promise<StreamableFile> {
    const document = await this.kycService.getDocument(agent);
    return new StreamableFile(document.buffer, {
      type: document.mimeType,
      disposition: 'inline',
    });
  }
}
