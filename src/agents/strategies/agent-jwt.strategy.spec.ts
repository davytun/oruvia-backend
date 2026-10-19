import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Repository } from 'typeorm';
import type { AgentUser } from '../entities/agent-user.entity.js';
import { AgentJwtStrategy } from './agent-jwt.strategy.js';

describe('AgentJwtStrategy', () => {
  let strategy: AgentJwtStrategy;
  let configService: Partial<ConfigService>;
  let agentRepo: Partial<Record<keyof Repository<AgentUser>, any>>;

  beforeEach(() => {
    configService = {
      getOrThrow: vi.fn().mockReturnValue('super-secret-key-that-is-at-least-32-chars'),
    };
    agentRepo = {
      findOne: vi.fn(),
    };

    strategy = new AgentJwtStrategy(configService as any, agentRepo as any);
  });

  it('rejects invalid payload without sub or non-agent accountType', async () => {
    await expect(
      strategy.validate({ sub: '', email: 'agent@example.com', tokenVersion: 0, accountType: 'agent' }),
    ).rejects.toThrow(UnauthorizedException);

    await expect(
      strategy.validate({ sub: 'id-1', email: 'agent@example.com', tokenVersion: 0, accountType: 'seeker' as any }),
    ).rejects.toThrow(UnauthorizedException);

    await expect(
      strategy.validate({ sub: 'id-1', email: 'agent@example.com', tokenVersion: 0, accountType: 'landlord' as any }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects nonexistent agent', async () => {
    agentRepo.findOne!.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: 'missing-id', email: 'agent@example.com', tokenVersion: 0, accountType: 'agent' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects revoked token when tokenVersion does not match agent entity', async () => {
    agentRepo.findOne!.mockResolvedValue({ id: 'id-1', tokenVersion: 2 });

    await expect(
      strategy.validate({ sub: 'id-1', email: 'agent@example.com', tokenVersion: 1, accountType: 'agent' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('returns agent when token and version are valid', async () => {
    const agent = { id: 'id-1', email: 'agent@example.com', tokenVersion: 2 };
    agentRepo.findOne!.mockResolvedValue(agent);

    const result = await strategy.validate({
      sub: 'id-1',
      email: 'agent@example.com',
      tokenVersion: 2,
      accountType: 'agent',
    });

    expect(result).toBe(agent);
  });
});
