import { Injectable } from '@nestjs/common';

export interface StoredKycDocument {
  /** Provider-native reference persisted on the submission row (public_id or file name). */
  reference: string;
}

@Injectable()
export abstract class KycStorageProvider {
  abstract persist(
    buffer: Buffer,
    mimeType: string,
    ownerId: string,
  ): Promise<StoredKycDocument | null>;

  abstract retrieve(
    reference: string,
  ): Promise<{ buffer: Buffer; mimeType: string } | null>;
}
