import {
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { MailService } from '../../mail/mail.service.js';
import type { KycStorageProvider } from '../kyc/kyc-storage.interface.js';
import { AgentKycSubmission } from './entities/agent-kyc-submission.entity.js';
import type { AgentUser } from './entities/agent-user.entity.js';
import { AgentKycService } from './agent-kyc.service.js';

describe('AgentKycService', () => {
  let service: AgentKycService;
  let agentRepo: Partial<Record<keyof Repository<AgentUser>, any>>;
  let submissionRepo: Partial<Record<keyof Repository<AgentKycSubmission>, any>>;
  let storage: Partial<Record<keyof KycStorageProvider, any>>;
  let mailService: Partial<Record<keyof MailService, any>>;

  const makeAgent = (overrides: Partial<AgentUser> = {}): AgentUser =>
    ({
      id: 'agent-123',
      fullName: 'Alice Agent',
      email: 'alice@example.com',
      verificationStatus: 'unverified',
      ...overrides,
    }) as AgentUser;

  const makeSubmission = (
    overrides: Partial<AgentKycSubmission> = {},
  ): AgentKycSubmission => ({
    id: 'sub-1',
    agentId: 'agent-123',
    status: 'pending',
    documentType: 'NIN_SLIP',
    documentUrl: 'oruvia/kyc/agent-123-abc.jpg',
    attempt: 1,
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
    createdAt: new Date(),
    ...overrides,
  }) as AgentKycSubmission;

  const validFile = {
    buffer: Buffer.from('fake-image-bytes'),
    mimeType: 'image/jpeg',
  };

  beforeEach(() => {
    agentRepo = {
      findOne: vi.fn(),
      save: vi.fn((entity) => Promise.resolve(entity)),
    };

    submissionRepo = {
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn((entity) => ({
        ...entity,
        id: 'sub-1',
        createdAt: new Date(),
      })),
      save: vi.fn((entity) => Promise.resolve(entity)),
    };

    storage = {
      persist: vi.fn().mockResolvedValue({ reference: 'oruvia/kyc/agent-123-abc.jpg' }),
      retrieve: vi.fn(),
    };

    mailService = {
      sendKycDecision: vi.fn().mockResolvedValue(undefined),
    };

    service = new AgentKycService(
      agentRepo as any,
      submissionRepo as any,
      storage as any,
      mailService as any,
    );
  });

  describe('submit', () => {
    it('rejects missing files with KYC_FILE_MISSING', async () => {
      await expect(
        service.submit(makeAgent(), { documentType: 'NIN_SLIP' }, undefined),
      ).rejects.toThrow(/KYC_FILE_MISSING|document image is required/);
    });

    it('rejects non-image MIME types with 415', async () => {
      const error = await service
        .submit(makeAgent(), { documentType: 'NIN_SLIP' }, {
          buffer: Buffer.from('x'),
          mimeType: 'application/pdf',
        })
        .catch((e) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect(error.getStatus()).toBe(415);
      expect(error.getResponse()).toMatchObject({ code: 'KYC_FILE_TYPE_INVALID' });
    });

    it('rejects files over 5 MB with 413', async () => {
      const bigFile = {
        buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
        mimeType: 'image/jpeg',
      };
      const error = await service
        .submit(makeAgent(), { documentType: 'NIN_SLIP' }, bigFile)
        .catch((e) => e);

      expect(error.getStatus()).toBe(413);
      expect(error.getResponse()).toMatchObject({ code: 'KYC_FILE_TOO_LARGE' });
    });

    it('conflicts when the account is already approved', async () => {
      const agent = makeAgent({ verificationStatus: 'approved' });
      await expect(
        service.submit(agent, { documentType: 'NIN_SLIP' }, validFile),
      ).rejects.toThrow(ConflictException);
    });

    it('conflicts when a submission is already pending', async () => {
      submissionRepo.findOne = vi
        .fn()
        .mockResolvedValue(makeSubmission({ status: 'pending' }));

      await expect(
        service.submit(makeAgent(), { documentType: 'NIN_SLIP' }, validFile),
      ).rejects.toThrow(/KYC_ALREADY_PENDING|awaiting review/);
    });

    it('blocks after the maximum attempts were used', async () => {
      submissionRepo.findOne = vi
        .fn()
        .mockResolvedValue(makeSubmission({ status: 'rejected', attempt: 3 }));

      await expect(
        service.submit(makeAgent(), { documentType: 'NIN_SLIP' }, validFile),
      ).rejects.toThrow(ForbiddenException);
    });

    it('surfaces storage failures as 503 without writing a submission', async () => {
      storage.persist = vi.fn().mockResolvedValue(null);

      await expect(
        service.submit(makeAgent(), { documentType: 'NIN_SLIP' }, validFile),
      ).rejects.toThrow(ServiceUnavailableException);
      expect(submissionRepo.save).not.toHaveBeenCalled();
    });

    it('creates a pending submission, bumps the attempt counter, and marks the agent pending', async () => {
      const agent = makeAgent();
      const result = await service.submit(
        agent,
        { documentType: 'NIN_SLIP' },
        validFile,
      );

      expect(storage.persist).toHaveBeenCalledWith(
        validFile.buffer,
        'image/jpeg',
        'agent-123',
      );
      expect(submissionRepo.create).toHaveBeenCalledWith({
        agentId: 'agent-123',
        status: 'pending',
        documentType: 'NIN_SLIP',
        documentUrl: 'oruvia/kyc/agent-123-abc.jpg',
        attempt: 1,
      });
      expect(agent.verificationStatus).toBe('pending');
      expect(result.verificationStatus).toBe('pending');
      expect(result.activeSubmission?.status).toBe('pending');
      expect(result.attemptsUsed).toBe(1);
    });

    it('continues the attempt counter after a rejection', async () => {
      const agent = makeAgent({ verificationStatus: 'rejected' });
      submissionRepo.findOne = vi
        .fn()
        .mockResolvedValue(makeSubmission({ status: 'rejected', attempt: 2 }));

      const result = await service.submit(
        agent,
        { documentType: 'DRIVERS_LICENSE' },
        validFile,
      );

      expect(submissionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ attempt: 3 }),
      );
      expect(result.attemptsUsed).toBe(3);
    });
  });

  describe('getStatus', () => {
    it('reports unverified with no submissions', async () => {
      const result = await service.getStatus(makeAgent());

      expect(result).toMatchObject({
        verificationStatus: 'unverified',
        activeSubmission: null,
        lastRejection: null,
        attemptsUsed: 0,
        maxAttempts: 3,
      });
    });

    it('exposes the rejection reason only via lastRejection', async () => {
      submissionRepo.findOne = vi
        .fn()
        .mockResolvedValue(
          makeSubmission({
            status: 'rejected',
            rejectionReason: 'Blurry photo',
            reviewedAt: new Date(),
          }),
        );

      const result = await service.getStatus(makeAgent());

      expect(result.activeSubmission).toBeNull();
      expect(result.lastRejection).toMatchObject({ reason: 'Blurry photo' });
    });
  });

  describe('getDocument', () => {
    it('throws when no submission exists', async () => {
      await expect(service.getDocument(makeAgent())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('streams the stored bytes of the latest submission', async () => {
      submissionRepo.findOne = vi.fn().mockResolvedValue(makeSubmission());
      storage.retrieve = vi
        .fn()
        .mockResolvedValue({ buffer: Buffer.from('img'), mimeType: 'image/jpeg' });

      const document = await service.getDocument(makeAgent());

      expect(storage.retrieve).toHaveBeenCalledWith(
        'oruvia/kyc/agent-123-abc.jpg',
      );
      expect(document.mimeType).toBe('image/jpeg');
    });

    it('throws when the stored document is missing', async () => {
      submissionRepo.findOne = vi.fn().mockResolvedValue(makeSubmission());
      storage.retrieve = vi.fn().mockResolvedValue(null);

      await expect(service.getDocument(makeAgent())).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('notifyDecision', () => {
    it('sends the decision email to the agent', async () => {
      agentRepo.findOne = vi.fn().mockResolvedValue(makeAgent());

      await service.notifyDecision('agent-123', false, 'Expired ID');

      expect(mailService.sendKycDecision).toHaveBeenCalledWith(
        'alice@example.com',
        'Alice Agent',
        false,
        'agent',
        'Expired ID',
      );
    });

    it('is a no-op for unknown agents', async () => {
      agentRepo.findOne = vi.fn().mockResolvedValue(null);

      await service.notifyDecision('missing', true);

      expect(mailService.sendKycDecision).not.toHaveBeenCalled();
    });
  });
});
