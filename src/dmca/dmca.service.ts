import { Injectable, NotFoundException } from '@nestjs/common';
import { DmcaStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateDmcaDto {
  reporterEmail: string;
  reporterName?: string;
  externalUrls: string[];
  evidenceUrl?: string;
  description: string;
  targetType?: string;
  targetId?: string;
}

@Injectable()
export class DmcaService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateDmcaDto) {
    return this.prisma.dmcaTakedown.create({ data: dto });
  }

  list(status?: DmcaStatus) {
    return this.prisma.dmcaTakedown.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async resolve(id: string, status: DmcaStatus) {
    const t = await this.prisma.dmcaTakedown.findUnique({ where: { id } });
    if (!t) throw new NotFoundException();
    return this.prisma.dmcaTakedown.update({
      where: { id },
      data: { status, resolvedAt: new Date() },
    });
  }
}
