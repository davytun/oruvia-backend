import type { AdminUser } from './entities/admin-user.entity.js';
import { AdminsController } from './admins.controller.js';
import type { AdminsService } from './admins.service.js';

describe('AdminsController', () => {
  let controller: AdminsController;
  let service: Partial<Record<keyof AdminsService, any>>;

  beforeEach(() => {
    service = {
      login: vi.fn(),
      changePassword: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
      toProfile: vi.fn((u) => ({ id: u.id, email: u.email })),
    };

    controller = new AdminsController(service as any);
  });

  it('delegates login to service', async () => {
    const dto = { email: 'admin@oruvia.com', password: 'Password123!' };
    await controller.login(dto);
    expect(service.login).toHaveBeenCalledWith(dto);
  });

  it('delegates changePassword to service with authenticated adminId', async () => {
    const dto = { currentPassword: 'old', newPassword: 'new' };
    const admin = { id: 'admin-1', email: 'admin@oruvia.com' } as AdminUser;
    await controller.changePassword(admin, dto);
    expect(service.changePassword).toHaveBeenCalledWith('admin-1', dto);
  });

  it('delegates forgotPassword to service', async () => {
    const dto = { email: 'admin@oruvia.com' };
    await controller.forgotPassword(dto);
    expect(service.forgotPassword).toHaveBeenCalledWith(dto);
  });

  it('delegates resetPassword to service', async () => {
    const dto = { email: 'admin@oruvia.com', code: '123456', newPassword: 'new' };
    await controller.resetPassword(dto);
    expect(service.resetPassword).toHaveBeenCalledWith(dto);
  });

  it('returns safe profile in getProfile', async () => {
    const admin = { id: 'admin-1', email: 'admin@oruvia.com' } as AdminUser;
    const result = await controller.getProfile(admin);
    expect(service.toProfile).toHaveBeenCalledWith(admin);
    expect(result).toEqual({ id: 'admin-1', email: 'admin@oruvia.com' });
  });
});
