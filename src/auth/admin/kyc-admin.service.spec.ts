import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import type { MailService } from '../../mail/mail.service.js';
import type { AgentKycSubmission } from '../agent/entities/agent-kyc-submission.entity.js';
import type { AgentUser } from '../agent/entities/agent-user.entity.js';
import type { LandlordKycSubmission } from '../landlord/entities/landlord-kyc-submission.entity.js';
import type { LandlordUser } from '../landlord/entities/landlord-user.entity.js';
import type { KycStorageProvider } from '../kyc/kyc-storage.interface.js';
import { AgentKycSubmission as AgentKycSubmissionClass } from '../agent/entities/agent-kyc-submission.entity.js';
import { LandlordKycSubmission as LandlordKycSubmissionClass } from '../landlord/entities/landlord-kyc-submission.entity.js';
import { KycAdminService } from './kyc-admin.service.js';

describe('KycAdminService', () => {
  let service: KycAdminService;
  let agentSubmissionRepo: Partial<Record<keyof Repository<AgentKycSubmission>, any>>;
  let landlordSubmissionRepo: Partial<Record<keyof Repository<LandlordKycSubmission>, any>>;
  let agentUserRepo: Partial<Record<keyof Repository<AgentUser>, any>>;
  let landlordUserRepo: Partial<Record<keyof Repository<LandlordUser>, any>>;
  let storage: Partial<Record<keyof KycStorageProvider, any>>;
  let mailService: Partial<Record<keyof MailService, any>>;
  let dataSource: Partial<Record<keyof DataSource, any>>;

  const agentUser = {
    id: 'agent-1',
    fullName: 'Alice Agent',
    email: 'alice@example.com',
    verificationStatus: 'pending',
    verifiedAt: null,
  } as AgentUser;

  const landlordUser = {
    id: 'landlord-1',
    fullName: 'Bob Landlord',
    email: 'bob@example.com',
    verificationStatus: 'pending',
    verifiedAt: null,
  } as LandlordUser;

  const makeAgentSubmission = (
    overrides: Partial<AgentKycSubmission> = {},
  ): AgentKycSubmission =>
    ({
      id: 'sub-agent-1',
      agentId: 'agent-1',
      status: 'pending',
      documentType: 'NIN_SLIP',
      documentUrl: 'oruvia/kyc/agent-1-abc.jpg',
      attempt: 1,
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: null,
      createdAt: new Date('2026-01-01'),
      ...overrides,
    }) as AgentKycSubmission;

  beforeEach(() => {
    agentSubmissionRepo = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
    };
    landlordSubmissionRepo = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
    };
    agentUserRepo = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(agentUser),
    };
    landlordUserRepo = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(landlordUser),
    };

    storage = { retrieve: vi.fn() };
    mailService = { sendKycDecision: vi.fn().mockResolvedValue(undefined) };

    // Transaction mock dispatches locked findOne/save by entity class.
    const manager = {
      findOne: vi.fn((entityClass: any) => {
        if (entityClass === AgentKycSubmissionClass) {
          return Promise.resolve(agentSubmissionRepo.findOne!(vi.fn()) ?? null);
        }
        if (entityClass === LandlordKycSubmissionClass) {
          return Promise.resolve(
            landlordSubmissionRepo.findOne!(vi.fn()) ?? null,
          );
        }
        if (entityClass.name === 'AgentUser') {
          return Promise.resolve(agentUser);
        }
        return Promise.resolve(landlordUser);
      }),
      save: vi.fn((entity: any) => Promise.resolve(entity)),
    };

    dataSource = {
      transaction: vi.fn((callback: any) => callback(manager)),
    };

    service = new KycAdminService(
      agentSubmissionRepo as any,
      landlordSubmissionRepo as any,
      agentUserRepo as any,
      landlordUserRepo as any,
      storage as any,
      mailService as any,
      dataSource as any,
    );
  });

  describe('listPending', () => {
    it('merges pending agent and landlord queues with lister details', async () => {
      agentSubmissionRepo.find = vi
        .fn()
        .mockResolvedValue([makeAgentSubmission()]);
      agentUserRepo.find = vi.fn().mockResolvedValue([agentUser]);

      const queue = await service.listPending();

      expect(queue).toHaveLength(1);
      expect(queue[0]).toMatchObject({
        id: 'sub-agent-1',
        listerType: 'agent',
        listerName: 'Alice Agent',
        status: 'pending',
      });
    });
  });

  describe('approve', () => {
    it('approves a pending agent submission, updates the account, and notifies', async () => {
      const submission = makeAgentSubmission();
      agentSubmissionRepo.findOne = vi.fn().mockResolvedValue(submission);

      const result = await service.approve('sub-agent-1', 'admin-1');

      expect(submission.status).toBe('approved');
      expect(submission.reviewedBy).toBe('admin-1');
      expect(submission.reviewedAt).toBeInstanceOf(Date);
      expect(agentUser.verificationStatus).toBe('approved');
      expect(agentUser.verifiedAt).toBeInstanceOf(Date);
      expect(mailService.sendKycDecision).toHaveBeenCalledWith(
        'alice@example.com',
        'Alice Agent',
        true,
        'agent',
      );
      expect(result.listerType).toBe('agent');
    });

    it('still approves when the notification email fails (review already committed)', async () => {
      const submission = makeAgentSubmission();
      agentSubmissionRepo.findOne = vi.fn().mockResolvedValue(submission);
      mailService.sendKycDecision = vi
        .fn()
        .mockRejectedValue(new Error('smtp unavailable'));

      const result = await service.approve('sub-agent-1', 'admin-1');

      expect(submission.status).toBe('approved');
      expect(result.status).toBe('approved');
      expect(mailService.sendKycDecision).toHaveBeenCalled();
    });

    it('rejects double-review of an already decided submission', async () => {
      agentSubmissionRepo.findOne = vi
        .fn()
        .mockResolvedValue(makeAgentSubmission({ status: 'approved' }));

      await expect(service.approve('sub-agent-1', 'admin-1')).rejects.toThrow(
        ConflictException,
      );
      expect(mailService.sendKycDecision).not.toHaveBeenCalled();
    });

    it('throws for unknown submissions', async () => {
      await expect(service.approve('missing-id', 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reject', () => {
    it('records the reason on the submission and account, then notifies', async () => {
      const submission = makeAgentSubmission();
      agentSubmissionRepo.findOne = vi.fn().mockResolvedValue(submission);

      await service.reject('sub-agent-1', 'admin-1', 'Document expired');

      expect(submission.status).toBe('rejected');
      expect(submission.rejectionReason).toBe('Document expired');
      expect(agentUser.verificationStatus).toBe('rejected');
      expect(mailService.sendKycDecision).toHaveBeenCalledWith(
        'alice@example.com',
        'Alice Agent',
        false,
        'agent',
        'Document expired',
      );
    });
  });

  describe('getSubmission', () => {
    it('falls back to the landlord table and reports listerType landlord', async () => {
      const landlordSubmission = {
        id: 'sub-landlord-1',
        landlordId: 'landlord-1',
        status: 'pending',
        documentType: 'INTERNATIONAL_PASSPORT',
        documentUrl: 'oruvia/kyc/landlord-1-abc.png',
        attempt: 1,
        reviewedAt: null,
        reviewedBy: null,
        rejectionReason: null,
        createdAt: new Date(),
      } as LandlordKycSubmission;
      landlordSubmissionRepo.findOne = vi
        .fn()
        .mockResolvedValue(landlordSubmission);

      const result = await service.getSubmission('sub-landlord-1');

      expect(result).toMatchObject({
        listerType: 'landlord',
        listerEmail: 'bob@example.com',
        documentType: 'INTERNATIONAL_PASSPORT',
      });
    });
  });

  describe('getDocument', () => {
    it('streams the stored document for the reviewer', async () => {
      agentSubmissionRepo.findOne = vi
        .fn()
        .mockResolvedValue(makeAgentSubmission());
      storage.retrieve = vi
        .fn()
        .mockResolvedValue({ buffer: Buffer.from('img'), mimeType: 'image/jpeg' });

      const document = await service.getDocument('sub-agent-1');

      expect(storage.retrieve).toHaveBeenCalledWith(
        'oruvia/kyc/agent-1-abc.jpg',
      );
      expect(document.buffer.toString()).toBe('img');
    });

    it('throws when the stored file cannot be retrieved', async () => {
      agentSubmissionRepo.findOne = vi
        .fn()
        .mockResolvedValue(makeAgentSubmission());
      storage.retrieve = vi.fn().mockResolvedValue(null);

      await expect(service.getDocument('sub-agent-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
