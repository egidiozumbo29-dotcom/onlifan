import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminKycController } from './admin-kyc.controller';
import { AdminModerationController } from './admin-moderation.controller';
import { AdminRefundsController } from './admin-refunds.controller';
import { AdminPromotionsController } from './admin-promotions.controller';
import { AdminExportsController } from './admin-exports.controller';
import { AdminAuditController } from './admin-audit.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    AdminController,
    AdminDashboardController,
    AdminKycController,
    AdminModerationController,
    AdminRefundsController,
    AdminPromotionsController,
    AdminExportsController,
    AdminAuditController,
  ],
  providers: [AdminService],
})
export class AdminModule {}
