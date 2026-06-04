import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface InvoiceData {
  paymentId: string;
  userId: string;
  userEmail: string;
  amount: number;
  currency: string;
  description: string;
  date: Date;
  invoiceNumber: string;
}

@Injectable()
export class InvoicingService {
  private readonly logger = new Logger(InvoicingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generateInvoice(data: InvoiceData): Promise<string> {
    try {
      // Genera numero fattura se non fornito
      const invoiceNumber = data.invoiceNumber || await this.generateInvoiceNumber();

      // Crea record fattura nel database
      const invoice = await this.prisma.invoice.create({
        data: {
          invoiceNumber,
          paymentId: data.paymentId,
          userId: data.userId,
          userEmail: data.userEmail,
          amount: data.amount,
          currency: data.currency,
          description: data.description,
          issuedAt: data.date,
          status: 'PAID',
        },
      });

      this.logger.log(`Invoice generated: ${invoiceNumber} for payment ${data.paymentId}`);

      // Qui genereresti il PDF della fattura
      // Per ora ritorna l'URL della fattura (da implementare con PDFKit o simili)
      return invoiceNumber;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to generate invoice: ${errorMessage}`);
      throw error;
    }
  }

  private async generateInvoiceNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');

    // Conta le fatture di questo mese
    const count = await this.prisma.invoice.count({
      where: {
        issuedAt: {
          gte: new Date(year, today.getMonth(), 1),
          lt: new Date(year, today.getMonth() + 1, 1),
        },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `INV-${year}${month}-${sequence}`;
  }

  async getInvoicePdf(invoiceNumber: string): Promise<Buffer> {
    // Qui genereresti il PDF usando PDFKit o simili
    // Per ora ritorna un placeholder
    this.logger.log(`Generating PDF for invoice: ${invoiceNumber}`);
    return Buffer.from('PDF placeholder');
  }

  async sendInvoiceEmail(invoiceNumber: string, userEmail: string): Promise<void> {
    // Qui invieresti l'email con la fattura allegata
    // Per ora logga solo
    this.logger.log(`Sending invoice ${invoiceNumber} to ${userEmail}`);
  }
}