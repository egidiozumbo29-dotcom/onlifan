export interface VideoProcessingJob {
  mediaId: string;
  creatorId: string;
  originalKey: string;
  mimeType: string;
}

export interface EmailJob {
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
}

export interface PaymentReconciliationJob {
  paymentId: string;
}

export interface SubscriptionReminderJob {
  subscriptionId: string;
  userId: string;
}

export enum JobQueue {
  VIDEO_PROCESSING = 'video-processing',
  EMAIL = 'email',
  PAYMENT_RECONCILIATION = 'payment-reconciliation',
  SUBSCRIPTION_REMINDER = 'subscription-reminder',
}
