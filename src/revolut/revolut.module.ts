import { Module } from '@nestjs/common';
import { RevolutService } from './revolut.service';
import { RevolutController } from './revolut.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RevolutController],
  providers: [RevolutService],
  exports: [RevolutService],
})
export class RevolutModule {}