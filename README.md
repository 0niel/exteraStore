# exteraStore

Community plugin catalog for [exteraGram](https://exteragram.app) — discover, publish and install plugins for the most flexible Telegram client.

**Live:** [exterastore.app](https://exterastore.app)

## Features

- Plugin catalog with search, categories, collections and a live activity feed (Pulse)
- Publishing pipeline with versioning, changelogs and visual diffs between releases
- AI layer (OpenRouter / Gemini): security & performance checks, review digests, diff explanations, tag suggestions, grounded plugin Q&A, auto-curated collections
- Telegram-native auth (widget + Web App), bot integration for downloads and notifications
- Full i18n (en/ru), dark/light themes, mobile-first UI with bottom tab navigation
- Developer profiles with tiers, donations and subscriber notifications

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · tRPC v11 · Drizzle ORM + PostgreSQL · Tailwind CSS v4 · shadcn/ui · framer-motion · next-intl · next-auth v5 · Vercel AI SDK + OpenRouter · Biome

## Development

```bash
pnpm install
cp .env.example .env        # fill in secrets
docker compose -f docker-compose.dev.yml up -d   # local postgres
pnpm db:migrate
pnpm dev
```

Quality gates:

```bash
pnpm check       # biome lint + format
pnpm typecheck   # tsc
pnpm build       # production build
```

## Configuration

All environment variables are validated in [src/env.js](src/env.js); see [.env.example](.env.example) for the full list. Notable:

- `TELEGRAM_API_BASE_URL` — Telegram Bot API endpoint, points at an HTTP proxy by default
- `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` — AI features (default `google/gemini-3.6-flash`)

## Deployment

CI (lint, typecheck, build, Docker image scan) runs on every push; merges to `main` build a pinned image, push it to GHCR and deploy it to the production server over SSH with automatic health-check rollback. See [.github/workflows](.github/workflows) and [DEPLOYMENT.md](DEPLOYMENT.md).
