import { mkdir, rm, writeFile as fsWriteFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import type { ConfigService } from '@nestjs/config';
import { LocalKycStorage } from './local-kyc.storage.js';

describe('LocalKycStorage', () => {
  let storage: LocalKycStorage;
  let rootDir: string;

  beforeEach(async () => {
    rootDir = path.join(os.tmpdir(), `oruvia-kyc-test-${crypto.randomBytes(6).toString('hex')}`);
    const config = {
      get: vi.fn((key: string, options?: any) =>
        key === 'KYC_UPLOAD_DIR' ? rootDir : options?.infer ?? undefined,
      ),
    } as unknown as ConfigService;

    storage = new LocalKycStorage(config as any);
    await mkdir(rootDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  describe('persist', () => {
    it('writes the buffer under a generated unguessable name', async () => {
      const stored = await storage.persist(
        Buffer.from('image-bytes'),
        'image/jpeg',
        'agent-123',
      );

      expect(stored).not.toBeNull();
      expect(stored!.reference).toMatch(/^agent-123-[0-9a-f]{32}\.jpg$/);
    });

    it('rejects MIME types outside the image whitelist', async () => {
      const stored = await storage.persist(
        Buffer.from('exe-bytes'),
        'application/x-msdownload',
        'agent-123',
      );

      expect(stored).toBeNull();
    });

    it('maps png and webp to safe extensions', async () => {
      const png = await storage.persist(Buffer.from('x'), 'image/png', 'a');
      const webp = await storage.persist(Buffer.from('x'), 'image/webp', 'a');

      expect(png!.reference).toMatch(/\.png$/);
      expect(webp!.reference).toMatch(/\.webp$/);
    });
  });

  describe('retrieve', () => {
    it('reads back bytes and detected MIME type', async () => {
      const stored = await storage.persist(
        Buffer.from('secret-id-image'),
        'image/png',
        'landlord-9',
      );

      const document = await storage.retrieve(stored!.reference);

      expect(document).not.toBeNull();
      expect(document!.buffer.toString()).toBe('secret-id-image');
      expect(document!.mimeType).toBe('image/png');
    });

    it('returns null for missing files', async () => {
      const document = await storage.retrieve('agent-123-deadbeef.jpg');
      expect(document).toBeNull();
    });

    it('rejects traversal attempts regardless of file existence', async () => {
      const secret = path.join(os.tmpdir(), `oruvia-kyc-secret-${Date.now()}.txt`);
      await fsWriteFile(secret, 'do-not-read');

      try {
        expect(await storage.retrieve('../../etc/passwd')).toBeNull();
        expect(await storage.retrieve(`..${path.sep}..${path.sep}tmp`)).toBeNull();
        expect(await storage.retrieve('')).toBeNull();
        // A real file that exists outside the storage root must not be readable
        expect(await storage.retrieve(path.basename(secret))).toBeNull();
      } finally {
        await rm(secret, { force: true });
      }
    });
  });
});
