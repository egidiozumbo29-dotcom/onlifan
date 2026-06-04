FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN DATABASE_URL="postgresql://x:x@localhost/x" npx prisma generate
RUN DATABASE_URL="postgresql://x:x@localhost/x" npm run build
RUN ls -la dist/ && echo "=== DIST CONTENTS ===" && ls -la dist/

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package*.json ./
EXPOSE 4000
CMD ["sh", "-c", "echo '=== ENV VARS ===' && echo NODE_ENV=$NODE_ENV && echo PORT=$PORT && echo DATABASE_URL=${DATABASE_URL:+SET} && echo REDIS_URL=${REDIS_URL:+SET} && echo '=== STARTING ===' && node dist/main.js 2>&1"]
