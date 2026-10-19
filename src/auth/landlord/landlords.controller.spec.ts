import type { LandlordUser } from './entities/landlord-user.entity.js';
import { LandlordsController } from './landlords.controller.js';
import type { LandlordsService } from './landlords.service.js';

describe('LandlordsController', () => {
  let controller: LandlordsController;
  let service: Partial<Record<keyof LandlordsService, any>>;

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

    controller = new LandlordsController(service as any);
  });

  it('delegates register to service', async () => {
    const dto = { fullName: 'John Landlord', email: 'landlord@example.com', password: 'Password123!' };
    await controller.register(dto);
    expect(service.register).toHaveBeenCalledWith(dto);
  });

  it('delegates verifyEmail to service', async () => {
    const dto = { email: 'landlord@example.com', code: '123456' };
    await controller.verifyEmail(dto);
    expect(service.verifyEmail).toHaveBeenCalledWith(dto);
  });

  it('delegates resendVerificationCode to service', async () => {
    const dto = { email: 'landlord@example.com' };
    await controller.resendVerificationCode(dto);
    expect(service.resendVerificationCode).toHaveBeenCalledWith(dto);
  });

  it('delegates login to service', async () => {
    const dto = { email: 'landlord@example.com', password: 'Password123!' };
    await controller.login(dto);
    expect(service.login).toHaveBeenCalledWith(dto);
  });

  it('delegates changePassword to service with authenticated landlordId', async () => {
    const dto = { currentPassword: 'old', newPassword: 'new' };
    await controller.changePassword('landlord-1', dto);
    expect(service.changePassword).toHaveBeenCalledWith('landlord-1', dto);
  });

  it('delegates forgotPassword to service', async () => {
    const dto = { email: 'landlord@example.com' };
    await controller.forgotPassword(dto);
    expect(service.forgotPassword).toHaveBeenCalledWith(dto);
  });

  it('delegates resetPassword to service', async () => {
    const dto = { email: 'landlord@example.com', code: '123456', newPassword: 'new' };
    await controller.resetPassword(dto);
    expect(service.resetPassword).toHaveBeenCalledWith(dto);
  });

  it('returns safe profile in getProfile', async () => {
    const landlord = { id: 'landlord-1', email: 'landlord@example.com' } as LandlordUser;
    const result = await controller.getProfile(landlord);
    expect(service.toProfile).toHaveBeenCalledWith(landlord);
    expect(result).toEqual({ id: 'landlord-1', email: 'landlord@example.com' });
  });
});
