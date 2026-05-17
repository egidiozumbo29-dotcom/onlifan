# DollyFans Backend

Base architetturale per una piattaforma creator subscription basata su NestJS, PostgreSQL, Prisma, Redis, Stripe Connect e storage S3-compatible.

## File inclusi

- `ARCHITECTURE.md`: disegno architetturale completo in italiano
- `prisma/schema.prisma`: schema database iniziale
- `docker-compose.yml`: servizi locali PostgreSQL, Redis e MinIO
- `.env.example`: variabili ambiente di riferimento

## Avvio servizi locali

```bash
docker compose up -d
```

## Servizi locali

- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`

Credenziali MinIO locali:

```text
utente: minio
password: miniosecret
```

## Prossimo passo consigliato

Creare lo scaffold NestJS con moduli separati:

```text
auth
users
creators
subscriptions
payments
content
media
admin
jobs
```

Poi installare Prisma e generare la prima migration partendo da `prisma/schema.prisma`.
