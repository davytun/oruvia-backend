import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Env } from '../../config/env.validation.js';
import { KYC_MIME_EXTENSIONS } from './kyc.constants.js';
import {
  type StoredKycDocument,
  KycStorageProvider,
} from './kyc-storage.interface.js';

@Injectable()
export class LocalKycStorage extends KycStorageProvider {
  private readonly logger = new Logger('LocalKycStorage');
  private readonly rootDir: string;

  constructor(config: ConfigService<Env, true>) {
    super();
    const configured =
      config.get<string>('KYC_UPLOAD_DIR', { infer: true }) ?? 'uploads/kyc';
    this.rootDir = path.resolve(configured);
  }

  async persist(
    buffer: Buffer,
    mimeType: string,
    ownerId: string,
  ): Promise<StoredKycDocument | null> {
    const extension = KYC_MIME_EXTENSIONS.get(mimeType);
    if (!extension) {
      return null;
    }

    await mkdir(this.rootDir, { recursive: true });
    const reference = `${ownerId}-${crypto.randomBytes(16).toString('hex')}${extension}`;
    await writeFile(path.join(this.rootDir, reference), buffer);
    return { reference };
  }

  async retrieve(
    reference: string,
  ): Promise<{ buffer: Buffer; mimeType: string } | null> {
    if (!reference || reference !== path.basename(reference)) {
      return null;
    }

    try {
      const buffer = await readFile(path.join(this.rootDir, reference));
      return { buffer, mimeType: this.detectMimeType(reference) };
    } catch {
      this.logger.warn(`KYC document missing from local storage: ${reference}`);
      return null;
    }
  }

  private detectMimeType(reference: string): string {
    const extension = path.extname(reference).toLowerCase();
    for (const [mimeType, mapped] of KYC_MIME_EXTENSIONS) {
      if (mapped === extension) return mimeType;
    }
    return 'application/octet-stream';
  }
}
