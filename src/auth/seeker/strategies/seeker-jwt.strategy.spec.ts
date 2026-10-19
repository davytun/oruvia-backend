import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Repository } from 'typeorm';
import type { SeekerUser } from '../entities/seeker-user.entity.js';
import { SeekerJwtStrategy } from './seeker-jwt.strategy.js';

describe('SeekerJwtStrategy', () => {
  let strategy: SeekerJwtStrategy;
  let configService: Partial<ConfigService>;
  let seekerRepo: Partial<Record<keyof Repository<SeekerUser>, any>>;

  beforeEach(() => {
    configService = {
      getOrThrow: vi.fn().mockReturnValue('super-secret-key-that-is-at-least-32-chars'),
    };
    seekerRepo = {
      findOne: vi.fn(),
    };

    strategy = new SeekerJwtStrategy(configService as any, seekerRepo as any);
  });

  it('rejects invalid payload without sub or non-seeker accountType', async () => {
    await expect(
      strategy.validate({ sub: '', email: 'test@example.com', tokenVersion: 0, accountType: 'seeker' }),
    ).rejects.toThrow(UnauthorizedException);

    await expect(
      strategy.validate({ sub: 'id-1', email: 'test@example.com', tokenVersion: 0, accountType: 'landlord' as any }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects nonexistent seeker', async () => {
    seekerRepo.findOne!.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: 'missing-id', email: 'test@example.com', tokenVersion: 0, accountType: 'seeker' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects revoked token when tokenVersion does not match seeker entity', async () => {
    seekerRepo.findOne!.mockResolvedValue({ id: 'id-1', tokenVersion: 2 });

    await expect(
      strategy.validate({ sub: 'id-1', email: 'test@example.com', tokenVersion: 1, accountType: 'seeker' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('returns seeker when token and version are valid', async () => {
    const seeker = { id: 'id-1', email: 'test@example.com', tokenVersion: 2 };
    seekerRepo.findOne!.mockResolvedValue(seeker);

    const result = await strategy.validate({
      sub: 'id-1',
      email: 'test@example.com',
      tokenVersion: 2,
      accountType: 'seeker',
    });

    expect(result).toBe(seeker);
  });
});
