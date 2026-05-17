import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
}
