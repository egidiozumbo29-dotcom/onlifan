import { Controller, Post, Body, Headers, HttpCode, Logger } from '@nestjs/common';
import { RevolutService } from './revolut.service';

@Controller('revolut')
export class RevolutController {
  private readonly logger = new Logger(RevolutController.name);

  constructor(private readonly revolutService: RevolutService) {}

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Body() event: any,
    @Headers('revolut-signature') signature: string,
  ) {
    this.logger.log(`Revolut webhook received, signature: ${signature ? 'present' : 'missing'}`);

    // Verifica la firma del webhook (opzionale per ora)
    const isValid = this.revolutService.verifyWebhookSignature(
      JSON.stringify(event),
      signature,
    );

    if (!isValid) {
      this.logger.warn('Invalid Revolut webhook signature');
      // Per ora non blocco, ma in produzione dovremmo
    }

    // Processa l'evento
    await this.revolutService.handleWebhook(event);

    return { received: true };
  }
}