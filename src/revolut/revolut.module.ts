import { Module } from '@nestjs/common';
import { RevolutController } from './revolut.controller';
import { RevolutService } from './revolut.service';
import { OwnerHubModule } from '../owner-hub/owner-hub.module';

@Module({
  imports: [OwnerHubModule],
  controllers: [RevolutController],
  providers: [RevolutService],
})
export class RevolutModule {}