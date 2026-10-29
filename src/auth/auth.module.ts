import { Module } from '@nestjs/common';
import { AdminsModule } from './admin/admins.module.js';
import { AgentsModule } from './agent/agents.module.js';
import { LandlordsModule } from './landlord/landlords.module.js';
import { SeekersModule } from './seeker/seekers.module.js';
import { KycModule } from './kyc/kyc.module.js';

@Module({
  imports: [SeekersModule, LandlordsModule, AgentsModule, AdminsModule, KycModule],
  exports: [SeekersModule, LandlordsModule, AgentsModule, AdminsModule, KycModule],
})
export class AuthModule {}
