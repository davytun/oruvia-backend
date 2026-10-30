import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentModule } from '../auth/agent/agents.module.js';
import { LandlordModule } from '../auth/landlord/landlords.module.js';
import type { Env } from '../config/env.validation.js';
import { AgentsListingsController } from './agents-listings.controller.js';
import { Listing } from './entities/listing.entity.js';
import { RequireVerifiedListerGuard } from './guards/require-verified-lister.guard.js';
import { LandlordsListingsController } from './landlords-listings.controller.js';
import { ListingsController } from './listings.controller.js';
import { ListingsService } from './listings.service.js';
import { CloudinaryListingsStorage } from './storage/cloudinary-listings.storage.js';
import { ListingsStorageProvider } from './storage/listings-storage.interface.js';
import { LocalListingsStorage } from './storage/local-listings.storage.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Listing]),
    AgentModule,
    LandlordModule,
  ],
  controllers: [
    ListingsController,
    AgentsListingsController,
    LandlordsListingsController,
  ],
  providers: [
    ListingsService,
    RequireVerifiedListerGuard,
    {
      provide: ListingsStorageProvider,
      inject: [ConfigService],
      useFactory: (
        config: ConfigService<Env, true>,
      ): ListingsStorageProvider => {
        const provider =
          config.get<string>('LISTINGS_STORAGE_PROVIDER', { infer: true }) ??
          'local';
        return provider === 'cloudinary'
          ? new CloudinaryListingsStorage(config)
          : new LocalListingsStorage(config);
      },
    },
  ],
  exports: [ListingsService],
})
export class ListingsModule {}
