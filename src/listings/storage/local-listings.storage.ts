import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Env } from '../../config/env.validation.js';
import {
  LISTING_MAX_PHOTO_BYTES,
  LISTING_MIME_EXTENSIONS,
} from '../listings.constants.js';
import {
  type StoredListingImage,
  ListingsStorageProvider,
} from './listings-storage.interface.js';

@Injectable()
export class LocalListingsStorage extends ListingsStorageProvider {
  private readonly rootDir: string;

  constructor(config: ConfigService<Env, true>) {
    super();
    const configured =
      config.get<string>('LISTINGS_UPLOAD_DIR', { infer: true }) ??
      'uploads/listings';
    this.rootDir = path.resolve(configured);
  }

  async persist(
    buffer: Buffer,
    mimeType: string,
    ownerId: string,
  ): Promise<StoredListingImage | null> {
    const extension = LISTING_MIME_EXTENSIONS.get(mimeType);
    if (!extension) {
      return null;
    }
    if (buffer.byteLength > LISTING_MAX_PHOTO_BYTES) {
      return null;
    }

    await mkdir(this.rootDir, { recursive: true });
    const name = `${ownerId}-${crypto.randomBytes(16).toString('hex')}${extension}`;
    await writeFile(path.join(this.rootDir, name), buffer);
    return { url: `/media/listings/${name}` };
  }
}
