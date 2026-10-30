import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'node:crypto';
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
export class CloudinaryListingsStorage extends ListingsStorageProvider {
  private readonly logger = new Logger('CloudinaryListingsStorage');
  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly folder: string;

  constructor(config: ConfigService<Env, true>) {
    super();
    this.cloudName = config.getOrThrow<string>('CLOUDINARY_CLOUD_NAME', {
      infer: true,
    });
    this.apiKey = config.getOrThrow<string>('CLOUDINARY_API_KEY', {
      infer: true,
    });
    this.apiSecret = config.getOrThrow<string>('CLOUDINARY_API_SECRET', {
      infer: true,
    });
    this.folder =
      config.get<string>('CLOUDINARY_LISTINGS_FOLDER', { infer: true }) ??
      'oruvia/listings';
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

    const publicId = `${this.folder}/${ownerId}-${crypto
      .randomBytes(16)
      .toString('hex')}${extension}`;

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = crypto
      .createHash('sha1')
      .update(
        `folder=${this.folder}&public_id=${publicId}&resource_type=image&timestamp=${timestamp}${this.apiSecret}`,
      )
      .digest('hex');

    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(buffer)], { type: mimeType }));
    form.append('folder', this.folder);
    form.append('public_id', publicId);
    form.append('resource_type', 'image');
    form.append('overwrite', 'false');
    form.append('api_key', this.apiKey);
    form.append('timestamp', timestamp);
    form.append('signature', signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
      { method: 'POST', body: form },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(
        `Cloudinary listing upload failed for owner ${ownerId}: HTTP ${response.status}`,
      );
      this.logger.debug(`Cloudinary error response: ${errorBody.slice(0, 500)}`);
      return null;
    }

    const body = (await response.json()) as { secure_url?: string };
    if (!body.secure_url) {
      this.logger.error(
        `Cloudinary listing upload for owner ${ownerId} returned no secure_url`,
      );
      return null;
    }

    return { url: body.secure_url };
  }
}
