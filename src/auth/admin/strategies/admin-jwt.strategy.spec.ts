import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Repository } from 'typeorm';
import type { AdminUser } from '../entities/admin-user.entity.js';
import { AdminJwtStrategy } from './admin-jwt.strategy.js';

describe('AdminJwtStrategy', () => {
  let strategy: AdminJwtStrategy;
  let configService: Partial<ConfigService>;
  let adminRepo: Partial<Record<keyof Repository<AdminUser>, any>>;

  beforeEach(() => {
    configService = {
      getOrThrow: vi.fn().mockReturnValue('super-secret-key-that-is-at-least-32-chars'),
    };
    adminRepo = {
      findOne: vi.fn(),
    };

    strategy = new AdminJwtStrategy(configService as any, adminRepo as any);
  });

  it('rejects invalid payload without sub or non-admin accountType', async () => {
    await expect(
      strategy.validate({ sub: '', email: 'admin@oruvia.com', tokenVersion: 0, accountType: 'admin' }),
    ).rejects.toThrow(UnauthorizedException);

    await expect(
      strategy.validate({ sub: 'id-1', email: 'admin@oruvia.com', tokenVersion: 0, accountType: 'seeker' as any }),
    ).rejects.toThrow(UnauthorizedException);

    await expect(
      strategy.validate({ sub: 'id-1', email: 'admin@oruvia.com', tokenVersion: 0, accountType: 'landlord' as any }),
    ).rejects.toThrow(UnauthorizedException);

    await expect(
      strategy.validate({ sub: 'id-1', email: 'admin@oruvia.com', tokenVersion: 0, accountType: 'agent' as any }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects nonexistent admin', async () => {
    adminRepo.findOne!.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: 'missing-id', email: 'admin@oruvia.com', tokenVersion: 0, accountType: 'admin' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects revoked token when tokenVersion does not match admin entity', async () => {
    adminRepo.findOne!.mockResolvedValue({ id: 'id-1', tokenVersion: 2, status: 'ACTIVE' });

    await expect(
      strategy.validate({ sub: 'id-1', email: 'admin@oruvia.com', tokenVersion: 1, accountType: 'admin' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects inactive or suspended admin', async () => {
    adminRepo.findOne!.mockResolvedValue({ id: 'id-1', tokenVersion: 2, status: 'SUSPENDED' });

    await expect(
      strategy.validate({ sub: 'id-1', email: 'admin@oruvia.com', tokenVersion: 2, accountType: 'admin' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('returns admin when token, version, and status are valid', async () => {
    const admin = { id: 'id-1', email: 'admin@oruvia.com', tokenVersion: 2, status: 'ACTIVE' };
    adminRepo.findOne!.mockResolvedValue(admin);

    const result = await strategy.validate({
      sub: 'id-1',
      email: 'admin@oruvia.com',
      tokenVersion: 2,
      accountType: 'admin',
    });

    expect(result).toBe(admin);
  });
});
