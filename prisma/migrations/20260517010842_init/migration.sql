-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'CREATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED', 'PENDING_EMAIL_VERIFICATION');

-- CreateEnum
CREATE TYPE "CreatorStatus" AS ENUM ('PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PostVisibility" AS ENUM ('PUBLIC', 'SUBSCRIBERS_ONLY', 'PAID_POST', 'PRIVATE', 'ARCHIVED', 'REMOVED');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'FLAGGED', 'REMOVED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('PENDING_UPLOAD', 'UPLOADED', 'PROCESSING', 'READY', 'FAILED', 'REMOVED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('INCOMPLETE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELED', 'UNPAID', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'SCHEDULED', 'IN_TRANSIT', 'PAID', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('FAN_PAYMENT', 'PLATFORM_FEE', 'CREATOR_EARNING', 'REFUND', 'CHARGEBACK', 'PAYOUT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "LedgerDirection" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "EarningStatus" AS ENUM ('PENDING', 'AVAILABLE', 'PAID', 'HELD', 'REVERSED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ChargebackStatus" AS ENUM ('NEEDS_RESPONSE', 'UNDER_REVIEW', 'WON', 'LOST', 'WARNING_CLOSED');

-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('USER', 'CREATOR', 'POST', 'MEDIA', 'MESSAGE');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_EMAIL_VERIFICATION',
    "email_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "Role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "bio" TEXT,
    "banner_url" TEXT,
    "subscription_price_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "status" "CreatorStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "stripe_account_id" TEXT,
    "stripe_product_id" TEXT,
    "stripe_price_id" TEXT,
    "stripe_onboarding_complete" BOOLEAN NOT NULL DEFAULT false,
    "payouts_enabled" BOOLEAN NOT NULL DEFAULT false,
    "charges_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "visibility" "PostVisibility" NOT NULL DEFAULT 'SUBSCRIBERS_ONLY',
    "price_cents" INTEGER,
    "currency" TEXT DEFAULT 'eur',
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_likes" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_comments" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_purchases" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "fan_id" UUID NOT NULL,
    "stripe_payment_intent_id" TEXT,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "type" "MediaType" NOT NULL,
    "status" "MediaStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "bucket" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "processed_object_key" TEXT,
    "thumbnail_object_key" TEXT,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "duration_seconds" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "checksum" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_media" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "fan_id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "stripe_subscription_id" TEXT NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "fan_id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "subscription_id" UUID,
    "stripe_payment_intent_id" TEXT,
    "stripe_invoice_id" TEXT,
    "stripe_charge_id" TEXT,
    "amount_cents" INTEGER NOT NULL,
    "platform_fee_cents" INTEGER NOT NULL,
    "creator_net_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "stripe_payout_id" TEXT,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "PayoutStatus" NOT NULL,
    "scheduled_for" TIMESTAMP(3),
    "arrival_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_earnings" (
    "id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "payout_id" UUID,
    "gross_cents" INTEGER NOT NULL,
    "platform_fee_cents" INTEGER NOT NULL,
    "net_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "EarningStatus" NOT NULL DEFAULT 'PENDING',
    "available_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" UUID NOT NULL,
    "creator_id" UUID,
    "payment_id" UUID,
    "payout_id" UUID,
    "type" "LedgerEntryType" NOT NULL,
    "direction" "LedgerDirection" NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "stripe_refund_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "reason" TEXT,
    "status" "RefundStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chargebacks" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "stripe_dispute_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "reason" TEXT,
    "status" "ChargebackStatus" NOT NULL,
    "evidence_due_by" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chargebacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "target_type" "ReportTargetType" NOT NULL,
    "target_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_actions" (
    "id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "target_type" "ReportTargetType" NOT NULL,
    "target_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_events" (
    "id" UUID NOT NULL,
    "stripe_event_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_key" ON "user_roles"("user_id", "role");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_session_id_idx" ON "refresh_tokens"("session_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "email_verification_tokens_user_id_idx" ON "email_verification_tokens"("user_id");

-- CreateIndex
CREATE INDEX "email_verification_tokens_expires_at_idx" ON "email_verification_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "creator_profiles_user_id_key" ON "creator_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "creator_profiles_username_key" ON "creator_profiles"("username");

-- CreateIndex
CREATE UNIQUE INDEX "creator_profiles_stripe_account_id_key" ON "creator_profiles"("stripe_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "creator_profiles_stripe_product_id_key" ON "creator_profiles"("stripe_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "creator_profiles_stripe_price_id_key" ON "creator_profiles"("stripe_price_id");

-- CreateIndex
CREATE INDEX "posts_creator_id_status_published_at_idx" ON "posts"("creator_id", "status", "published_at");

-- CreateIndex
CREATE INDEX "post_likes_user_id_idx" ON "post_likes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_likes_post_id_user_id_key" ON "post_likes"("post_id", "user_id");

-- CreateIndex
CREATE INDEX "post_comments_post_id_created_at_idx" ON "post_comments"("post_id", "created_at");

-- CreateIndex
CREATE INDEX "post_comments_user_id_idx" ON "post_comments"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_purchases_stripe_payment_intent_id_key" ON "post_purchases"("stripe_payment_intent_id");

-- CreateIndex
CREATE INDEX "post_purchases_fan_id_idx" ON "post_purchases"("fan_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_purchases_post_id_fan_id_key" ON "post_purchases"("post_id", "fan_id");

-- CreateIndex
CREATE INDEX "media_creator_id_status_idx" ON "media"("creator_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "media_bucket_object_key_key" ON "media"("bucket", "object_key");

-- CreateIndex
CREATE INDEX "post_media_post_id_sort_order_idx" ON "post_media"("post_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "post_media_post_id_media_id_key" ON "post_media"("post_id", "media_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "subscriptions_fan_id_status_idx" ON "subscriptions"("fan_id", "status");

-- CreateIndex
CREATE INDEX "subscriptions_creator_id_status_idx" ON "subscriptions"("creator_id", "status");

-- CreateIndex
CREATE INDEX "subscriptions_current_period_end_idx" ON "subscriptions"("current_period_end");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_fan_id_creator_id_key" ON "subscriptions"("fan_id", "creator_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripe_payment_intent_id_key" ON "payments"("stripe_payment_intent_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripe_invoice_id_key" ON "payments"("stripe_invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripe_charge_id_key" ON "payments"("stripe_charge_id");

-- CreateIndex
CREATE INDEX "payments_fan_id_idx" ON "payments"("fan_id");

-- CreateIndex
CREATE INDEX "payments_creator_id_idx" ON "payments"("creator_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payouts_stripe_payout_id_key" ON "payouts"("stripe_payout_id");

-- CreateIndex
CREATE INDEX "payouts_creator_id_status_idx" ON "payouts"("creator_id", "status");

-- CreateIndex
CREATE INDEX "creator_earnings_creator_id_status_idx" ON "creator_earnings"("creator_id", "status");

-- CreateIndex
CREATE INDEX "creator_earnings_available_at_idx" ON "creator_earnings"("available_at");

-- CreateIndex
CREATE INDEX "ledger_entries_creator_id_idx" ON "ledger_entries"("creator_id");

-- CreateIndex
CREATE INDEX "ledger_entries_payment_id_idx" ON "ledger_entries"("payment_id");

-- CreateIndex
CREATE INDEX "ledger_entries_payout_id_idx" ON "ledger_entries"("payout_id");

-- CreateIndex
CREATE INDEX "ledger_entries_type_idx" ON "ledger_entries"("type");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_stripe_refund_id_key" ON "refunds"("stripe_refund_id");

-- CreateIndex
CREATE INDEX "refunds_payment_id_idx" ON "refunds"("payment_id");

-- CreateIndex
CREATE INDEX "refunds_status_idx" ON "refunds"("status");

-- CreateIndex
CREATE UNIQUE INDEX "chargebacks_stripe_dispute_id_key" ON "chargebacks"("stripe_dispute_id");

-- CreateIndex
CREATE INDEX "chargebacks_payment_id_idx" ON "chargebacks"("payment_id");

-- CreateIndex
CREATE INDEX "chargebacks_status_idx" ON "chargebacks"("status");

-- CreateIndex
CREATE INDEX "reports_target_type_target_id_idx" ON "reports"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "moderation_actions_admin_id_idx" ON "moderation_actions"("admin_id");

-- CreateIndex
CREATE INDEX "moderation_actions_target_type_target_id_idx" ON "moderation_actions"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_events_stripe_event_id_key" ON "stripe_events"("stripe_event_id");

-- CreateIndex
CREATE INDEX "stripe_events_type_idx" ON "stripe_events"("type");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_purchases" ADD CONSTRAINT "post_purchases_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_fan_id_fkey" FOREIGN KEY ("fan_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_fan_id_fkey" FOREIGN KEY ("fan_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_earnings" ADD CONSTRAINT "creator_earnings_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_earnings" ADD CONSTRAINT "creator_earnings_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_earnings" ADD CONSTRAINT "creator_earnings_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chargebacks" ADD CONSTRAINT "chargebacks_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
