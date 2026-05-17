import { Injectable } from '@nestjs/common';
import { CreatorStatus, PostStatus, ReportStatus, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  listUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        status: true,
        roles: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  listPendingCreators() {
    return this.prisma.creatorProfile.findMany({
      where: { status: CreatorStatus.PENDING_REVIEW },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  }

  approveCreator(id: string) {
    return this.prisma.creatorProfile.update({
      where: { id },
      data: { status: CreatorStatus.ACTIVE },
    });
  }

  rejectCreator(id: string) {
    return this.prisma.creatorProfile.update({
      where: { id },
      data: { status: CreatorStatus.REJECTED },
    });
  }

  suspendCreator(id: string) {
    return this.prisma.creatorProfile.update({
      where: { id },
      data: { status: CreatorStatus.SUSPENDED },
    });
  }

  suspendUser(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.SUSPENDED },
    });
  }

  listFlaggedPosts() {
    return this.prisma.post.findMany({
      where: { status: PostStatus.FLAGGED },
      include: { creator: true, media: true },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
  }

  removePost(id: string) {
    return this.prisma.post.update({
      where: { id },
      data: { status: PostStatus.REMOVED },
    });
  }

  restorePost(id: string) {
    return this.prisma.post.update({
      where: { id },
      data: { status: PostStatus.PUBLISHED },
    });
  }

  listReports() {
    return this.prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  markReportReviewing(id: string) {
    return this.prisma.report.update({
      where: { id },
      data: { status: ReportStatus.REVIEWING },
    });
  }

  resolveReport(id: string) {
    return this.prisma.report.update({
      where: { id },
      data: { status: ReportStatus.RESOLVED },
    });
  }
}
