import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { MailService } from '../../mail/mail.service.js';
import { AgentKycSubmission } from '../agent/entities/agent-kyc-submission.entity.js';
import { AgentUser } from '../agent/entities/agent-user.entity.js';
import { LandlordKycSubmission } from '../landlord/entities/landlord-kyc-submission.entity.js';
import { LandlordUser } from '../landlord/entities/landlord-user.entity.js';
import type {
  KycDocumentType,
  KycSubmissionStatus,
} from '../kyc/kyc.constants.js';
import { KycStorageProvider } from '../kyc/kyc-storage.interface.js';

export type KycListerType = 'agent' | 'landlord';

export interface KycSubmissionDetail {
  id: string;
  listerType: KycListerType;
  listerId: string;
  listerName: string;
  listerEmail: string;
  documentType: KycDocumentType;
  status: KycSubmissionStatus;
  attempt: number;
  submittedAt: Date;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
}

interface SubmissionAndUser {
  submission: AgentKycSubmission | LandlordKycSubmission;
  user: AgentUser | LandlordUser;
  listerType: KycListerType;
}

type ReviewMutator = (
  locked: SubmissionAndUser,
  manager: EntityManager,
) => Promise<void>;

function isAgentSubmission(
  submission: AgentKycSubmission | LandlordKycSubmission,
): submission is AgentKycSubmission {
  return (submission as AgentKycSubmission).agentId !== undefined;
}

@Injectable()
export class KycAdminService {
  private readonly logger = new Logger(KycAdminService.name);

  constructor(
    @InjectRepository(AgentKycSubmission)
    private readonly agentSubmissionRepository: Repository<AgentKycSubmission>,
    @InjectRepository(LandlordKycSubmission)
    private readonly landlordSubmissionRepository: Repository<LandlordKycSubmission>,
    @InjectRepository(AgentUser)
    private readonly agentUserRepository: Repository<AgentUser>,
    @InjectRepository(LandlordUser)
    private readonly landlordUserRepository: Repository<LandlordUser>,
    private readonly storage: KycStorageProvider,
    private readonly mailService: MailService,
    private readonly dataSource: DataSource,
  ) {}

  async listPending(): Promise<KycSubmissionDetail[]> {
    const [agentSubmissions, landlordSubmissions] = await Promise.all([
      this.agentSubmissionRepository.find({
        where: { status: 'pending' },
        order: { createdAt: 'ASC' },
      }),
      this.landlordSubmissionRepository.find({
        where: { status: 'pending' },
        order: { createdAt: 'ASC' },
      }),
    ]);

    const [agentNames, landlordNames] = await Promise.all([
      this.loadListers(
        'agent',
        agentSubmissions.map((submission) => submission.agentId),
      ),
      this.loadListers(
        'landlord',
        landlordSubmissions.map((submission) => submission.landlordId),
      ),
    ]);

    return [
      ...agentSubmissions.map((submission) =>
        this.toDetail(
          'agent',
          submission,
          agentNames.get(submission.agentId),
        ),
      ),
      ...landlordSubmissions.map((submission) =>
        this.toDetail(
          'landlord',
          submission,
          landlordNames.get(submission.landlordId),
        ),
      ),
    ];
  }

  async getSubmission(id: string): Promise<KycSubmissionDetail> {
    const { submission, user, listerType } = await this.resolve(id);
    return this.toDetail(listerType, submission, user);
  }

  async getDocument(
    id: string,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const { submission } = await this.resolve(id);

    const document = await this.storage.retrieve(submission.documentUrl);
    if (!document) {
      throw new NotFoundException({
        code: 'KYC_DOCUMENT_NOT_FOUND',
        message: 'Stored document could not be retrieved',
      });
    }

    return document;
  }

