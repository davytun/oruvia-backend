import { Injectable } from '@nestjs/common';

export interface StoredListingImage {
  /** Publicly served URL stored directly on the listing row. */
  url: string;
}

@Injectable()
export abstract class ListingsStorageProvider {
  abstract persist(
    buffer: Buffer,
    mimeType: string,
    ownerId: string,
  ): Promise<StoredListingImage | null>;
}
