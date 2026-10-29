import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation.js';
import { CloudinaryKycStorage } from './cloudinary-kyc.storage.js';
import { LocalKycStorage } from './local-kyc.storage.js';
import { KycStorageProvider } from './kyc-storage.interface.js';

@Module({
  providers: [
    {
      provide: KycStorageProvider,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): KycStorageProvider => {
        const provider =
          config.get<string>('KYC_STORAGE_PROVIDER', { infer: true }) ?? 'local';
        return provider === 'cloudinary'
          ? new CloudinaryKycStorage(config)
          : new LocalKycStorage(config);
      },
    },
  ],
  exports: [KycStorageProvider],
})
export class KycModule {}
