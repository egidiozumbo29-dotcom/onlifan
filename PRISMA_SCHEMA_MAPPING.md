# DollyFans - Mapping schema semplice vs schema production-ready

## Sintesi

Lo schema incollato è valido come modello MVP didattico, ma lo schema attuale del progetto è più sicuro e più adatto a produzione.

Non conviene sostituire `prisma/schema.prisma` con quello semplificato perché perderemmo:

- refresh token e session tracking
- email verification
- ruoli multi-tabella
- media storage sicuro con R2
- ledger pagamenti
- refund e chargeback
- creator earnings e payout
- moderation/reporting
- audit log

## Mapping principale

### User

Schema semplice:

```prisma
model User {
  id       String @id @default(cuid())
  email    String @unique
  password String
  role     Role @default(USER)
}
```

Schema progetto:

```prisma
model User {
  id              String     @id @default(uuid()) @db.Uuid
  email           String     @unique
  passwordHash    String     @map("password_hash")
  displayName     String     @map("display_name")
  status          UserStatus @default(PENDING_EMAIL_VERIFICATION)
  emailVerifiedAt DateTime?  @map("email_verified_at")
  roles           UserRole[]
  sessions        Session[]
  refreshTokens   RefreshToken[]
}
```

Decisione:

- `password` diventa `passwordHash`
- `role` singolo diventa `UserRole[]`
- aggiunti sessioni, refresh token ed email verification

## Role

Lo schema semplice usa:

```prisma
enum Role {
  USER
  CREATOR
  ADMIN
}
```

Anche il progetto usa lo stesso enum, ma con tabella `user_roles`.

Tradeoff:

- campo singolo `role`: più semplice
- tabella `user_roles`: più flessibile, permette utente con più ruoli

Scelta progetto: `user_roles`.

## CreatorProfile

Schema semplice:

```prisma
model CreatorProfile {
  displayName String
  bio         String?
  avatarUrl   String?
  isVerified  Boolean @default(false)
}
```

Schema progetto:

```prisma
model CreatorProfile {
  username                 String        @unique
  displayName              String
  bio                      String?
  bannerUrl                String?
  subscriptionPriceCents   Int
  status                   CreatorStatus @default(PENDING_REVIEW)
  stripeAccountId          String?       @unique
  stripeOnboardingComplete Boolean       @default(false)
  payoutsEnabled           Boolean       @default(false)
  chargesEnabled           Boolean       @default(false)
}
```

Decisione:

- `isVerified` diventa `status`
- aggiunti campi Stripe Connect
- aggiunto prezzo subscription
- aggiunto username pubblico

## Subscription

Schema semplice:

```prisma
model Subscription {
  userId           String
  creatorId        String
  status           SubscriptionStatus
  currentPeriodEnd DateTime
}
```

Schema progetto:

```prisma
model Subscription {
  fanId                String
  creatorId            String
  stripeSubscriptionId String @unique
  stripeCustomerId     String
  status               SubscriptionStatus
  currentPeriodStart   DateTime
  currentPeriodEnd     DateTime
  cancelAtPeriodEnd    Boolean
  canceledAt           DateTime?
}
```

Decisione:

- `userId` rinominato in `fanId` per chiarezza
- aggiunti ID Stripe
- aggiunto lifecycle più completo

## Post

Schema semplice:

```prisma
model Post {
  title      String?
  content    String?
  mediaUrl   String?
  mediaType  MediaType
  visibility Visibility
  price      Int?
}
```

Schema progetto:

```prisma
model Post {
  title       String?
  body        String?
  visibility  PostVisibility
  priceCents  Int?
  currency    String?
  status      PostStatus
  media       PostMedia[]
  purchases   PostPurchase[]
  likes       PostLike[]
  comments    PostComment[]
}
```

Decisione:

- `content` diventa `body`
- `mediaUrl` non viene salvato nel post per sicurezza
- i media sono in tabella separata `media`
- paid unlock usa `PostPurchase`

Motivo importante:

I media premium non devono avere URL pubblici permanenti nel database.

## Media

Lo schema semplice mette:

```prisma
mediaUrl String?
mediaType MediaType
```

Il progetto usa:

```prisma
model Media {
  bucket             String
  objectKey          String
  processedObjectKey String?
  thumbnailObjectKey String?
  type               MediaType
  status             MediaStatus
}
```

Decisione:

- niente URL pubblico permanente
- solo object key privati R2/S3
- delivery via signed URL

## Comments / Likes

Schema semplice:

```prisma
model Comment {}
model Like {}
```

Schema progetto:

```prisma
model PostComment {}
model PostLike {}
```

Decisione:

- nomi più espliciti
- `PostLike` ha `@@unique([postId, userId])`
- commenti indicizzati per paginazione

## Payment

Schema semplice:

```prisma
model Payment {
  amount          Int
  currency        String
  type            PaymentType
  status          PaymentStatus
  stripeSessionId String?
}
```

Schema progetto:

```prisma
model Payment {
  stripePaymentIntentId String?
  stripeInvoiceId       String?
  stripeChargeId        String?
  amountCents           Int
  platformFeeCents      Int
  creatorNetCents       Int
  status                PaymentStatus
}
```

In più:

```prisma
CreatorEarning
LedgerEntry
Refund
Chargeback
Payout
StripeEvent
```

Decisione:

- payment system auditabile
- supporto refund/chargeback
- supporto payout creator
- commissione piattaforma tracciata

## Conclusione

Lo schema semplice è utile per capire le entità base:

```text
User
CreatorProfile
Subscription
Post
Comment
Like
Payment
```

Lo schema reale del progetto mantiene queste entità ma le rende sicure e scalabili:

```text
Auth/session security
Private media storage
Stripe Connect lifecycle
Ledger finanziario
Moderation/admin
GDPR-aware structure
```

## Raccomandazione

Non sostituire lo schema attuale con quello semplice.

Usa lo schema semplice come riferimento concettuale, ma mantieni `prisma/schema.prisma` attuale per l'MVP reale.
