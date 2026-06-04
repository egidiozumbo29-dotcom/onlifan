import { Module } from '@nestjs/common';
import { InvoicingService } from './invoicing.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [InvoicingService],
  exports: [InvoicingService],
})
export class InvoicingModule {}