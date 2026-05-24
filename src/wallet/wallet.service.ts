import { BadRequestException, Injectable } from '@nestjs/common';
import { WalletTxStatus, WalletTxType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(userId: string, currency = 'eur') {
    return this.prisma.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId, currency },
    });
  }

  async getBalance(userId: string) {
    const w = await this.getOrCreate(userId);
    return { balanceCents: w.balanceCents, pendingCents: w.pendingCents, currency: w.currency };
  }

  async credit(
    userId: string,
    amountCents: number,
    type: WalletTxType,
    refType?: string,
    refId?: string,
    description?: string,
  ) {
    if (amountCents <= 0) throw new BadRequestException('Importo non valido');
    return this.prisma.$transaction(async (tx) => {
      const w = await tx.wallet.upsert({
        where: { userId },
        update: {},
        create: { userId, currency: 'eur' },
      });
      const updated = await tx.wallet.update({
        where: { id: w.id },
        data: { balanceCents: { increment: amountCents } },
      });
      const txn = await tx.walletTransaction.create({
        data: {
          userId,
          type,
          status: WalletTxStatus.COMPLETED,
          amountCents,
          currency: updated.currency,
          balanceAfterCents: updated.balanceCents,
          refType,
          refId,
          description,
        },
      });
      return { wallet: updated, transaction: txn };
    });
  }

  async debit(
    userId: string,
    amountCents: number,
    type: WalletTxType,
    refType?: string,
    refId?: string,
    description?: string,
  ) {
    if (amountCents <= 0) throw new BadRequestException();
    return this.prisma.$transaction(async (tx) => {
      const w = await tx.wallet.findUnique({ where: { userId } });
      if (!w || w.balanceCents < amountCents)
        throw new BadRequestException('Saldo insufficiente');
      const updated = await tx.wallet.update({
        where: { id: w.id },
        data: { balanceCents: { decrement: amountCents } },
      });
      const txn = await tx.walletTransaction.create({
        data: {
          userId,
          type,
          status: WalletTxStatus.COMPLETED,
          amountCents: -amountCents,
          currency: updated.currency,
          balanceAfterCents: updated.balanceCents,
          refType,
          refId,
          description,
        },
      });
      return { wallet: updated, transaction: txn };
    });
  }

  async listTransactions(userId: string, cursor?: string, limit = 50) {
    const items = await this.prisma.walletTransaction.findMany({
      where: { userId, createdAt: cursor ? { lt: new Date(cursor) } : undefined },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });
    const slice = items.slice(0, limit);
    const nextCursor = items.length > limit ? slice[slice.length - 1]?.createdAt.toISOString() ?? null : null;
    return { items: slice, nextCursor };
  }

  async topUp(userId: string, amountCents: number) {
    // In production: redirect to Stripe/CCBill checkout. Webhook then credits wallet.
    // For now, return a placeholder
    return {
      message: 'Top-up: redirect a Stripe/CCBill, webhook accredita il wallet',
      userId,
      amountCents,
      checkoutUrl: null,
    };
  }
}
