import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { OwnerHubService } from '../owner-hub/owner-hub.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly ownerHub: OwnerHubService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (existingUser) {
      throw new ConflictException('Email già registrata');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        displayName: dto.displayName,
        status: UserStatus.PENDING_EMAIL_VERIFICATION,
        roles: {
          create: { role: Role.USER },
        },
      },
      include: { roles: true },
    });

    const verificationToken = await this.createEmailVerificationToken(user.id);

    this.ownerHub.send({
      externalId: `user_signup_${user.id}`,
      type: 'USER_SIGNUP',
      occurredAt: user.createdAt.toISOString(),
      userId: user.id,
      username: user.email,
    });

    return {
      userId: user.id,
      email: user.email,
      emailVerificationToken: verificationToken,
      message: 'Utente registrato. In produzione inviare il token via email.',
    };
  }

  async login(dto: LoginDto, metadata?: { ipAddress?: string; userAgent?: string }) {
    await this.assertLoginAllowed(dto.email);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { roles: true },
    });

    if (!user) {
      await this.trackFailedLogin(dto.email);
      throw new UnauthorizedException('Credenziali non valide');
    }

    const validPassword = await argon2.verify(user.passwordHash, dto.password);

    if (!validPassword) {
      await this.trackFailedLogin(dto.email);
      throw new UnauthorizedException('Credenziali non valide');
    }

    if (user.status === UserStatus.PENDING_EMAIL_VERIFICATION) {
      throw new ForbiddenException('Email non verificata');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Account non attivo');
    }

    await this.clearFailedLogin(dto.email);

    this.ownerHub.send({
      externalId: `user_login_${user.id}_${Date.now()}`,
      type: 'USER_LOGIN',
      occurredAt: new Date().toISOString(),
      userId: user.id,
      username: user.email,
    });

    return this.createAuthResponse(
      user.id,
      user.email,
      user.roles.map((role) => role.role),
      metadata,
    );
  }

  async refresh(dto: RefreshTokenDto) {
    const session = await this.prisma.session.findUnique({
      where: { id: dto.sessionId },
      include: { user: { include: { roles: true } }, refreshTokens: true },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Sessione non valida');
    }

    const activeTokens = session.refreshTokens.filter(
      (token) => !token.revokedAt && token.expiresAt > new Date(),
    );
    const matchedToken = await this.findMatchingRefreshToken(activeTokens, dto.refreshToken);

    if (!matchedToken) {
      await this.revokeSession(session.id);
      throw new UnauthorizedException('Refresh token non valido');
    }

    await this.prisma.refreshToken.update({
      where: { id: matchedToken.id },
      data: { revokedAt: new Date() },
    });

    await this.prisma.session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });

    return this.createAuthResponse(
      session.user.id,
      session.user.email,
      session.user.roles.map((role) => role.role),
      undefined,
      session.id,
    );
  }

  async logout(userId: string, dto: LogoutDto) {
    const session = await this.prisma.session.findFirst({
      where: { id: dto.sessionId, userId },
    });

    if (!session) {
      throw new UnauthorizedException('Sessione non valida');
    }

    await this.revokeSession(session.id);
    return { success: true };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const tokens = await this.prisma.emailVerificationToken.findMany({
      where: {
        userId: dto.userId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    const matchedToken = await this.findMatchingEmailToken(tokens, dto.token);

    if (!matchedToken) {
      throw new UnauthorizedException('Token verifica email non valido');
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: matchedToken.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: dto.userId },
        data: {
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
        },
      }),
    ]);

    return { success: true };
  }

  private async createAuthResponse(
    userId: string,
    email: string,
    roles: Role[],
    metadata?: { ipAddress?: string; userAgent?: string },
    existingSessionId?: string,
  ) {
    const session = existingSessionId
      ? await this.prisma.session.findUniqueOrThrow({ where: { id: existingSessionId } })
      : await this.prisma.session.create({
          data: {
            userId,
            ipAddress: metadata?.ipAddress,
            userAgent: metadata?.userAgent,
            expiresAt: this.daysFromNow(30),
          },
        });

    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, sessionId: session.id },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET') ?? 'change-me-access-secret',
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m',
      },
    );

    const refreshToken = this.generateSecureToken();
    const refreshTokenHash = await argon2.hash(refreshToken);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        sessionId: session.id,
        tokenHash: refreshTokenHash,
        expiresAt: session.expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      sessionId: session.id,
      user: {
        id: userId,
        email,
        roles,
      },
    };
  }

  private async createEmailVerificationToken(userId: string) {
    const token = this.generateSecureToken();
    const tokenHash = await argon2.hash(token);

    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: this.hoursFromNow(24),
      },
    });

    return token;
  }

  private generateSecureToken() {
    return randomBytes(48).toString('base64url');
  }

  private daysFromNow(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  private hoursFromNow(hours: number) {
    const date = new Date();
    date.setHours(date.getHours() + hours);
    return date;
  }

  private async findMatchingRefreshToken(
    tokens: { id: string; tokenHash: string }[],
    plainToken: string,
  ) {
    for (const token of tokens) {
      if (await argon2.verify(token.tokenHash, plainToken)) {
        return token;
      }
    }

    return null;
  }

  private async findMatchingEmailToken(
    tokens: { id: string; tokenHash: string }[],
    plainToken: string,
  ) {
    for (const token of tokens) {
      if (await argon2.verify(token.tokenHash, plainToken)) {
        return token;
      }
    }

    return null;
  }

  private async revokeSession(sessionId: string) {
    await this.prisma.$transaction([
      this.prisma.session.update({
        where: { id: sessionId },
        data: { revokedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { sessionId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  private async assertLoginAllowed(email: string) {
    const key = this.loginAttemptsKey(email);
    const attempts = Number((await this.redis.client.get(key)) ?? 0);

    if (attempts >= 5) {
      throw new UnauthorizedException('Troppi tentativi di login. Riprova più tardi.');
    }
  }

  private async trackFailedLogin(email: string) {
    const key = this.loginAttemptsKey(email);
    const attempts = await this.redis.client.incr(key);

    if (attempts === 1) {
      await this.redis.client.expire(key, 900);
    }
  }

  private async clearFailedLogin(email: string) {
    await this.redis.client.del(this.loginAttemptsKey(email));
  }

  private loginAttemptsKey(email: string) {
    return `auth:login_attempts:${email.toLowerCase()}`;
  }
}
