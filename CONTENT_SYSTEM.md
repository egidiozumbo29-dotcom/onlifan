# DollyFans - Content System

## Obiettivo

Sistema contenuti per piattaforma creator subscription. Supporta post testuali, immagini, video, contenuti gratuiti, contenuti per abbonati e paid unlock content.

## Tipi di contenuto

Un post può contenere:

- testo
- immagini
- video
- combinazioni testo + media

I media sono collegati tramite tabella join `post_media`.

## Content visibility

```text
PUBLIC
SUBSCRIBERS_ONLY
PAID_POST
PRIVATE
ARCHIVED
REMOVED
```

### PUBLIC

Contenuto gratuito. Visibile nel profilo creator e potenzialmente in discovery.

### SUBSCRIBERS_ONLY

Contenuto visibile solo a fan con subscription attiva verso il creator.

### PAID_POST

Contenuto sbloccabile con acquisto singolo. Richiede record in `post_purchases`.

### PRIVATE / ARCHIVED / REMOVED

Non visibile ai fan.

## Database schema

### posts

```text
posts
- id UUID PK
- creator_id UUID FK creator_profiles.id
- title TEXT NULL
- body TEXT NULL
- visibility ENUM
- price_cents INT NULL
- currency TEXT DEFAULT 'eur'
- status ENUM DRAFT | PUBLISHED | FLAGGED | REMOVED
- published_at TIMESTAMP NULL
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

Indici:

```text
INDEX(creator_id, status, published_at)
```

### media

```text
media
- id UUID PK
- creator_id UUID FK creator_profiles.id
- type IMAGE | VIDEO
- status PENDING_UPLOAD | UPLOADED | PROCESSING | READY | FAILED | REMOVED
- bucket TEXT
- object_key TEXT
- processed_object_key TEXT NULL
- thumbnail_object_key TEXT NULL
- mime_type TEXT
- size_bytes BIGINT
- duration_seconds INT NULL
- width INT NULL
- height INT NULL
- checksum TEXT NULL
```

### post_media

```text
post_media
- id UUID PK
- post_id UUID FK posts.id
- media_id UUID FK media.id
- sort_order INT
- created_at TIMESTAMP
```

### post_purchases

```text
post_purchases
- id UUID PK
- post_id UUID FK posts.id
- fan_id UUID FK users.id
- stripe_payment_intent_id TEXT UNIQUE NULL
- amount_cents INT
- currency TEXT
- created_at TIMESTAMP
```

### post_likes

```text
post_likes
- id UUID PK
- post_id UUID FK posts.id
- user_id UUID FK users.id
- created_at TIMESTAMP

UNIQUE(post_id, user_id)
INDEX(user_id)
```

### post_comments

```text
post_comments
- id UUID PK
- post_id UUID FK posts.id
- user_id UUID FK users.id
- body TEXT
- created_at TIMESTAMP
- updated_at TIMESTAMP

INDEX(post_id, created_at)
INDEX(user_id)
```

## Feed algorithm logic

Obiettivo: feed personalizzato semplice, non real-time pesante, ottimizzato con query PostgreSQL indicizzate.

### Feed subscribed base

```text
1. Prendi subscription attive del fan.
2. Estrai creator_id seguiti tramite abbonamento.
3. Query posts dove:
   - creator_id IN creatorIds
   - status = PUBLISHED
   - visibility IN PUBLIC, SUBSCRIBERS_ONLY, PAID_POST
   - published_at < cursor se presente
4. Ordina per published_at DESC, id DESC.
5. Prendi limit + 1 record.
6. Se esiste record extra, crea nextCursor.
7. Per PAID_POST non acquistati, restituisci locked preview.
```

### Query concettuale

```sql
SELECT *
FROM posts
WHERE creator_id IN (...)
  AND status = 'PUBLISHED'
  AND visibility IN ('PUBLIC', 'SUBSCRIBERS_ONLY', 'PAID_POST')
  AND published_at < :cursor
ORDER BY published_at DESC, id DESC
LIMIT :limit_plus_one;
```

## Pagination system

Strategia consigliata: cursor-based pagination.

### Perché non offset

Offset pagination diventa lenta con molti post perché PostgreSQL deve saltare righe.

### Cursor

Usare `published_at` come cursore iniziale.

Risposta API:

```json
{
  "items": [],
  "nextCursor": "2026-05-16T00:00:00.000Z"
}
```

Richiesta successiva:

```text
GET /posts/feed/subscribed?cursor=2026-05-16T00:00:00.000Z&limit=20
```

Per massima stabilità in produzione, usare cursore composto:

```text
published_at + id
```

## Paywall logic

### findPostForViewer

```text
Load post + creator + media
        |
        +-- owner creator -> unlocked
        +-- admin -> unlocked
        +-- PUBLIC -> unlocked
        +-- SUBSCRIBERS_ONLY -> check subscription
        +-- PAID_POST -> check post_purchases
        +-- otherwise -> forbidden
```

### Locked response per subscriber-only

```json
{
  "id": "post_id",
  "title": "Titolo",
  "body": "Abbonati per sbloccare il contenuto completo",
  "visibility": "SUBSCRIBERS_ONLY",
  "locked": true
}
```

### Locked response per paid post

```json
{
  "id": "post_id",
  "title": "Titolo",
  "body": "Acquista il post per sbloccare il contenuto completo",
  "visibility": "PAID_POST",
  "locked": true,
  "priceCents": 999,
  "currency": "eur"
}
```

## Like/comment system

### Likes

Regole:

- Solo utenti autenticati.
- L’utente deve poter vedere il post.
- Un like massimo per utente/post.
- `upsert` per idempotenza.

### Comments

Regole:

- Solo utenti autenticati.
- L’utente deve poter vedere il post.
- Commenti paginati cursor-based.
- Per MVP commenti semplici senza thread.

## API endpoints

### Posts

```text
POST /posts
GET  /posts/:id
```

### Feed

```text
GET /posts/feed/subscribed?cursor=&limit=20
```

### Likes

```text
POST   /posts/:id/like
DELETE /posts/:id/like
```

### Comments

```text
POST /posts/:id/comments
GET  /posts/:id/comments?cursor=&limit=20
```

### Paid unlock, da integrare col payment system

```text
POST /posts/:id/purchase/checkout
GET  /posts/:id/purchase/status
```

## Implementazione attuale

File aggiornati:

```text
prisma/schema.prisma
src/content/content.controller.ts
src/content/content.service.ts
src/content/dto/create-post.dto.ts
src/content/dto/feed-query.dto.ts
src/content/dto/create-comment.dto.ts
```

Funzioni implementate:

```text
createPost
findPostForViewer
getSubscribedFeed
likePost
unlikePost
createComment
getComments
```

## Scalabilità futura

### Fase 1 - Query diretta PostgreSQL

Adatta per MVP e traffico iniziale.

```text
subscriptions -> creatorIds -> posts query
```

### Fase 2 - Fanout cache soft

Precomputare feed per utenti attivi in Redis o tabella `feed_items`.

```text
creator publishes post
        |
        v
background job inserisce feed_items per subscriber attivi
```

### Fase 3 - Ranking

Aggiungere segnali:

- recency
- engagement
- creator priority
- paid/free mix
- muted creators
- blocked users

Per ora evitare ranking complesso.
