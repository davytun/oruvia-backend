import { StreamableFile } from '@nestjs/common';
import type { AgentUser } from './entities/agent-user.entity.js';
import type { AgentKycService } from './agent-kyc.service.js';
import { AgentKycController } from './agent-kyc.controller.js';

describe('AgentKycController', () => {
  let controller: AgentKycController;
  let service: Partial<Record<keyof AgentKycService, any>>;

  const agent = { id: 'agent-1', email: 'agent@example.com' } as AgentUser;

  beforeEach(() => {
    service = {
      submit: vi.fn(),
      getStatus: vi.fn(),
      getDocument: vi.fn(),
    };

    controller = new AgentKycController(service as any);
  });

  it('maps the multer file to the service upload shape', async () => {
    const multerFile = {
      buffer: Buffer.from('img'),
      mimetype: 'image/jpeg',
    };
    const dto = { documentType: 'NIN_SLIP' } as any;

    await controller.submit(agent, dto, multerFile as any);

    expect(service.submit).toHaveBeenCalledWith(agent, dto, {
      buffer: multerFile.buffer,
      mimeType: 'image/jpeg',
    });
  });

  it('passes an undefined file through when no document was uploaded', async () => {
    const dto = { documentType: 'NIN_SLIP' } as any;

    await controller.submit(agent, dto, undefined);

    expect(service.submit).toHaveBeenCalledWith(agent, dto, undefined);
  });

  it('delegates getStatus to the service', async () => {
    service.getStatus.mockResolvedValue({ verificationStatus: 'pending' });

    await expect(controller.getStatus(agent)).resolves.toMatchObject({
      verificationStatus: 'pending',
    });
    expect(service.getStatus).toHaveBeenCalledWith(agent);
  });

  it('streams the document as an inline StreamableFile', async () => {
    service.getDocument.mockResolvedValue({
      buffer: Buffer.from('img'),
      mimeType: 'image/jpeg',
    });

    const file = await controller.getDocument(agent);

    expect(file).toBeInstanceOf(StreamableFile);
    expect(service.getDocument).toHaveBeenCalledWith(agent);
  });
});
