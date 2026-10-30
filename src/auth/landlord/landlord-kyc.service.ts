import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailService } from '../../mail/mail.service.js';
import {
  KYC_ALLOWED_MIME_TYPES,
  KYC_MAX_ATTEMPTS,
  KYC_MAX_UPLOAD_BYTES,
  type KycStatusResponse,
} from '../kyc/kyc.constants.js';
import {
  type StoredKycDocument,
  KycStorageProvider,
} from '../kyc/kyc-storage.interface.js';
import type { SubmitLandlordKycDto } from './dto/submit-kyc.dto.js';
import { LandlordKycSubmission } from './entities/landlord-kyc-submission.entity.js';
import { LandlordUser } from './entities/landlord-user.entity.js';

export interface KycUploadFile {
  buffer: Buffer;
  mimeType: string;
}

@Injectable()
export class LandlordKycService {
  constructor(
    @InjectRepository(LandlordUser)
    private readonly landlordRepository: Repository<LandlordUser>,
    @InjectRepository(LandlordKycSubmission)
    private readonly submissionRepository: Repository<LandlordKycSubmission>,
    private readonly storage: KycStorageProvider,
    private readonly mailService: MailService,
  ) {}

  async submit(
    landlord: LandlordUser,
    dto: SubmitLandlordKycDto,
    file: KycUploadFile | undefined,
  ): Promise<KycStatusResponse> {
    if (!file || !file.buffer || file.buffer.byteLength === 0) {
      throw new BadRequestException({
        code: 'KYC_FILE_MISSING',
        message: 'An identity document image is required',
      });
    }
    if (!KYC_ALLOWED_MIME_TYPES.includes(file.mimeType)) {
      throw new HttpException(
        {
          code: 'KYC_FILE_TYPE_INVALID',
          message: 'Document must be a JPEG, PNG or WebP image',
        },
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      );
    }
    if (file.buffer.byteLength > KYC_MAX_UPLOAD_BYTES) {
      throw new HttpException(
        { code: 'KYC_FILE_TOO_LARGE', message: 'Document must not exceed 5 MB' },
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }

    const latest = await this.submissionRepository.findOne({
      where: { landlordId: landlord.id },
      order: { attempt: 'DESC' },
    });

    if (
      landlord.verificationStatus === 'approved' ||
      latest?.status === 'approved'
    ) {
      throw new ConflictException({
        code: 'KYC_ALREADY_APPROVED',
        message: 'This account is already verified',
      });
    }
    if (latest?.status === 'pending') {
      throw new ConflictException({
        code: 'KYC_ALREADY_PENDING',
        message: 'A submission is already awaiting review',
      });
    }

    const attemptsUsed = latest ? latest.attempt : 0;
    if (attemptsUsed >= KYC_MAX_ATTEMPTS) {
      throw new ForbiddenException({
        code: 'KYC_ATTEMPTS_EXHAUSTED',
        message:
          'Maximum KYC submission attempts exceeded. Please contact support.',
      });
    }

    // Persist the document before the DB write; an orphaned stored file is
    // acceptable, a submission pointing at a missing file is not.
    const stored: StoredKycDocument | null = await this.storage.persist(
      file.buffer,
      file.mimeType,
      landlord.id,
    );
    if (!stored) {
      throw new ServiceUnavailableException({
        code: 'KYC_STORAGE_UNAVAILABLE',
        message: 'Document storage is temporarily unavailable. Please retry.',
      });
    }

    let submission: LandlordKycSubmission;
    try {
      submission = await this.submissionRepository.save(
        this.submissionRepository.create({
          landlordId: landlord.id,
          status: 'pending',
          documentType: dto.documentType,
          documentUrl: stored.reference,
          attempt: attemptsUsed + 1,
        }),
      );
    } catch (error: any) {
      if (
        error?.code === '23505' &&
        error?.constraint === 'uq_landlord_kyc_pending_per_landlord'
      ) {
        throw new ConflictException({
          code: 'KYC_ALREADY_PENDING',
          message: 'A submission is already awaiting review',
        });
      }
      throw error;
    }

    landlord.verificationStatus = 'pending';
    await this.landlordRepository.save(landlord);

    return this.buildStatus(landlord, submission, submission);
  }

  async getStatus(landlord: LandlordUser): Promise<KycStatusResponse> {
    const latest = await this.submissionRepository.findOne({
      where: { landlordId: landlord.id },
      order: { attempt: 'DESC' },
    });

    return this.buildStatus(
      landlord,
      latest?.status === 'pending' ? latest : null,
      latest,
    );
  }

  async getDocument(
    landlord: LandlordUser,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const latest = await this.submissionRepository.findOne({
      where: { landlordId: landlord.id },
      order: { attempt: 'DESC' },
    });

    if (!latest) {
      throw new NotFoundException({
        code: 'KYC_SUBMISSION_NOT_FOUND',
        message: 'No KYC submission found for this account',
      });
    }

    const document = await this.storage.retrieve(latest.documentUrl);
    if (!document) {
      throw new NotFoundException({
        code: 'KYC_DOCUMENT_NOT_FOUND',
        message: 'Stored document could not be retrieved',
      });
    }

    return document;
  }

  private buildStatus(
    landlord: LandlordUser,
    active: LandlordKycSubmission | null,
    latest?: LandlordKycSubmission | null,
  ): KycStatusResponse {
    const reference = latest ?? active;
    return {
      verificationStatus: landlord.verificationStatus,
      activeSubmission: active
        ? {
            id: active.id,
            documentType: active.documentType,
            status: active.status,
            attempt: active.attempt,
            submittedAt: active.createdAt,
            reviewedAt: active.reviewedAt,
            rejectionReason: active.rejectionReason,
          }
        : null,
      lastRejection:
        reference && reference.status === 'rejected'
          ? {
              reason: reference.rejectionReason,
              rejectedAt: reference.reviewedAt,
            }
          : null,
      attemptsUsed: reference ? reference.attempt : 0,
      maxAttempts: KYC_MAX_ATTEMPTS,
    };
  }

  async notifyDecision(
    landlordId: string,
    approved: boolean,
    rejectionReason?: string,
  ): Promise<void> {
    const landlord = await this.landlordRepository.findOne({
      where: { id: landlordId },
    });
    if (!landlord) {
      return;
    }

    await this.mailService.sendKycDecision(
      landlord.email,
      landlord.fullName,
      approved,
      'landlord',
      rejectionReason,
    );
  }
}
