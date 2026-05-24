import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { JobQueue, EmailJob } from './interfaces/job.interface';

@Processor(JobQueue.EMAIL)
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  @Process('send')
  async handleSendEmail(job: Job<EmailJob>) {
    this.logger.log(`Sending email to: ${job.data.to}`);
    // TODO: integrate SendGrid / Postmark / Mailgun
    await new Promise((resolve) => setTimeout(resolve, 100));
    this.logger.log(`Email queued for: ${job.data.to}`);
  }
}
