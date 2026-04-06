FROM node:20-alpine AS base
WORKDIR /app

# ── Stage 1: build ─────────────────────────────────────────────────────────────
FROM base AS build
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/ui/package.json ./packages/ui/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/
RUN npm ci
COPY . .
RUN npm run build --workspace=api

# ── Stage 2: production image ──────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Production deps only
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/ui/package.json ./packages/ui/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/
RUN npm ci --omit=dev

# Copy Prisma CLI (devDep needed for migrate deploy at startup)
COPY --from=build /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=build /app/node_modules/prisma ./node_modules/prisma

# Copy built app + Prisma schema + migrations
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma

WORKDIR /app/apps/api
EXPOSE 3001
CMD ["sh", "-c", "/app/node_modules/.bin/prisma migrate deploy && node dist/main"]
