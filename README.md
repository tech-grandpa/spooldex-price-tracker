# Spooldex Price Tracker

Public filament price tracker for Spooldex. Phase 1 focuses on crawlable catalog pages, read-only APIs, and worker-driven scraping for open shops in the DE market.

## Stack

- Next.js 16 + React 19
- Prisma + PostgreSQL
- Playwright scrapers
- Tailwind 4
- Cloudflare R2 image caching (optional in local dev)

## Local Development

1. Copy the environment template:

```bash
cp .env.example .env
```

2. Start PostgreSQL:

```bash
docker compose up -d db
```

3. Install dependencies and generate Prisma client:

```bash
npm install
npm run db:generate
```

4. Push the schema and seed:

```bash
npm run db:push
npm run seed
```

5. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Worker

- Run all enabled shop scrapers once:

```bash
npm run scrape
```

- Run the scheduler worker:

```bash
npm run worker
```

## Deploy

`docker-compose.yml` runs:

- `web` on port `3000`
- `worker` for scheduled scraping
- `db` for PostgreSQL

The intended Phase 1 target is `10.10.10.227`, exposed as `https://spooldex-tracker.acgt.dev`.
