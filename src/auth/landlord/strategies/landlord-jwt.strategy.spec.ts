import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Repository } from 'typeorm';
import type { LandlordUser } from '../entities/landlord-user.entity.js';
import { LandlordJwtStrategy } from './landlord-jwt.strategy.js';

describe('LandlordJwtStrategy', () => {
  let strategy: LandlordJwtStrategy;
  let configService: Partial<ConfigService>;
  let landlordRepo: Partial<Record<keyof Repository<LandlordUser>, any>>;

  beforeEach(() => {
    configService = {
      getOrThrow: vi.fn().mockReturnValue('super-secret-key-that-is-at-least-32-chars'),
    };
    landlordRepo = {
      findOne: vi.fn(),
    };

    strategy = new LandlordJwtStrategy(configService as any, landlordRepo as any);
  });

  it('rejects invalid payload without sub or non-landlord accountType', async () => {
    await expect(
      strategy.validate({ sub: '', email: 'test@example.com', tokenVersion: 0, accountType: 'landlord' }),
    ).rejects.toThrow(UnauthorizedException);

    await expect(
      strategy.validate({ sub: 'id-1', email: 'test@example.com', tokenVersion: 0, accountType: 'seeker' as any }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects nonexistent landlord', async () => {
    landlordRepo.findOne!.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: 'missing-id', email: 'test@example.com', tokenVersion: 0, accountType: 'landlord' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects revoked token when tokenVersion does not match landlord entity', async () => {
    landlordRepo.findOne!.mockResolvedValue({ id: 'id-1', tokenVersion: 2 });

    await expect(
      strategy.validate({ sub: 'id-1', email: 'test@example.com', tokenVersion: 1, accountType: 'landlord' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('returns landlord when token and version are valid', async () => {
    const landlord = { id: 'id-1', email: 'test@example.com', tokenVersion: 2 };
    landlordRepo.findOne!.mockResolvedValue(landlord);

    const result = await strategy.validate({
      sub: 'id-1',
      email: 'test@example.com',
      tokenVersion: 2,
      accountType: 'landlord',
    });

    expect(result).toBe(landlord);
  });
});
