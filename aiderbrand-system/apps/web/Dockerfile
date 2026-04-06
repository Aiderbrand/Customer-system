FROM node:20-alpine AS base
WORKDIR /app

# ── Stage 1: install all dependencies ─────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/ui/package.json ./packages/ui/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/
RUN npm ci

# ── Stage 2: build ─────────────────────────────────────────────────────────────
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_BASE_URL=https://apicustomers.aiderbrand.com/api/v1
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
RUN npx turbo build --filter=web

# ── Stage 3: production image ──────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Standalone output already includes traced node_modules
COPY --from=build /app/apps/web/.next/standalone ./
# Static assets are NOT included in standalone — copy separately
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
# Public folder
COPY --from=build /app/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
