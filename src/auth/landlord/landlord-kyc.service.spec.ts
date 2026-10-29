import {
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { MailService } from '../../mail/mail.service.js';
import type { KycStorageProvider } from '../kyc/kyc-storage.interface.js';
import { LandlordKycSubmission } from './entities/landlord-kyc-submission.entity.js';
import type { LandlordUser } from './entities/landlord-user.entity.js';
import { LandlordKycService } from './landlord-kyc.service.js';

describe('LandlordKycService', () => {
  let service: LandlordKycService;
  let landlordRepo: Partial<Record<keyof Repository<LandlordUser>, any>>;
  let submissionRepo: Partial<Record<keyof Repository<LandlordKycSubmission>, any>>;
  let storage: Partial<Record<keyof KycStorageProvider, any>>;
  let mailService: Partial<Record<keyof MailService, any>>;

  const makeLandlord = (overrides: Partial<LandlordUser> = {}): LandlordUser =>
    ({
      id: 'landlord-123',
      fullName: 'Bob Landlord',
      email: 'bob@example.com',
      verificationStatus: 'unverified',
      ...overrides,
    }) as LandlordUser;

  const makeSubmission = (
    overrides: Partial<LandlordKycSubmission> = {},
  ): LandlordKycSubmission =>
    ({
      id: 'sub-1',
      landlordId: 'landlord-123',
      status: 'pending',
      documentType: 'NIN_SLIP',
      documentUrl: 'oruvia/kyc/landlord-123-abc.jpg',
      attempt: 1,
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: null,
      createdAt: new Date(),
      ...overrides,
    }) as LandlordKycSubmission;

  const validFile = {
    buffer: Buffer.from('fake-image-bytes'),
    mimeType: 'image/jpeg',
  };

  beforeEach(() => {
    landlordRepo = {
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
      persist: vi
        .fn()
        .mockResolvedValue({ reference: 'oruvia/kyc/landlord-123-abc.jpg' }),
      retrieve: vi.fn(),
    };

    mailService = {
      sendKycDecision: vi.fn().mockResolvedValue(undefined),
    };

    service = new LandlordKycService(
      landlordRepo as any,
      submissionRepo as any,
      storage as any,
      mailService as any,
    );
  });

  it('creates a pending submission and marks the landlord pending', async () => {
    const landlord = makeLandlord();

    const result = await service.submit(
      landlord,
      { documentType: 'INTERNATIONAL_PASSPORT' },
      validFile,
    );

    expect(storage.persist).toHaveBeenCalledWith(
      validFile.buffer,
      'image/jpeg',
      'landlord-123',
    );
    expect(submissionRepo.create).toHaveBeenCalledWith({
      landlordId: 'landlord-123',
      status: 'pending',
      documentType: 'INTERNATIONAL_PASSPORT',
      documentUrl: 'oruvia/kyc/landlord-123-abc.jpg',
      attempt: 1,
    });
    expect(landlord.verificationStatus).toBe('pending');
    expect(result.activeSubmission?.status).toBe('pending');
  });

  it('rejects non-image documents with 415', async () => {
    const error = await service
      .submit(
        makeLandlord(),
        { documentType: 'NIN_SLIP' },
        { buffer: Buffer.from('x'), mimeType: 'text/html' },
      )
      .catch((e) => e);

    expect(error).toBeInstanceOf(HttpException);
    expect(error.getStatus()).toBe(415);
  });

  it('conflicts when a submission is already pending', async () => {
    submissionRepo.findOne = vi
      .fn()
      .mockResolvedValue(makeSubmission({ status: 'pending' }));

    await expect(
      service.submit(makeLandlord(), { documentType: 'NIN_SLIP' }, validFile),
    ).rejects.toThrow(ConflictException);
  });

  it('blocks resubmission after the attempt cap', async () => {
    submissionRepo.findOne = vi
      .fn()
      .mockResolvedValue(makeSubmission({ status: 'rejected', attempt: 3 }));

    await expect(
      service.submit(makeLandlord(), { documentType: 'NIN_SLIP' }, validFile),
    ).rejects.toThrow(ForbiddenException);
  });

  it('reports lastRejection with the reason after a rejection', async () => {
    submissionRepo.findOne = vi
      .fn()
      .mockResolvedValue(
        makeSubmission({
          status: 'rejected',
          rejectionReason: 'Unreadable photo',
        }),
      );

    const result = await service.getStatus(makeLandlord());

    expect(result.activeSubmission).toBeNull();
    expect(result.lastRejection).toMatchObject({ reason: 'Unreadable photo' });
    expect(result.attemptsUsed).toBe(1);
  });

  it('throws NotFound when streaming a document that does not exist', async () => {
    submissionRepo.findOne = vi.fn().mockResolvedValue(makeSubmission());
    storage.retrieve = vi.fn().mockResolvedValue(null);

    await expect(service.getDocument(makeLandlord())).rejects.toThrow(
      NotFoundException,
    );
  });

  it('notifies the landlord about an admin decision', async () => {
    landlordRepo.findOne = vi.fn().mockResolvedValue(makeLandlord());

    await service.notifyDecision('landlord-123', true);

    expect(mailService.sendKycDecision).toHaveBeenCalledWith(
      'bob@example.com',
      'Bob Landlord',
      true,
      'landlord',
      undefined,
    );
  });
});