  private async notifyLister(
    user: AgentUser | LandlordUser,
    approved: boolean,
    listerType: KycListerType,
    rejectionReason?: string,
  ): Promise<void> {
    try {
      if (rejectionReason === undefined) {
        await this.mailService.sendKycDecision(
          user.email,
          user.fullName,
          approved,
          listerType,
        );
      } else {
        await this.mailService.sendKycDecision(
          user.email,
          user.fullName,
          approved,
          listerType,
          rejectionReason,
        );
      }
    } catch (error: unknown) {
      this.logger.warn(
        `KYC ${approved ? 'approval' : 'rejection'} email failed for ${user.email}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async approve(id: string, adminId: string): Promise<KycSubmissionDetail> {
    const { submission, user, listerType } = await this.review(
      id,
      async ({ submission: locked, user: lockedUser }, manager) => {
        locked.status = 'approved';
        locked.reviewedBy = adminId;
        locked.reviewedAt = new Date();
        locked.rejectionReason = null;

        lockedUser.verificationStatus = 'approved';
        lockedUser.verifiedAt = new Date();

        await manager.save(locked);
        await manager.save(lockedUser);
      },
    );

    await this.notifyLister(user, true, listerType);

    return this.toDetail(listerType, submission, user);
  }

  async reject(
    id: string,
    adminId: string,
    reason: string,
  ): Promise<KycSubmissionDetail> {
    const { submission, user, listerType } = await this.review(
      id,
      async ({ submission: locked, user: lockedUser }, manager) => {
        locked.status = 'rejected';
        locked.reviewedBy = adminId;
        locked.reviewedAt = new Date();
        locked.rejectionReason = reason;

        lockedUser.verificationStatus = 'rejected';

        await manager.save(locked);
        await manager.save(lockedUser);
      },
    );

    await this.notifyLister(user, false, listerType, reason);

    return this.toDetail(listerType, submission, user);
  }

  private async review(
    id: string,
    mutate: ReviewMutator,
  ): Promise<SubmissionAndUser> {
    return this.dataSource.transaction(async (manager) => {
      const locked =
        (await manager.findOne(AgentKycSubmission, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        })) ??
        (await manager.findOne(LandlordKycSubmission, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        }));

      if (!locked) {
        throw new NotFoundException({
          code: 'KYC_SUBMISSION_NOT_FOUND',
          message: 'KYC submission not found',
        });
      }
      if (locked.status !== 'pending') {
        throw new ConflictException({
          code: 'KYC_ALREADY_REVIEWED',
          message: `Submission was already ${locked.status}`,
        });
      }

      const listerType: KycListerType = isAgentSubmission(locked)
        ? 'agent'
        : 'landlord';
      const userId = isAgentSubmission(locked)
        ? locked.agentId
        : locked.landlordId;

      const user =
        listerType === 'agent'
          ? await manager.findOne(AgentUser, {
              where: { id: userId },
              lock: { mode: 'pessimistic_write' },
            })
          : await manager.findOne(LandlordUser, {
              where: { id: userId },
              lock: { mode: 'pessimistic_write' },
            });

      if (!user) {
        throw new NotFoundException({
          code: 'KYC_SUBMISSION_NOT_FOUND',
          message: 'KYC submission owner not found',
        });
      }

      const lockedPair: SubmissionAndUser = { submission: locked, user, listerType };
      await mutate(lockedPair, manager);
      return lockedPair;
    });
  }

  private async resolve(id: string): Promise<SubmissionAndUser> {
    const agentSubmission = await this.agentSubmissionRepository.findOne({
      where: { id },
    });
    if (agentSubmission) {
      const user = await this.agentUserRepository.findOne({
        where: { id: agentSubmission.agentId },
      });
      if (!user) {
        throw new NotFoundException({
          code: 'KYC_SUBMISSION_NOT_FOUND',
          message: 'KYC submission owner not found',
        });
      }
      return { submission: agentSubmission, user, listerType: 'agent' };
    }

    const landlordSubmission = await this.landlordSubmissionRepository.findOne(
      { where: { id } },
    );
    if (landlordSubmission) {
      const user = await this.landlordUserRepository.findOne({
        where: { id: landlordSubmission.landlordId },
      });
      if (!user) {
        throw new NotFoundException({
          code: 'KYC_SUBMISSION_NOT_FOUND',
          message: 'KYC submission owner not found',
        });
      }
      return {
        submission: landlordSubmission,
        user,
        listerType: 'landlord',
      };
    }

    throw new NotFoundException({
      code: 'KYC_SUBMISSION_NOT_FOUND',
      message: 'KYC submission not found',
    });
  }

  private async loadListers(
    listerType: KycListerType,
    ids: string[],
  ): Promise<Map<string, AgentUser | LandlordUser>> {
    if (ids.length === 0) {
      return new Map();
    }

    const users =
      listerType === 'agent'
        ? await this.agentUserRepository.find({ where: { id: In(ids) } })
        : await this.landlordUserRepository.find({ where: { id: In(ids) } });

    return new Map(users.map((user) => [user.id, user]));
  }

  private toDetail(
    listerType: KycListerType,
    submission: AgentKycSubmission | LandlordKycSubmission,
    user?: AgentUser | LandlordUser,
  ): KycSubmissionDetail {
    const listerId = isAgentSubmission(submission)
      ? submission.agentId
      : submission.landlordId;

    return {
      id: submission.id,
      listerType,
      listerId,
      listerName: user?.fullName ?? 'Unknown',
      listerEmail: user?.email ?? 'Unknown',
      documentType: submission.documentType,
      status: submission.status,
      attempt: submission.attempt,
      submittedAt: submission.createdAt,
      reviewedAt: submission.reviewedAt,
      reviewedBy: submission.reviewedBy,
      rejectionReason: submission.rejectionReason,
    };
  }
}
