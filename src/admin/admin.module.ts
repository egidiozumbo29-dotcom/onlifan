import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminKycController } from './admin-kyc.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminController, AdminDashboardController, AdminKycController],
  providers: [AdminService],
})
export class AdminModule {}
