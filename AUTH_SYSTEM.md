# DollyFans - Authentication and User System

## Obiettivo

Questo modulo gestisce autenticazione, utenti, ruoli, sessioni, verifica email e sicurezza login per DollyFans.

## Database models principali

### users

```prisma
model User {
  id              String          @id @default(uuid()) @db.Uuid
  email           String          @unique
  passwordHash    String          @map("password_hash")
  displayName     String          @map("display_name")
  avatarUrl       String?         @map("avatar_url")
  status          UserStatus      @default(PENDING_EMAIL_VERIFICATION)
  emailVerifiedAt DateTime?       @map("email_verified_at")
  roles           UserRole[]
  sessions        Session[]
  refreshTokens   RefreshToken[]
  creatorProfile  CreatorProfile?
  createdAt       DateTime        @default(now()) @map("created_at")
  updatedAt       DateTime        @updatedAt @map("updated_at")
}
```

### roles

```prisma
enum Role {
  USER
  CREATOR
  ADMIN
}

model UserRole {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  role      Role
  createdAt DateTime @default(now()) @map("created_at")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, role])
}
```

### creator_profiles

```prisma
enum CreatorStatus {
  PENDING_REVIEW
  ACTIVE
  REJECTED
  SUSPENDED
}

model CreatorProfile {
  id                     String        @id @default(uuid()) @db.Uuid
  userId                 String        @unique @map("user_id") @db.Uuid
  username               String        @unique
  displayName            String        @map("display_name")
  bio                    String?
  subscriptionPriceCents Int           @map("subscription_price_cents")
  currency               String        @default("eur")
  status                 CreatorStatus @default(PENDING_REVIEW)
  user                   User          @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### sessions

```prisma
model Session {
  id            String         @id @default(uuid()) @db.Uuid
  userId        String         @map("user_id") @db.Uuid
  userAgent     String?        @map("user_agent")
  ipAddress     String?        @map("ip_address")
  lastSeenAt    DateTime       @default(now()) @map("last_seen_at")
  expiresAt     DateTime       @map("expires_at")
  revokedAt     DateTime?      @map("revoked_at")
  createdAt     DateTime       @default(now()) @map("created_at")
  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  refreshTokens RefreshToken[]
}
```

### refresh_tokens

```prisma
model RefreshToken {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  sessionId String    @map("session_id") @db.Uuid
  tokenHash String    @map("token_hash")
  expiresAt DateTime  @map("expires_at")
  revokedAt DateTime? @map("revoked_at")
  createdAt DateTime  @default(now()) @map("created_at")
}
```

### email_verification_tokens

```prisma
model EmailVerificationToken {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  tokenHash String    @map("token_hash")
  expiresAt DateTime  @map("expires_at")
  usedAt    DateTime? @map("used_at")
  createdAt DateTime  @default(now()) @map("created_at")
}
```

## Auth flow diagram

### Registrazione

```text
Client
  |
  | POST /auth/register
  v
AuthController
  |
  v
AuthService
  |
  +-- controlla email unica
  +-- hash password con argon2
  +-- crea User con status PENDING_EMAIL_VERIFICATION
  +-- assegna ruolo USER
  +-- crea EmailVerificationToken hashato
  v
Risposta MVP: token verifica email
Produzione: invio token via email
```

### Verifica email

```text
Client
  |
  | POST /auth/verify-email
  v
AuthService
  |
  +-- cerca token non usato e non scaduto
  +-- verifica token con argon2.verify
  +-- imposta usedAt
  +-- imposta user.status = ACTIVE
  +-- imposta emailVerifiedAt
  v
Account attivo
```

### Login

```text
Client
  |
  | POST /auth/login
  v
AuthController
  |
  +-- raccoglie IP e User-Agent
  v
AuthService
  |
  +-- controlla brute force counter su Redis
  +-- carica utente + ruoli
  +-- verifica password con argon2
  +-- blocca se email non verificata
  +-- crea Session
  +-- genera JWT access token breve
  +-- genera refresh token random
  +-- salva hash refresh token
  v
Client riceve accessToken, refreshToken, sessionId
```

### Refresh token rotation

```text
Client
  |
  | POST /auth/refresh
  | sessionId + refreshToken
  v
AuthService
  |
  +-- carica sessione attiva
  +-- cerca refresh token valido
  +-- verifica hash con argon2.verify
  +-- revoca vecchio refresh token
  +-- genera nuovo access token
  +-- genera nuovo refresh token
  +-- salva hash nuovo refresh token
  v
Client riceve nuovi token
```

### Logout

```text
Client
  |
  | POST /auth/logout
  v
JwtAuthGuard
  |
  v
AuthService
  |
  +-- revoca sessione
  +-- revoca tutti i refresh token della sessione
  v
Sessione chiusa
```

## Middleware / Guard structure NestJS

```text
Global middleware
  - ValidationPipe
  - ThrottlerModule rate limit globale
  - CORS controllato

Auth layer
  - JwtStrategy
  - JwtAuthGuard
  - CurrentUser decorator

RBAC layer
  - Roles decorator
  - RolesGuard

Security layer
  - Redis login attempt counter
  - refresh token rotation
  - session revocation
  - password hashing argon2
  - email verification required before login
```

## Endpoint implementati

```text
POST /auth/register
POST /auth/verify-email
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

## Best practice applicate

- Password mai salvate in chiaro.
- Refresh token salvati solo come hash.
- Access token JWT breve.
- Sessione tracciata con IP, user-agent, lastSeenAt, expiresAt e revokedAt.
- Refresh token rotation a ogni rinnovo.
- Se un refresh token invalido viene usato, la sessione viene revocata.
- Brute force protection con Redis: massimo 5 tentativi falliti per email ogni 15 minuti.
- Email verification obbligatoria prima del login.
- RBAC centralizzato con `RolesGuard`.

## Note produzione

- Il token email nel MVP viene restituito in risposta per test locale.
- In produzione va inviato via email e mai esposto nella risposta API.
- Aggiungere MFA per admin e creator.
- Salvare audit log per login sospetti, cambio password e azioni admin.
