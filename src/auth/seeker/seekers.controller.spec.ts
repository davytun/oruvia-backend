import type { SeekerUser } from './entities/seeker-user.entity.js';
import { SeekersController } from './seekers.controller.js';
import type { SeekersService } from './seekers.service.js';

describe('SeekersController', () => {
  let controller: SeekersController;
  let service: Partial<Record<keyof SeekersService, any>>;

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

    controller = new SeekersController(service as any);
  });

  it('delegates register to service', async () => {
    const dto = { fullName: 'John Doe', email: 'john@example.com', password: 'Password123!' };
    await controller.register(dto);
    expect(service.register).toHaveBeenCalledWith(dto);
  });

  it('delegates verifyEmail to service', async () => {
    const dto = { email: 'john@example.com', code: '123456' };
    await controller.verifyEmail(dto);
    expect(service.verifyEmail).toHaveBeenCalledWith(dto);
  });

  it('delegates resendVerificationCode to service', async () => {
    const dto = { email: 'john@example.com' };
    await controller.resendVerificationCode(dto);
    expect(service.resendVerificationCode).toHaveBeenCalledWith(dto);
  });

  it('delegates login to service', async () => {
    const dto = { email: 'john@example.com', password: 'Password123!' };
    await controller.login(dto);
    expect(service.login).toHaveBeenCalledWith(dto);
  });

  it('delegates changePassword to service with authenticated seekerId', async () => {
    const dto = { currentPassword: 'old', newPassword: 'new' };
    await controller.changePassword('seeker-1', dto);
    expect(service.changePassword).toHaveBeenCalledWith('seeker-1', dto);
  });

  it('delegates forgotPassword to service', async () => {
    const dto = { email: 'john@example.com' };
    await controller.forgotPassword(dto);
    expect(service.forgotPassword).toHaveBeenCalledWith(dto);
  });

  it('delegates resetPassword to service', async () => {
    const dto = { email: 'john@example.com', code: '123456', newPassword: 'new' };
    await controller.resetPassword(dto);
    expect(service.resetPassword).toHaveBeenCalledWith(dto);
  });

  it('returns safe profile in getProfile', async () => {
    const seeker = { id: 'seeker-1', email: 'john@example.com' } as SeekerUser;
    const result = await controller.getProfile(seeker);
    expect(service.toProfile).toHaveBeenCalledWith(seeker);
    expect(result).toEqual({ id: 'seeker-1', email: 'john@example.com' });
  });
});
