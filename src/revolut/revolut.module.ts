import { Module } from '@nestjs/common';
import { RevolutService } from './revolut.service';
import { RevolutController } from './revolut.controller';
import { InvoicingModule } from '../invoicing/invoicing.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [InvoicingModule, PrismaModule],
  controllers: [RevolutController],
  providers: [RevolutService],
  exports: [RevolutService],
})
export class RevolutModule {}