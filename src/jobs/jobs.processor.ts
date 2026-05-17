import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { JobQueue, VideoProcessingJob, EmailJob } from './interfaces/job.interface';

@Processor(JobQueue.VIDEO_PROCESSING)
export class VideoProcessingProcessor {
  private readonly logger = new Logger(VideoProcessingProcessor.name);

  @Process('transcode')
  async handleTranscode(job: Job<VideoProcessingJob>) {
    this.logger.log(`Processing video for media: ${job.data.mediaId}`);
    try {
      // Qui implementerai la logica di transcodifica video
      // Per ora è un placeholder
      await this.simulateProcessing(job.data);
      this.logger.log(`Video processing completed for media: ${job.data.mediaId}`);
    } catch (error) {
      this.logger.error(
        `Video processing failed for media: ${job.data.mediaId}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private async simulateProcessing(data: VideoProcessingJob): Promise<void> {
    // Simula processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

@Processor(JobQueue.EMAIL)
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  @Process('send')
  async handleSendEmail(job: Job<EmailJob>) {
    this.logger.log(`Sending email to: ${job.data.to}`);
    try {
      // Qui integrerai con il provider email reale
      await this.simulateEmailSending(job.data);
      this.logger.log(`Email sent to: ${job.data.to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to: ${job.data.to}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private async simulateEmailSending(data: EmailJob): Promise<void> {
    // Simula invio email
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
