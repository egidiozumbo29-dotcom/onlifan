import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminService } from './admin.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  users() {
    return this.adminService.listUsers();
  }

  @Get('creators/pending')
  pendingCreators() {
    return this.adminService.listPendingCreators();
  }

  @Patch('creators/:id/approve')
  approveCreator(@Param('id') id: string) {
    return this.adminService.approveCreator(id);
  }

  @Patch('creators/:id/reject')
  rejectCreator(@Param('id') id: string) {
    return this.adminService.rejectCreator(id);
  }

  @Patch('creators/:id/suspend')
  suspendCreator(@Param('id') id: string) {
    return this.adminService.suspendCreator(id);
  }

  @Patch('users/:id/suspend')
  suspendUser(@Param('id') id: string) {
    return this.adminService.suspendUser(id);
  }

  @Get('posts/flagged')
  flaggedPosts() {
    return this.adminService.listFlaggedPosts();
  }

  @Patch('posts/:id/remove')
  removePost(@Param('id') id: string) {
    return this.adminService.removePost(id);
  }

  @Patch('posts/:id/restore')
  restorePost(@Param('id') id: string) {
    return this.adminService.restorePost(id);
  }

  @Get('reports')
  reports() {
    return this.adminService.listReports();
  }

  @Patch('reports/:id/review')
  reviewReport(@Param('id') id: string) {
    return this.adminService.markReportReviewing(id);
  }

  @Patch('reports/:id/resolve')
  resolveReport(@Param('id') id: string) {
    return this.adminService.resolveReport(id);
  }
}
