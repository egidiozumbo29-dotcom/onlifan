# DollyFans - Secure Media Storage and Delivery System

## Obiettivo

Sistema sicuro per upload, processing e delivery di immagini/video per una piattaforma creator con contenuti gratuiti, contenuti per abbonati e paid post.

## Architecture diagram

```text
Creator Web/App
     |
     | 1. POST /media/upload-url
     v
NestJS API - Media Service
     |
     | crea Media PENDING_UPLOAD
     | genera presigned upload URL
     v
Cloudflare R2 private bucket
     |
     | 2. upload diretto client -> R2
     v
Creator conferma upload
     |
     | 3. POST /media/:id/confirm-upload
     v
Media status = UPLOADED
     |
     | 4. enqueue processing
     v
Worker / BullMQ / FFmpeg
     |
     +-- validation
     +-- compression
     +-- thumbnail generation
     +-- optional HLS transcoding
     v
Processed assets in R2
     |
     v
Media status = READY

Fan richiede contenuto
     |
     v
GET /posts/:id
     |
     v
Content Service paywall check
     |
     +-- PUBLIC/free -> allow
     +-- SUBSCRIBERS_ONLY -> check subscription
     +-- PAID_POST -> check post purchase
     v
GET /media/:id/signed-url
     |
     v
Media Service access control
     |
     v
CDN signed URL short-lived
     |
     v
Cloudflare CDN -> Cloudflare R2 private object
```

## Storage structure

Storage consigliato: Cloudflare R2 S3-compatible con bucket privato.

### Bucket

```text
dollyfans-media-prod
```

Oppure bucket separati:

```text
dollyfans-originals-prod
dollyfans-processed-prod
dollyfans-thumbnails-prod
```

Per MVP è più semplice un bucket unico con prefix.

### Object key structure

```text
originals/{creatorId}/{mediaId}/source
processed/{creatorId}/{mediaId}/image.webp
processed/{creatorId}/{mediaId}/video.mp4
processed/{creatorId}/{mediaId}/hls/master.m3u8
processed/{creatorId}/{mediaId}/hls/720p.m3u8
processed/{creatorId}/{mediaId}/hls/480p.m3u8
processed/{creatorId}/{mediaId}/hls/segments/{segment}.ts
thumbnails/{creatorId}/{mediaId}/thumb.jpg
```

## Database schema media

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
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### posts

```text
posts
- id UUID PK
- creator_id UUID
- visibility PUBLIC | SUBSCRIBERS_ONLY | PAID_POST | PRIVATE | ARCHIVED | REMOVED
- price_cents INT NULL
- currency TEXT NULL
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

## Visibility rules

### Free content

```text
PostVisibility.PUBLIC
```

Regole:

- visibile anche a fan non abbonati
- media comunque serviti via signed URL
- non usare URL pubblici permanenti

### Subscriber-only content

```text
PostVisibility.SUBSCRIBERS_ONLY
```

Regole:

- owner può vedere
- admin può vedere
- fan può vedere solo se subscription ACTIVE/TRIALING e non scaduta
- access check centralizzato con Redis cache

### Paid post content

```text
PostVisibility.PAID_POST
```

Regole:

- owner può vedere
- admin può vedere
- fan può vedere solo se ha record in `post_purchases`
- acquisto singolo post separato dall’abbonamento mensile

## Access control per user subscription

```text
GET /media/:id/signed-url
        |
        v
Load media + creator + linked posts
        |
        +-- creator owner -> allow
        +-- admin -> allow
        +-- linked PUBLIC post -> allow
        +-- linked SUBSCRIBERS_ONLY post -> check subscription
        +-- linked PAID_POST -> check post_purchases
        |
        v
Generate CDN signed URL
```

Il sistema non deve mai fidarsi del frontend per decidere se mostrare un media.

## API endpoints

### Media upload

```text
POST /media/upload-url
POST /media/:id/confirm-upload
POST /media/:id/process
```

### Media delivery

```text
GET /media/:id/signed-url
```

### Content/paywall

```text
POST /posts
GET  /posts/:id
GET  /creators/:username/posts
GET  /feed/subscribed
```

### Paid post purchase, da integrare con payments

```text
POST /posts/:id/purchase/checkout
GET  /posts/:id/purchase/status
```

## Upload flow

```text
Creator sceglie file
        |
        v
POST /media/upload-url
        |
        v
Backend verifica ruolo creator
        |
        v
Backend valida metadata iniziale:
- mimeType consentito
- sizeBytes sotto limite
- type IMAGE/VIDEO coerente
        |
        v
Backend crea media PENDING_UPLOAD
        |
        v
Backend genera presigned PUT URL R2
        |
        v
Client carica direttamente su R2
        |
        v
POST /media/:id/confirm-upload
        |
        v
Backend verifica oggetto su R2
        |
        v
Media status = UPLOADED
```

## Processing pipeline

```text
UPLOADED
   |
   v
Queue job: media.process
   |
   v
Validation
   - controlla MIME reale
   - controlla estensione
   - controlla dimensione
   - controlla durata video
   - opzionale antivirus/scansione malware
   |
   v
Metadata extraction
   - width
   - height
   - duration
   - checksum
   |
   v
Image pipeline
   - compressione WebP/AVIF
   - thumbnail
   - strip EXIF
   |
   v
Video pipeline
   - thumbnail frame
   - compressione MP4
   - opzionale HLS transcoding
   - 720p/480p adaptive streaming
   |
   v
Scrive processed_object_key e thumbnail_object_key
   |
   v
Media status = READY
```

## CDN delivery with signed URLs

Cloudflare CDN davanti a R2.

```text
Client
  |
  | GET /media/:id/signed-url
  v
API autorizza accesso
  |
  v
API genera signed CDN URL 5-15 minuti
  |
  v
Client scarica da CDN
  |
  v
CDN legge oggetto privato da R2
```

Esempio risposta API:

```json
{
  "mediaId": "uuid",
  "url": "https://cdn.dollyfans.com/processed/creator/media/video.mp4?signature=...",
  "expiresInSeconds": 900,
  "deliveryKey": "processed/creator/media/video.mp4"
}
```

## Security best practices

- Bucket R2 privato.
- Nessun media premium pubblico.
- Signed URL a breve scadenza.
- Validare sempre accesso server-side.
- Non esporre `object_key` originali se non necessario.
- Limitare upload per MIME, dimensione e durata.
- Separare originals da processed.
- Strip EXIF per immagini.
- Watermark opzionale per contenuti premium.
- Rate limit su upload URL e signed URL.
- Audit log su accessi sospetti o download massivi.

## Implementazione attuale nel codice

File aggiornati:

```text
prisma/schema.prisma
src/content/content.service.ts
src/media/media.module.ts
src/media/media.controller.ts
src/media/media.service.ts
```

Funzioni principali:

```text
MediaService.createUploadUrl
MediaService.confirmUpload
MediaService.getSignedDeliveryUrl
MediaService.enqueueProcessing
ContentService.findPostForViewer
```

## Stato integrazione reale R2/CDN

Attualmente i signed URL sono placeholder architetturali.

Da implementare con SDK reale:

- AWS S3 SDK compatibile R2
- `PutObjectCommand` presigned URL
- `HeadObjectCommand` per conferma upload
- `GetObjectCommand` o Cloudflare signed URL/cookie
- BullMQ worker per processing
- FFmpeg per video/image pipeline
