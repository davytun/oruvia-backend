import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'node:crypto';
import type { Env } from '../../config/env.validation.js';
import {
  KYC_MAX_UPLOAD_BYTES,
  KYC_MIME_EXTENSIONS,
} from './kyc.constants.js';
import {
  type StoredKycDocument,
  KycStorageProvider,
} from './kyc-storage.interface.js';

/** Lifetime of signed URLs used to read `authenticated` assets. */
const SIGNED_URL_TTL_SECONDS = 300;

@Injectable()
export class CloudinaryKycStorage extends KycStorageProvider {
  private readonly logger = new Logger('CloudinaryKycStorage');
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
      config.get<string>('CLOUDINARY_KYC_FOLDER', { infer: true }) ??
      'oruvia/kyc';
  }

  async persist(
    buffer: Buffer,
    mimeType: string,
    ownerId: string,
  ): Promise<StoredKycDocument | null> {
    if (!KYC_MIME_EXTENSIONS.has(mimeType)) {
      return null;
    }
    if (buffer.byteLength > KYC_MAX_UPLOAD_BYTES) {
      return null;
    }

    const extension = KYC_MIME_EXTENSIONS.get(mimeType) ?? '.bin';
    const publicId = `${this.folder}/${ownerId}-${crypto
      .randomBytes(16)
      .toString('hex')}${extension}`;

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = crypto
      .createHash('sha1')
      .update(
        `folder=${this.folder}&public_id=${publicId}&resource_type=raw&timestamp=${timestamp}${this.apiSecret}`,
      )
      .digest('hex');

    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(buffer)], { type: mimeType }));
    form.append('public_id', publicId);
    form.append('folder', this.folder);
    form.append('resource_type', 'raw');
    form.append('access_mode', 'authenticated');
    form.append('overwrite', 'false');
    form.append('api_key', this.apiKey);
    form.append('timestamp', timestamp);
    form.append('signature', signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${this.cloudName}/raw/upload`,
      { method: 'POST', body: form },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      // Never log document contents; provider error text is safe (no body).
      this.logger.error(
        `Cloudinary upload failed for owner ${ownerId}: HTTP ${response.status}`,
      );
      this.logger.debug(`Cloudinary error response: ${errorBody.slice(0, 500)}`);
      return null;
    }

    const body = (await response.json()) as { public_id?: string };
    if (!body.public_id) {
      this.logger.error(
        `Cloudinary upload for owner ${ownerId} returned no public_id`,
      );
      return null;
    }

    return { reference: body.public_id };
  }

  async retrieve(
    reference: string,
  ): Promise<{ buffer: Buffer; mimeType: string } | null> {
    if (!reference.startsWith(`${this.folder}/`)) {
      return null;
    }

    const url = this.buildSignedUrl(reference);
    if (!url) {
      return null;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn(
          `Cloudinary retrieval failed for ${reference}: HTTP ${response.status}`,
        );
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      return {
        buffer: Buffer.from(arrayBuffer),
        mimeType: this.detectMimeType(reference),
      };
    } catch {
      this.logger.warn(`Cloudinary retrieval error for ${reference}`);
      return null;
    }
  }

  private buildSignedUrl(publicId: string): string | null {
    const exp = Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS;
    const toSign = `${publicId}/${exp}`;
    const hash = crypto
      .createHash('sha1')
      .update(`${toSign}${this.apiSecret}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    if (!hash) {
      return null;
    }

    return (
      `https://res.cloudinary.com/${this.cloudName}/raw/authenticated/` +
      `s--${hash}--/v1/${publicId}?Expires=${exp}`
    );
  }

  private detectMimeType(publicId: string): string {
    const dot = publicId.lastIndexOf('.');
    const extension = dot >= 0 ? publicId.slice(dot).toLowerCase() : '';
    for (const [mimeType, mapped] of KYC_MIME_EXTENSIONS) {
      if (mapped === extension) return mimeType;
    }
    return 'application/octet-stream';
  }
}
