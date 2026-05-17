import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import {
  JobQueue,
  VideoProcessingJob,
  EmailJob,
  PaymentReconciliationJob,
  SubscriptionReminderJob,
} from './interfaces/job.interface';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectQueue(JobQueue.VIDEO_PROCESSING)
    private videoProcessingQueue: Queue<VideoProcessingJob>,
    @InjectQueue(JobQueue.EMAIL)
    private emailQueue: Queue<EmailJob>,
    @InjectQueue(JobQueue.PAYMENT_RECONCILIATION)
    private paymentReconciliationQueue: Queue<PaymentReconciliationJob>,
    @InjectQueue(JobQueue.SUBSCRIPTION_REMINDER)
    private subscriptionReminderQueue: Queue<SubscriptionReminderJob>,
  ) {}

  async addVideoProcessingJob(data: VideoProcessingJob): Promise<void> {
    this.logger.log(`Adding video processing job for media: ${data.mediaId}`);
    await this.videoProcessingQueue.add('transcode', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      timeout: 300000, // 5 minutes
    });
  }

  async addEmailJob(data: EmailJob): Promise<void> {
    this.logger.log(`Adding email job to: ${data.to}`);
    await this.emailQueue.add('send', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  }

  async addPaymentReconciliationJob(data: PaymentReconciliationJob): Promise<void> {
    this.logger.log(`Adding payment reconciliation job for payment: ${data.paymentId}`);
    await this.paymentReconciliationQueue.add('reconcile', data, {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
  }

  async addSubscriptionReminderJob(data: SubscriptionReminderJob): Promise<void> {
    this.logger.log(`Adding subscription reminder job for subscription: ${data.subscriptionId}`);
    await this.subscriptionReminderQueue.add('send-reminder', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  async getQueueStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {};

    for (const queueName of Object.values(JobQueue)) {
      const queue = this.getQueue(queueName);
      if (queue) {
        stats[queueName] = {
          waiting: await queue.getWaitingCount(),
          active: await queue.getActiveCount(),
          completed: await queue.getCompletedCount(),
          failed: await queue.getFailedCount(),
        };
      }
    }

    return stats;
  }

  private getQueue(queueName: string): Queue | undefined {
    switch (queueName) {
      case JobQueue.VIDEO_PROCESSING:
        return this.videoProcessingQueue;
      case JobQueue.EMAIL:
        return this.emailQueue;
      case JobQueue.PAYMENT_RECONCILIATION:
        return this.paymentReconciliationQueue;
      case JobQueue.SUBSCRIPTION_REMINDER:
        return this.subscriptionReminderQueue;
      default:
        return undefined;
    }
  }
}
