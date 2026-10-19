import type { AgentUser } from './entities/agent-user.entity.js';
import { AgentsController } from './agents.controller.js';
import type { AgentsService } from './agents.service.js';

describe('AgentsController', () => {
  let controller: AgentsController;
  let service: Partial<Record<keyof AgentsService, any>>;

  beforeEach(() => {
    service = {
      register: vi.fn(),
      verifyEmail: vi.fn(),
      resendVerificationCode: vi.fn(),
      login: vi.fn(),
      changePassword: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
      toProfile: vi.fn((u) => ({ id: u.id, email: u.email })),
    };

    controller = new AgentsController(service as any);
  });

  it('delegates register to service', async () => {
    const dto = { fullName: 'John Agent', email: 'agent@example.com', password: 'Password123!' };
    await controller.register(dto);
    expect(service.register).toHaveBeenCalledWith(dto);
  });

  it('delegates verifyEmail to service', async () => {
    const dto = { email: 'agent@example.com', code: '123456' };
    await controller.verifyEmail(dto);
    expect(service.verifyEmail).toHaveBeenCalledWith(dto);
  });

  it('delegates resendVerificationCode to service', async () => {
    const dto = { email: 'agent@example.com' };
    await controller.resendVerificationCode(dto);
    expect(service.resendVerificationCode).toHaveBeenCalledWith(dto);
  });

  it('delegates login to service', async () => {
    const dto = { email: 'agent@example.com', password: 'Password123!' };
    await controller.login(dto);
    expect(service.login).toHaveBeenCalledWith(dto);
  });

  it('delegates changePassword to service with authenticated agentId', async () => {
    const dto = { currentPassword: 'old', newPassword: 'new' };
    await controller.changePassword('agent-1', dto);
    expect(service.changePassword).toHaveBeenCalledWith('agent-1', dto);
  });

  it('delegates forgotPassword to service', async () => {
    const dto = { email: 'agent@example.com' };
    await controller.forgotPassword(dto);
    expect(service.forgotPassword).toHaveBeenCalledWith(dto);
  });

  it('delegates resetPassword to service', async () => {
    const dto = { email: 'agent@example.com', code: '123456', newPassword: 'new' };
    await controller.resetPassword(dto);
    expect(service.resetPassword).toHaveBeenCalledWith(dto);
  });

  it('returns safe profile in getProfile', async () => {
    const agent = { id: 'agent-1', email: 'agent@example.com' } as AgentUser;
    const result = await controller.getProfile(agent);
    expect(service.toProfile).toHaveBeenCalledWith(agent);
    expect(result).toEqual({ id: 'agent-1', email: 'agent@example.com' });
  });
});
