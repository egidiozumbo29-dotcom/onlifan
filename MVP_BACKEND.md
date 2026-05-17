# DollyFans - Full MVP Backend

## Stack

- NestJS backend
- PostgreSQL
- Prisma ORM
- Redis
- Stripe Connect
- Cloudflare R2 / S3-compatible storage
- Docker

## Full folder structure

```text
.
├── ARCHITECTURE.md
├── AUTH_SYSTEM.md
├── CONTENT_SYSTEM.md
├── MEDIA_SYSTEM.md
├── PAYMENT_SYSTEM.md
├── MVP_BACKEND.md
├── README.md
├── Dockerfile
├── docker-compose.yml
├── package.json
├── nest-cli.json
├── tsconfig.json
├── .env
├── .env.example
├── prisma/
│   └── schema.prisma
└── src/
    ├── main.ts
    ├── app.module.ts
    ├── auth/
    │   ├── auth.module.ts
    │   ├── auth.controller.ts
    │   ├── auth.service.ts
    │   ├── jwt-auth.guard.ts
    │   ├── jwt.strategy.ts
    │   └── dto/
    │       ├── register.dto.ts
    │       ├── login.dto.ts
    │       ├── logout.dto.ts
    │       ├── refresh-token.dto.ts
    │       └── verify-email.dto.ts
    ├── users/
    │   ├── users.module.ts
    │   ├── users.controller.ts
    │   └── users.service.ts
    ├── creators/
    │   ├── creators.module.ts
    │   ├── creators.controller.ts
    │   ├── creators.service.ts
    │   └── dto/
    │       └── apply-creator.dto.ts
    ├── subscriptions/
    │   ├── subscriptions.module.ts
    │   ├── subscriptions.controller.ts
    │   └── subscriptions.service.ts
    ├── payments/
    │   ├── payments.module.ts
    │   ├── payments.controller.ts
    │   ├── payments.service.ts
    │   └── dto/
    │       ├── create-refund.dto.ts
    │       └── create-subscription-checkout.dto.ts
    ├── content/
    │   ├── content.module.ts
    │   ├── content.controller.ts
    │   ├── content.service.ts
    │   └── dto/
    │       ├── create-post.dto.ts
    │       ├── create-comment.dto.ts
    │       └── feed-query.dto.ts
    ├── media/
    │   ├── media.module.ts
    │   ├── media.controller.ts
    │   ├── media.service.ts
    │   └── dto/
    │       └── create-upload-url.dto.ts
    ├── admin/
    │   ├── admin.module.ts
    │   ├── admin.controller.ts
    │   └── admin.service.ts
    ├── prisma/
    │   ├── prisma.module.ts
    │   └── prisma.service.ts
    ├── redis/
    │   ├── redis.module.ts
    │   └── redis.service.ts
    └── common/
        ├── decorators/
        │   ├── current-user.decorator.ts
        │   └── roles.decorator.ts
        └── guards/
            └── roles.guard.ts
```

## Core code scaffolding

### Modules

```text
AuthModule
UsersModule
CreatorsModule
SubscriptionsModule
PaymentsModule
ContentModule
MediaModule
AdminModule
PrismaModule
RedisModule
```

### Production-ready modular boundaries

- `auth`: login, register, refresh token, sessions, email verification
- `users`: user profile and account data
- `creators`: creator onboarding and creator profile
- `subscriptions`: fan subscription access checks
- `payments`: Stripe Connect, checkout, refunds, earnings, ledger, payout scheduling
- `content`: posts, feed, comments, likes, paywall logic
- `media`: upload URL, upload confirmation, signed delivery URL, processing pipeline scaffold
- `admin`: moderation, creator approval, user suspension, reports

## Prisma schema

Main file:

```text
prisma/schema.prisma
```

Core tables included:

```text
users
user_roles
sessions
refresh_tokens
email_verification_tokens
creator_profiles
posts
post_media
media
post_purchases
post_likes
post_comments
subscriptions
payments
creator_earnings
ledger_entries
refunds
chargebacks
payouts
reports
moderation_actions
stripe_events
audit_logs
```

## API routes

### Auth

```text
POST /auth/register
POST /auth/verify-email
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

### Users

```text
GET   /users/me
PATCH /users/me
```

### Creators

```text
POST /creators/apply
GET  /creators/me
GET  /creators/:username
```

### Subscriptions

```text
POST /subscriptions/:creatorId/checkout
GET  /subscriptions/creators/:creatorId/status
```

### Payments

```text
POST /payments/connect/onboarding-link
GET  /payments/connect/status
POST /payments/subscriptions/checkout
GET  /payments/creator/earnings
GET  /payments/creator/ledger
POST /payments/refunds
POST /payments/payouts/schedule
GET  /payments/:paymentId
POST /payments/stripe/webhook
```

### Content

```text
POST   /posts
GET    /posts/feed/subscribed
GET    /posts/:id
POST   /posts/:id/like
DELETE /posts/:id/like
POST   /posts/:id/comments
GET    /posts/:id/comments
```

### Media

```text
POST /media/upload-url
POST /media/:id/confirm-upload
GET  /media/:id/signed-url
POST /media/:id/process
```

### Admin / moderation

```text
GET   /admin/users
PATCH /admin/users/:id/suspend
GET   /admin/creators/pending
PATCH /admin/creators/:id/approve
PATCH /admin/creators/:id/reject
PATCH /admin/creators/:id/suspend
GET   /admin/posts/flagged
PATCH /admin/posts/:id/remove
PATCH /admin/posts/:id/restore
GET   /admin/reports
PATCH /admin/reports/:id/review
PATCH /admin/reports/:id/resolve
```

## Docker setup

### Dockerfile

Build multi-stage:

```text
node:22-alpine deps
node:22-alpine build
node:22-alpine runner
```

### docker-compose.yml

Services:

```text
api
postgres
redis
minio
```

Local ports:

```text
API:        4000
PostgreSQL: 5432
Redis:      6379
MinIO API:  9000
MinIO UI:   9001
```

## Local startup

Dopo aver installato Node.js/npm:

```bash
npm install
npx prisma generate
```

Avvio servizi:

```bash
docker compose up -d postgres redis minio
```

Avvio backend:

```bash
npm run start:dev
```

Oppure build container:

```bash
docker compose up --build
```

## Production readiness notes

### Già previsto nello scaffold

- JWT auth
- refresh token rotation
- session tracking
- Redis login brute force protection
- RBAC
- Prisma schema relazionale
- Stripe event idempotency table
- payment ledger
- private media storage architecture
- signed media delivery placeholder
- admin moderation routes
- Docker deployment foundation

### Da completare con credenziali reali

- Stripe SDK calls reali
- Stripe webhook raw body + signature verification
- Cloudflare R2 presigned upload URL reale
- Cloudflare CDN signed URL/cookie reale
- BullMQ workers per video processing
- email provider per verifica email
- production secret manager
- monitoring/logging

## Stato MVP

Questo repository contiene un MVP backend modulare pronto per essere installato, migrato e sviluppato ulteriormente.
