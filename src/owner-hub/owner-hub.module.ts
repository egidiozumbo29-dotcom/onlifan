import { Global, Module } from '@nestjs/common';
import { OwnerHubService } from './owner-hub.service';

@Global()
@Module({
  providers: [OwnerHubService],
  exports: [OwnerHubService],
})
export class OwnerHubModule {}
