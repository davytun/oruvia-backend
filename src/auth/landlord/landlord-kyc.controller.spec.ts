import { StreamableFile } from '@nestjs/common';
import type { LandlordUser } from './entities/landlord-user.entity.js';
import type { LandlordKycService } from './landlord-kyc.service.js';
import { LandlordKycController } from './landlord-kyc.controller.js';

describe('LandlordKycController', () => {
  let controller: LandlordKycController;
  let service: Partial<Record<keyof LandlordKycService, any>>;

  const landlord = { id: 'landlord-1', email: 'landlord@example.com' } as LandlordUser;

  beforeEach(() => {
    service = {
      submit: vi.fn(),
      getStatus: vi.fn(),
      getDocument: vi.fn(),
    };

    controller = new LandlordKycController(service as any);
  });

  it('maps the multer file to the service upload shape', async () => {
    const multerFile = {
      buffer: Buffer.from('img'),
      mimetype: 'image/png',
    };
    const dto = { documentType: 'DRIVERS_LICENSE' } as any;

    await controller.submit(landlord, dto, multerFile as any);

    expect(service.submit).toHaveBeenCalledWith(landlord, dto, {
      buffer: multerFile.buffer,
      mimeType: 'image/png',
    });
  });

  it('delegates getStatus to the service', async () => {
    service.getStatus.mockResolvedValue({ verificationStatus: 'unverified' });

    await expect(controller.getStatus(landlord)).resolves.toMatchObject({
      verificationStatus: 'unverified',
    });
    expect(service.getStatus).toHaveBeenCalledWith(landlord);
  });

  it('streams the document as an inline StreamableFile', async () => {
    service.getDocument.mockResolvedValue({
      buffer: Buffer.from('img'),
      mimeType: 'image/webp',
    });

    const file = await controller.getDocument(landlord);

    expect(file).toBeInstanceOf(StreamableFile);
    expect(service.getDocument).toHaveBeenCalledWith(landlord);
  });
});
