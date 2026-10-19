import { Module } from '@nestjs/common';
import { AgentsModule } from './agent/agents.module.js';
import { LandlordsModule } from './landlord/landlords.module.js';
import { SeekersModule } from './seeker/seekers.module.js';

@Module({
  imports: [SeekersModule, LandlordsModule, AgentsModule],
  exports: [SeekersModule, LandlordsModule, AgentsModule],
})
export class AuthModule {}
