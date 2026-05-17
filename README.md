# DollyFans

Creator subscription platform: NestJS API + Next.js 16 frontend + Prisma + Postgres + Redis + Stripe + S3-compatible storage.

## Local development

### Prerequisiti

- Node 20+, npm
- Docker Desktop running

### Avvio rapido (3 terminali)

```bash
# 1. Servizi infrastruttura
docker compose up -d postgres redis minio

# 2. Backend NestJS
npm install
npx prisma migrate deploy
npx prisma db seed         # crea creator + fan demo
npm run start:dev          # http://localhost:4000

# 3. Frontend Next.js
cd web
npm install
npm run dev                # http://localhost:3000
```

### Account demo (dopo seed)

| Email | Password | Ruolo |
|---|---|---|
| `demo@dollyfans.local` | `Password123!` | Fan |
| `luna@dollyfans.local` | `Password123!` | Creator |
| `max@dollyfans.local` | `Password123!` | Creator |
| `sera@dollyfans.local` | `Password123!` | Creator |
| `dario@dollyfans.local` | `Password123!` | Creator |

### Servizi locali

- API: http://localhost:4000 — discovery su `/`, salute su `/health`
- Frontend: http://localhost:3000
- Postgres: `localhost:55432` (mappato da container) — user/pass `dollyfans`
- Redis: `localhost:6379`
- MinIO API: http://localhost:9000 — Console: http://localhost:9001 (`minio` / `miniosecret`)

> Nota: Postgres usa `55432` per evitare conflitti con istanze Postgres locali Windows.

## Deployment

### 1. Backend → Render.com (Blueprint)

1. Vai su https://dashboard.render.com/blueprints
2. Click **"New Blueprint Instance"**
3. Connetti il repo GitHub `teamvoidbrand-maker/dollyfans`
4. Render leggerà `render.yaml` e propone:
   - Web service `dollyfans-api` (Node, free)
   - Postgres `dollyfans-postgres` (free 90gg)
   - Key Value `dollyfans-redis` (free 25MB)
5. Click **Apply**
6. Dopo il primo deploy, configura le env var **flag `sync: false`** dal dashboard Render:
   - `APP_URL` → URL del frontend Vercel (es. `https://dollyfans.vercel.app`). Multipli separati da virgola.
   - `API_URL` → URL del backend Render stesso (es. `https://dollyfans-api.onrender.com`)
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_CLIENT_ID` → da Stripe Dashboard (`sk_test_...` o `sk_live_...`)
   - `S3_ENDPOINT`, `S3_PUBLIC_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` → Cloudflare R2 / AWS S3
7. Trigger un redeploy manuale dopo aver settato le env var

Health check: `GET /health` → `{ status: "ok", checks: { database: "ok", redis: "ok" } }`

### 2. Frontend → Vercel

1. Vai su https://vercel.com/new
2. Importa il repo `teamvoidbrand-maker/dollyfans`
3. **IMPORTANTE**: in "Root Directory" seleziona `web`
4. Framework: Next.js (auto-detected)
5. Aggiungi env var:
   - `NEXT_PUBLIC_API_URL` = URL backend Render (es. `https://dollyfans-api.onrender.com`)
6. Deploy

### Object Storage in produzione

MinIO è solo per dev. In produzione usa Cloudflare R2 (raccomandato) o AWS S3:

- **Cloudflare R2**: nessun costo egress, $0.015/GB storage
- Settare `S3_ENDPOINT` (privato, con credenziali) e `S3_PUBLIC_ENDPOINT` (pubblico per i presigned URL)

Esempio R2:
```
S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
S3_PUBLIC_ENDPOINT=https://<account>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=dollyfans
S3_ACCESS_KEY_ID=<r2 token>
S3_SECRET_ACCESS_KEY=<r2 secret>
```

## Architettura

Vedi [ARCHITECTURE.md](./ARCHITECTURE.md) per il disegno completo.

| Modulo | Endpoint principali |
|---|---|
| `auth` | `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/me`, `/auth/logout` |
| `users` | `/users/me` (GET, PATCH) |
| `creators` | `/creators` (list), `/creators/:username`, `/creators/:username/posts`, `/creators/me/posts`, `/creators/apply` |
| `subscriptions` | `/subscriptions/:creatorId/checkout`, `/subscriptions/creators/:creatorId/status` |
| `payments` | `/payments/connect/onboarding-link`, `/payments/subscriptions/checkout`, `/payments/stripe/webhook`, `/payments/refunds` |
| `content` | `/posts` (CRUD), `/posts/:id/like`, `/posts/:id/comments`, `/posts/feed/subscribed` |
| `media` | `/media/upload-url`, `/media/:id/confirm-upload`, `/media/:id/signed-url` |

## Schema Prisma

28 modelli. Tabelle principali:

- `User`, `UserRole`, `Session`, `RefreshToken`, `EmailVerificationToken`
- `CreatorProfile`, `Subscription`
- `Post`, `PostMedia`, `PostLike`, `PostComment`, `PostPurchase`
- `Media` (`PENDING_UPLOAD` → `UPLOADED` → `PROCESSING` → `READY`)
- `Payment`, `Payout`, `LedgerEntry`, `CreatorEarning`, `Refund`, `Chargeback`
- `Report`, `AuditLog`, `StripeEvent`

## Test

```bash
# Backend build pulito + lint
npm run build && npm run lint

# Frontend build production
cd web && npm run build
```

## Sicurezza prima della produzione

- [ ] Cambiare `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` (Render `generateValue: true` lo fa)
- [ ] Stripe webhook secret reale + verifica `constructEvent`
- [ ] CORS limitato al dominio Vercel reale (`APP_URL`)
- [ ] Rate limiting già attivo via `@nestjs/throttler` + Redis
- [ ] Object storage: bucket privato, policy "no public list"
- [ ] Logging strutturato (al momento Logger nativo Nest)
- [ ] Backup automatici Postgres (Render free non li include — upgrade necessario)
