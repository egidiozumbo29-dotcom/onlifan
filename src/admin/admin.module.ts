import { Module } from '@nestjs/common';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminModerationController } from './admin-moderation.controller';
import { AdminPromotionsController } from './admin-promotions.controller';
import { AdminRefundsController } from './admin-refunds.controller';
import { AdminKycController } from './admin-kyc.controller';
import { AdminExportsController } from './admin-exports.controller';
import { AdminAuditController } from './admin-audit.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    AdminDashboardController,
    AdminModerationController,
    AdminPromotionsController,
    AdminRefundsController,
    AdminKycController,
    AdminExportsController,
    AdminAuditController
  ],
  providers: []
})
export class AdminModule {}
