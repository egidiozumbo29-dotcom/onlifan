-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";
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
-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'BLOCKED');
-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'MEDIA', 'PPV', 'TIP', 'SYSTEM');
-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ', 'DELETED');
-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_MESSAGE', 'NEW_SUBSCRIBER', 'NEW_TIP', 'NEW_LIKE', 'NEW_COMMENT', 'NEW_POST', 'PPV_PURCHASED', 'SUBSCRIPTION_RENEWED', 'SUBSCRIPTION_CANCELED', 'KYC_APPROVED', 'KYC_REJECTED', 'PAYOUT_PAID', 'MENTION', 'STORY_REPLY', 'LIVE_STARTED', 'PROMO_AVAILABLE');
-- CreateEnum
CREATE TYPE "StoryStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REMOVED');
-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');
-- CreateEnum
CREATE TYPE "KycProvider" AS ENUM ('STRIPE_IDENTITY', 'PERSONA', 'VERIFF', 'SUMSUB', 'MANUAL');
-- CreateEnum
CREATE TYPE "WalletTxType" AS ENUM ('DEPOSIT', 'WITHDRAW', 'TIP_SENT', 'TIP_RECEIVED', 'PPV_PURCHASE', 'PPV_SALE', 'SUB_PURCHASE', 'SUB_RECEIVED', 'POST_PURCHASE', 'POST_SALE', 'REFUND', 'ADJUSTMENT', 'PAYOUT');
-- CreateEnum
CREATE TYPE "WalletTxStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED');
-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');
-- CreateEnum
CREATE TYPE "BundleStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
-- CreateEnum
CREATE TYPE "PromoType" AS ENUM ('PERCENT_OFF', 'FREE_TRIAL', 'FIXED_AMOUNT');
-- CreateEnum
CREATE TYPE "PromoStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');
-- CreateEnum
CREATE TYPE "LiveStreamStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED', 'CANCELED');
-- CreateEnum
CREATE TYPE "ScheduledPostStatus" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED', 'CANCELED');
-- CreateEnum
CREATE TYPE "DmcaStatus" AS ENUM ('RECEIVED', 'REVIEWING', 'REMOVED', 'REJECTED', 'COUNTERED');
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
    "searchVector" tsvector,
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
-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "fan_id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_message_at" TIMESTAMP(3),
    "last_message_preview" TEXT,
    "fan_unread_count" INTEGER NOT NULL DEFAULT 0,
    "creator_unread_count" INTEGER NOT NULL DEFAULT 0,
    "fan_muted" BOOLEAN NOT NULL DEFAULT false,
    "creator_muted" BOOLEAN NOT NULL DEFAULT false,
    "fan_pinned" BOOLEAN NOT NULL DEFAULT false,
    "creator_pinned" BOOLEAN NOT NULL DEFAULT false,
    "fan_archived_at" TIMESTAMP(3),
    "creator_archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "body" TEXT,
    "price_cents" INTEGER,
    "currency" TEXT DEFAULT 'eur',
    "expires_at" TIMESTAMP(3),
    "edited_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "is_vanishing" BOOLEAN NOT NULL DEFAULT false,
    "reply_to_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "message_media" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_media_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "message_purchases" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "buyer_id" UUID NOT NULL,
    "payment_id" UUID,
    "amount_cents" INTEGER NOT NULL,
    "platform_fee_cents" INTEGER NOT NULL,
    "creator_net_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_purchases_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "message_reads" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_reads_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "message_reactions" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "emoji" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "tips" (
    "id" UUID NOT NULL,
    "fan_id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "post_id" UUID,
    "message_id" UUID,
    "live_stream_id" UUID,
    "payment_id" UUID,
    "amount_cents" INTEGER NOT NULL,
    "platform_fee_cents" INTEGER NOT NULL,
    "creator_net_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tips_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "actor_id" UUID,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "data" JSONB,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "follows" (
    "id" UUID NOT NULL,
    "follower_id" UUID NOT NULL,
    "following_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "blocks" (
    "id" UUID NOT NULL,
    "blocker_id" UUID NOT NULL,
    "blocked_id" UUID NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "stories" (
    "id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "media_id" UUID,
    "text" TEXT,
    "status" "StoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "story_views" (
    "id" UUID NOT NULL,
    "story_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "story_views_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "story_replies" (
    "id" UUID NOT NULL,
    "story_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "story_replies_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "bundles" (
    "id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "months_count" INTEGER NOT NULL,
    "discount_percent" INTEGER NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "status" "BundleStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "bundles_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "promos" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "creator_id" UUID,
    "type" "PromoType" NOT NULL,
    "value" INTEGER NOT NULL,
    "max_redemptions" INTEGER,
    "redemption_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "status" "PromoStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "promos_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "promo_redemptions" (
    "id" UUID NOT NULL,
    "promo_id" UUID NOT NULL,
    "fan_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "promo_redemptions_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_adult" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "creator_tags" (
    "creator_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    CONSTRAINT "creator_tags_pkey" PRIMARY KEY ("creator_id","tag_id")
);
-- CreateTable
CREATE TABLE "post_tags" (
    "post_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    CONSTRAINT "post_tags_pkey" PRIMARY KEY ("post_id","tag_id")
);
-- CreateTable
CREATE TABLE "wallets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "balance_cents" INTEGER NOT NULL DEFAULT 0,
    "pending_cents" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "WalletTxType" NOT NULL,
    "status" "WalletTxStatus" NOT NULL DEFAULT 'COMPLETED',
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "balance_after_cents" INTEGER NOT NULL,
    "ref_type" TEXT,
    "ref_id" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "referral_codes" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "commission_percent" INTEGER NOT NULL DEFAULT 5,
    "expires_at" TIMESTAMP(3),
    "status" "ReferralStatus" NOT NULL DEFAULT 'ACTIVE',
    "redemption_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "referral_attributions" (
    "id" UUID NOT NULL,
    "referral_code_id" UUID NOT NULL,
    "referred_user_id" UUID NOT NULL,
    "total_revenue_cents" INTEGER NOT NULL DEFAULT 0,
    "commission_paid_cents" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "referral_attributions_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "kyc_verifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" "KycProvider" NOT NULL DEFAULT 'MANUAL',
    "status" "KycStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "provider_ref" TEXT,
    "dob" DATE,
    "country" TEXT,
    "full_name" TEXT,
    "id_type" TEXT,
    "id_images" JSONB,
    "selfie_key" TEXT,
    "decision_reason" TEXT,
    "is_age_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_id_verified" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "kyc_verifications_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "scheduled_posts" (
    "id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "status" "ScheduledPostStatus" NOT NULL DEFAULT 'PENDING',
    "published_post_id" UUID,
    "last_error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "scheduled_posts_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "fan_notes" (
    "id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "fan_id" UUID NOT NULL,
    "note" TEXT,
    "tags" TEXT[],
    "color_label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fan_notes_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "live_streams" (
    "id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "LiveStreamStatus" NOT NULL DEFAULT 'SCHEDULED',
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "price_cents" INTEGER,
    "currency" TEXT DEFAULT 'eur',
    "scheduled_for" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "viewer_count" INTEGER NOT NULL DEFAULT 0,
    "peak_viewers" INTEGER NOT NULL DEFAULT 0,
    "room_name" TEXT NOT NULL,
    "ingress_id" TEXT,
    "recording_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "live_streams_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "live_stream_viewers" (
    "id" UUID NOT NULL,
    "stream_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),
    "total_tips_cents" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "live_stream_viewers_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "user_devices" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "platform" TEXT NOT NULL,
    "push_token" TEXT,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "analytics_events" (
    "id" UUID NOT NULL,
    "creator_id" UUID,
    "user_id" UUID,
    "event" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "amount_cents" INTEGER,
    "currency" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "dmca_takedowns" (
    "id" UUID NOT NULL,
    "reporter_email" TEXT NOT NULL,
    "reporter_name" TEXT,
    "external_urls" TEXT[],
    "evidence_url" TEXT,
    "description" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "status" "DmcaStatus" NOT NULL DEFAULT 'RECEIVED',
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "dmca_takedowns_pkey" PRIMARY KEY ("id")
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
-- CreateIndex
CREATE INDEX "conversations_creator_id_last_message_at_idx" ON "conversations"("creator_id", "last_message_at");
-- CreateIndex
CREATE INDEX "conversations_fan_id_last_message_at_idx" ON "conversations"("fan_id", "last_message_at");
-- CreateIndex
CREATE UNIQUE INDEX "conversations_fan_id_creator_id_key" ON "conversations"("fan_id", "creator_id");
-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");
-- CreateIndex
CREATE INDEX "messages_sender_id_idx" ON "messages"("sender_id");
-- CreateIndex
CREATE UNIQUE INDEX "message_media_message_id_media_id_key" ON "message_media"("message_id", "media_id");
-- CreateIndex
CREATE UNIQUE INDEX "message_purchases_payment_id_key" ON "message_purchases"("payment_id");
-- CreateIndex
CREATE INDEX "message_purchases_buyer_id_idx" ON "message_purchases"("buyer_id");
-- CreateIndex
CREATE UNIQUE INDEX "message_purchases_message_id_buyer_id_key" ON "message_purchases"("message_id", "buyer_id");
-- CreateIndex
CREATE UNIQUE INDEX "message_reads_message_id_user_id_key" ON "message_reads"("message_id", "user_id");
-- CreateIndex
CREATE UNIQUE INDEX "message_reactions_message_id_user_id_emoji_key" ON "message_reactions"("message_id", "user_id", "emoji");
-- CreateIndex
CREATE UNIQUE INDEX "tips_message_id_key" ON "tips"("message_id");
-- CreateIndex
CREATE UNIQUE INDEX "tips_payment_id_key" ON "tips"("payment_id");
-- CreateIndex
CREATE INDEX "tips_fan_id_idx" ON "tips"("fan_id");
-- CreateIndex
CREATE INDEX "tips_creator_id_created_at_idx" ON "tips"("creator_id", "created_at");
-- CreateIndex
CREATE INDEX "tips_post_id_idx" ON "tips"("post_id");
-- CreateIndex
CREATE INDEX "tips_live_stream_id_idx" ON "tips"("live_stream_id");
-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at");
-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");
-- CreateIndex
CREATE INDEX "follows_following_id_idx" ON "follows"("following_id");
-- CreateIndex
CREATE UNIQUE INDEX "follows_follower_id_following_id_key" ON "follows"("follower_id", "following_id");
-- CreateIndex
CREATE UNIQUE INDEX "blocks_blocker_id_blocked_id_key" ON "blocks"("blocker_id", "blocked_id");
-- CreateIndex
CREATE INDEX "stories_creator_id_expires_at_idx" ON "stories"("creator_id", "expires_at");
-- CreateIndex
CREATE UNIQUE INDEX "story_views_story_id_user_id_key" ON "story_views"("story_id", "user_id");
-- CreateIndex
CREATE INDEX "story_replies_story_id_idx" ON "story_replies"("story_id");
-- CreateIndex
CREATE UNIQUE INDEX "bundles_creator_id_months_count_key" ON "bundles"("creator_id", "months_count");
-- CreateIndex
CREATE UNIQUE INDEX "promos_code_key" ON "promos"("code");
-- CreateIndex
CREATE INDEX "promos_creator_id_idx" ON "promos"("creator_id");
-- CreateIndex
CREATE UNIQUE INDEX "promo_redemptions_promo_id_fan_id_key" ON "promo_redemptions"("promo_id", "fan_id");
-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");
-- CreateIndex
CREATE INDEX "post_tags_tag_id_idx" ON "post_tags"("tag_id");
-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");
-- CreateIndex
CREATE INDEX "wallet_transactions_user_id_created_at_idx" ON "wallet_transactions"("user_id", "created_at");
-- CreateIndex
CREATE INDEX "wallet_transactions_type_idx" ON "wallet_transactions"("type");
-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_code_key" ON "referral_codes"("code");
-- CreateIndex
CREATE INDEX "referral_codes_owner_id_idx" ON "referral_codes"("owner_id");
-- CreateIndex
CREATE UNIQUE INDEX "referral_attributions_referred_user_id_key" ON "referral_attributions"("referred_user_id");
-- CreateIndex
CREATE INDEX "referral_attributions_referral_code_id_idx" ON "referral_attributions"("referral_code_id");
-- CreateIndex
CREATE INDEX "kyc_verifications_user_id_status_idx" ON "kyc_verifications"("user_id", "status");
-- CreateIndex
CREATE INDEX "scheduled_posts_scheduled_for_status_idx" ON "scheduled_posts"("scheduled_for", "status");
-- CreateIndex
CREATE UNIQUE INDEX "fan_notes_creator_id_fan_id_key" ON "fan_notes"("creator_id", "fan_id");
-- CreateIndex
CREATE UNIQUE INDEX "live_streams_room_name_key" ON "live_streams"("room_name");
-- CreateIndex
CREATE INDEX "live_streams_creator_id_status_idx" ON "live_streams"("creator_id", "status");
-- CreateIndex
CREATE UNIQUE INDEX "live_stream_viewers_stream_id_user_id_key" ON "live_stream_viewers"("stream_id", "user_id");
-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");
-- CreateIndex
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id");
-- CreateIndex
CREATE UNIQUE INDEX "user_devices_push_token_key" ON "user_devices"("push_token");
-- CreateIndex
CREATE INDEX "user_devices_user_id_idx" ON "user_devices"("user_id");
-- CreateIndex
CREATE INDEX "analytics_events_creator_id_event_created_at_idx" ON "analytics_events"("creator_id", "event", "created_at");
-- CreateIndex
CREATE INDEX "analytics_events_event_created_at_idx" ON "analytics_events"("event", "created_at");
-- CreateIndex
CREATE INDEX "dmca_takedowns_status_idx" ON "dmca_takedowns"("status");
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
-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_fan_id_fkey" FOREIGN KEY ("fan_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "message_media" ADD CONSTRAINT "message_media_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "message_media" ADD CONSTRAINT "message_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "message_purchases" ADD CONSTRAINT "message_purchases_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "message_purchases" ADD CONSTRAINT "message_purchases_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "message_purchases" ADD CONSTRAINT "message_purchases_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "tips" ADD CONSTRAINT "tips_fan_id_fkey" FOREIGN KEY ("fan_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "tips" ADD CONSTRAINT "tips_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "tips" ADD CONSTRAINT "tips_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "tips" ADD CONSTRAINT "tips_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "tips" ADD CONSTRAINT "tips_live_stream_id_fkey" FOREIGN KEY ("live_stream_id") REFERENCES "live_streams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "tips" ADD CONSTRAINT "tips_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "story_views" ADD CONSTRAINT "story_views_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "story_views" ADD CONSTRAINT "story_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "story_replies" ADD CONSTRAINT "story_replies_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "story_replies" ADD CONSTRAINT "story_replies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "bundles" ADD CONSTRAINT "bundles_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "promos" ADD CONSTRAINT "promos_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "promo_redemptions" ADD CONSTRAINT "promo_redemptions_promo_id_fkey" FOREIGN KEY ("promo_id") REFERENCES "promos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "promo_redemptions" ADD CONSTRAINT "promo_redemptions_fan_id_fkey" FOREIGN KEY ("fan_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "creator_tags" ADD CONSTRAINT "creator_tags_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "creator_tags" ADD CONSTRAINT "creator_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "referral_attributions" ADD CONSTRAINT "referral_attributions_referral_code_id_fkey" FOREIGN KEY ("referral_code_id") REFERENCES "referral_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "referral_attributions" ADD CONSTRAINT "referral_attributions_referred_user_id_fkey" FOREIGN KEY ("referred_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "scheduled_posts" ADD CONSTRAINT "scheduled_posts_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "fan_notes" ADD CONSTRAINT "fan_notes_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "fan_notes" ADD CONSTRAINT "fan_notes_fan_id_fkey" FOREIGN KEY ("fan_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "live_streams" ADD CONSTRAINT "live_streams_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "live_stream_viewers" ADD CONSTRAINT "live_stream_viewers_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "live_streams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "live_stream_viewers" ADD CONSTRAINT "live_stream_viewers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
