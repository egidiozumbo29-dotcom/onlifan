# DollyFans - Architettura Backend

## Obiettivo

DollyFans è una piattaforma di abbonamenti per creator con contenuti premium, pagamenti ricorrenti, payout ai creator, media privati e dashboard amministrativa.

## Stack consigliato

- Backend: NestJS con TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Cache/sessioni/code: Redis
- Pagamenti: Stripe Billing + Stripe Connect
- Storage media: Cloudflare R2 compatibile S3
- Background jobs: BullMQ
- Deployment: Docker, Docker Compose in locale, container orchestration in produzione

## Diagramma architetturale

```text
Client Web/Mobile/Admin
        |
        v
API Gateway / NestJS Backend
        |
        +--> Auth Service
        |       - JWT access token
        |       - Refresh token rotation
        |       - Sessioni Redis
        |       - Ruoli USER / CREATOR / ADMIN
        |
        +--> Payment Service
        |       - Stripe Checkout
        |       - Stripe Connect
        |       - Webhook Stripe
        |       - Payout creator
        |
        +--> Content Service
        |       - Post
        |       - Paywall
        |       - Feed creator
        |       - Controllo accesso contenuti
        |
        +--> Media Service
        |       - Presigned upload URL
        |       - Metadata media
        |       - Signed read URL
        |       - Cloudflare R2
        |
        +--> Admin Service
                - Moderazione
                - Approvazione creator
                - Audit log

PostgreSQL <--> Prisma ORM
Redis      <--> Cache, sessioni, rate limit, BullMQ
R2/S3      <--> Foto, video, thumbnail, file processati
Stripe     <--> Subscription, invoice, Connect account, payout
Workers    <--> Video processing, notifiche, riconciliazione pagamenti
```

## Scelta architetturale

La scelta raccomandata è un monolite modulare NestJS.

Questo permette di partire velocemente mantenendo separazioni chiare tra moduli. In futuro, i moduli più critici possono essere estratti in microservizi.

## Moduli principali NestJS

```text
src/
  auth/
  users/
  creators/
  subscriptions/
  payments/
  content/
  media/
  admin/
  moderation/
  jobs/
  prisma/
  redis/
  storage/
  common/
```

## Ruoli

- USER: fan standard
- CREATOR: utente con profilo creator e monetizzazione
- ADMIN: amministratore piattaforma

Un creator è anche un utente. Per scalabilità conviene usare una tabella `user_roles` invece di un singolo campo `role`.

## Autenticazione

- Access token JWT breve, circa 15 minuti
- Refresh token lungo, 7-30 giorni
- Refresh token salvato hashato
- Rotazione refresh token a ogni rinnovo
- Sessioni e rate limiting su Redis
- Cookie HTTP-only per web app
- Bearer token per app mobile

## Subscription logic

Un fan può vedere contenuti premium se:

```text
subscription.status è ACTIVE o TRIALING
AND subscription.current_period_end > now()
AND creator.status = ACTIVE
AND user.status = ACTIVE
```

Stripe webhook deve essere la fonte di verità. L'accesso non va concesso solo dopo il redirect da Stripe, ma dopo conferma webhook.

## Paywall

Tutte le verifiche devono passare da una funzione centralizzata:

```text
canViewPost(userId, postId)
```

Regole:

1. Il creator proprietario può vedere i propri contenuti.
2. Un admin può vedere per moderazione.
3. I post PUBLIC sono visibili.
4. I post SUBSCRIBERS_ONLY richiedono abbonamento attivo.
5. I post PRIVATE, ARCHIVED o REMOVED non sono visibili al fan.

## Media storage

I media devono essere privati.

Flusso upload:

```text
Creator chiede URL upload
Backend valida permessi
Backend crea Media PENDING_UPLOAD
Backend genera presigned URL R2
Client carica direttamente su R2
Client conferma upload
Backend verifica oggetto
Worker processa file
Media diventa READY
```

Formato chiavi consigliato:

```text
originals/{creatorId}/{mediaId}/{filename}
processed/{creatorId}/{mediaId}/master.m3u8
thumbnails/{creatorId}/{mediaId}/thumb.jpg
```

## Pagamenti e payout

- Stripe Customer per fan
- Stripe Connect Express account per creator
- Stripe Checkout per abbonamento mensile
- Application fee per trattenuta piattaforma
- Webhook idempotenti
- Tabella `stripe_events` per evitare doppia elaborazione

Webhook importanti:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.payment_succeeded
invoice.payment_failed
account.updated
```

## API principali

### Auth

```text
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/refresh
GET  /auth/me
```

### Creator

```text
POST  /creators/apply
GET   /creators/me
PATCH /creators/me
GET   /creators/:username
```

### Subscription

```text
POST /subscriptions/:creatorId/checkout
GET  /subscriptions/me
GET  /subscriptions/creators/:creatorId/status
POST /subscriptions/:subscriptionId/cancel
```

### Content

```text
POST   /posts
GET    /posts/:id
PATCH  /posts/:id
DELETE /posts/:id
GET    /creators/:username/posts
GET    /feed/subscribed
```

### Media

```text
POST   /media/upload-url
POST   /media/:id/confirm-upload
GET    /media/:id
DELETE /media/:id
```

### Payments

```text
POST /payments/stripe/webhook
POST /payments/connect/onboarding-link
GET  /payments/connect/status
GET  /payments/creator/earnings
```

### Admin

```text
GET   /admin/users
PATCH /admin/users/:id/status
GET   /admin/creators/pending
PATCH /admin/creators/:id/approve
PATCH /admin/creators/:id/reject
GET   /admin/reports
PATCH /admin/reports/:id/status
GET   /admin/audit-logs
```

## Deployment locale

Servizi locali:

- API NestJS
- Worker NestJS
- PostgreSQL
- Redis
- MinIO come sostituto locale di R2
- Stripe CLI opzionale per webhook

## Deployment produzione

Componenti:

- API container scalato orizzontalmente
- Worker container separato
- PostgreSQL gestito
- Redis gestito
- Cloudflare R2 privato
- CDN Cloudflare
- Stripe
- Secret manager
- Logging e monitoring

## Regole critiche

- Mai rendere pubblici i media premium.
- Usare URL firmati e a breve scadenza.
- Stripe webhook è fonte di verità per accesso e pagamenti.
- Webhook idempotenti.
- Subscription check centralizzato.
- Admin actions sempre tracciate in audit log.
