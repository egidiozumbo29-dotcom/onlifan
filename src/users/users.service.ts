import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        status: true,
        roles: { select: { role: true } },
        creatorProfile: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }

    return user;
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    if (dto.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing && existing.id !== userId) {
        throw new ConflictException('Email già in uso');
      }
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: dto.displayName ?? undefined,
        email: dto.email ?? undefined,
        avatarUrl: dto.avatarUrl ?? undefined,
      },
    });
    return this.findMe(userId);
  }
}
