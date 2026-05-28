#!/bin/sh
set -e
echo "DATABASE_URL is set: $([ -n "$DATABASE_URL" ] && echo yes || echo NO)"
echo "Running prisma migrate deploy..."
npx prisma migrate deploy
echo "Starting NestJS..."
exec node dist/main.js
