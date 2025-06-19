FROM node:20-alpine AS base
RUN npm install -g pnpm@10.11.0
RUN apk add --no-cache libc6-compat

WORKDIR /app
COPY package.json pnpm-lock.yaml ./

FROM base AS deps
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV SKIP_ENV_VALIDATION=1
ENV NODE_ENV=production
RUN pnpm build

FROM base AS prod-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN apk add --no-cache libc6-compat curl

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/src/env.js ./src/env.js

RUN npm install -g pnpm@10.11.0
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

USER nextjs
EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["pnpm", "start"]