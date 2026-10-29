import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentAdmin } from './decorators/current-admin.decorator.js';
import { RejectKycDto } from './dto/reject-kyc.dto.js';
import { AdminUser } from './entities/admin-user.entity.js';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard.js';
import {
  KycAdminService,
  type KycSubmissionDetail,
} from './kyc-admin.service.js';

@ApiTags('Admin KYC Review')
@Throttle({ auth: { limit: 10, ttl: 60000 } })
@UseGuards(AdminJwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@Controller('admin/kyc')
export class KycAdminController {
  constructor(private readonly kycAdminService: KycAdminService) {}

  @Get('pending')
  @ApiOperation({
    summary: 'Review queue of pending KYC submissions',
    description:
      'Lists all pending agent and landlord identity submissions, oldest first, with the submitting lister\u2019s name and email.',
  })
  @ApiOkResponse({ description: 'Pending submissions returned.' })
  @ApiUnauthorizedResponse({
    description: 'Missing, expired, revoked, or non-admin Bearer token.',
  })
  async listPending(): Promise<KycSubmissionDetail[]> {
    return this.kycAdminService.listPending();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single KYC submission with lister details',
  })
  @ApiNotFoundResponse({ description: 'Submission not found (KYC_SUBMISSION_NOT_FOUND).' })
  @ApiUnauthorizedResponse({
    description: 'Missing, expired, revoked, or non-admin Bearer token.',
  })
  async getSubmission(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<KycSubmissionDetail> {
    return this.kycAdminService.getSubmission(id);
  }

  @Get(':id/document')
  @ApiOperation({
    summary: 'Stream the submitted identity document',
    description:
      'Streams stored document bytes to the reviewing admin. Documents are never served from public URLs.',
  })
  @ApiNotFoundResponse({ description: 'Submission or document not found.' })
  @ApiUnauthorizedResponse({
    description: 'Missing, expired, revoked, or non-admin Bearer token.',
  })
  async getDocument(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StreamableFile> {
    const document = await this.kycAdminService.getDocument(id);
    return new StreamableFile(document.buffer, {
      type: document.mimeType,
      disposition: 'inline',
    });
  }

  @HttpCode(HttpStatus.OK)
  @Post(':id/approve')
  @ApiOperation({
    summary: 'Approve a KYC submission',
    description:
      'Marks the submission and the lister account as approved (terminal), records the reviewing admin, and emails the lister. Idempotency-guarded: approving an already-reviewed submission returns 409.',
  })
  @ApiOkResponse({ description: 'Submission approved; lister notified.' })
  @ApiConflictResponse({ description: 'Submission was already reviewed (KYC_ALREADY_REVIEWED).' })
  @ApiNotFoundResponse({ description: 'Submission not found (KYC_SUBMISSION_NOT_FOUND).' })
  @ApiUnauthorizedResponse({
    description: 'Missing, expired, revoked, or non-admin Bearer token.',
  })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() admin: AdminUser,
  ): Promise<KycSubmissionDetail> {
    return this.kycAdminService.approve(id, admin.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':id/reject')
  @ApiOperation({
    summary: 'Reject a KYC submission with a mandatory reason',
    description:
      'Marks the submission rejected and the lister account rejected, records the reviewing admin and reason, and emails the lister so they can resubmit (subject to the attempt cap).',
  })
  @ApiOkResponse({ description: 'Submission rejected; lister notified with reason.' })
  @ApiConflictResponse({ description: 'Submission was already reviewed (KYC_ALREADY_REVIEWED).' })
  @ApiNotFoundResponse({ description: 'Submission not found (KYC_SUBMISSION_NOT_FOUND).' })
  @ApiUnauthorizedResponse({
    description: 'Missing, expired, revoked, or non-admin Bearer token.',
  })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() admin: AdminUser,
    @Body() dto: RejectKycDto,
  ): Promise<KycSubmissionDetail> {
    return this.kycAdminService.reject(id, admin.id, dto.reason);
  }
}
