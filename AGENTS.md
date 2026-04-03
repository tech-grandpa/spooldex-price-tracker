# AGENTS.md — Spooldex Price Tracker

## What This Is

Public filament price comparison site for the 3D printing community. Crawls European filament shops, tracks prices over time, and serves a browsable catalog with SEO-friendly pages. Feeds price data back to the main [Spooldex](https://github.com/tech-grandpa/spooldex) spool management app.

**Live:** https://spooldex-tracker.acgt.dev
**Deploy host:** tg@10.10.10.226

## Stack

- **Framework:** Next.js 16, React 19, TypeScript
- **Database:** PostgreSQL 16 via Prisma ORM
- **Scraping:** Playwright (headless Chromium) + Cheerio for HTML parsing
- **Styling:** Tailwind 4
- **i18n:** next-intl (de/en)
- **Images:** Cloudflare R2 (optional in dev)
- **Testing:** Vitest
- **Validation:** Zod

## Architecture

```
src/
├── app/
│   ├── [locale]/          # Public pages (filaments, brands, materials, shops)
│   ├── api/v1/            # REST API (filaments, offers, shops, price-history, lookup)
│   └── healthz/           # Health check endpoint
├── components/            # React components (filament cards, galleries, offer lists)
├── i18n/                  # Internationalization config
└── lib/
    ├── scrapers/          # Per-shop scraper implementations
    │   ├── index.ts       # Scraper registry + orchestration
    │   ├── types.ts       # ScrapedOfferCandidate, ShopScraper interface
    │   ├── common.ts      # Shared parsing utilities
    │   └── *.ts           # Individual shop scrapers
    ├── data.ts            # Database query layer
    ├── prisma.ts          # Prisma client singleton
    ├── r2.ts              # Cloudflare R2 image caching
    ├── robots.ts          # robots.txt respect + polite crawl delays
    ├── env.ts             # Environment variable access
    └── utils.ts           # Shared helpers
scripts/
├── worker.ts              # Scheduled scrape loop (runs as Docker service)
├── scrape.ts              # One-shot scrape runner
├── seed-from-spooldex.ts  # Seed filament catalog from Spooldex DB exports
├── backfill-images.ts     # Backfill missing filament images
└── fix-wrong-images.ts    # Correct mismatched image URLs
prisma/
└── schema.prisma          # 5 models: Filament, Shop, Offer, OfferItem, PriceSnapshot
```

## Data Model

- **Filament** — canonical filament record (brand, material, color, weight, EAN, Bambu code)
- **Shop** — scrape target (market, regions, scraper type, enabled flag)
- **Offer** — a product listing at a shop, linked to shop
- **OfferItem** — join table linking offers to filaments (handles multi-packs)
- **PriceSnapshot** — price point at a moment in time (drives price history charts)

## Active Scrapers

3DJake, Bambu Store, Prusa Store, 3DPrima, 3Dmensionals, FormFutura, ColorFabb, Polymaker, Proto-Pasta, Extrudr

All scrapers implement the `ShopScraper` interface in `src/lib/scrapers/types.ts`.

## Key Commands

```bash
npm run dev              # Start dev server (port 3000)
npm run build            # Production build
npm run typecheck        # TypeScript check (no emit)
npm run lint             # ESLint
npm run test             # Vitest (run once)
npm run test:watch       # Vitest (watch mode)

npm run db:generate      # Regenerate Prisma client
npm run db:push          # Push schema to DB (dev)
npm run db:migrate       # Create migration (dev)
npm run db:deploy        # Apply migrations (prod)
npm run seed             # Seed filament catalog from Spooldex exports

npm run scrape           # Run all shop scrapers once
npm run worker           # Start scheduled scrape loop
npm run images:backfill  # Backfill missing filament images
```

## Development Setup

```bash
cp .env.example .env
docker compose up -d db
npm install
npm run db:generate
npm run db:push
npm run seed
npm run dev
```

## Docker Deployment

```bash
docker compose up -d --build
```

Three services: `web` (Next.js on :3000), `worker` (scrape scheduler), `db` (PostgreSQL).

The web container mounts `SPOOLDEX_REPO_PATH` read-only to access shared catalog exports.

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL |
| `DEFAULT_MARKET` | Default market filter (e.g. `de`) |
| `SCRAPE_INTERVAL_HOURS` | Hours between scrape cycles |
| `MIN_REQUEST_DELAY_MS` | Polite delay between requests |
| `SCRAPE_LIMIT_PER_SHOP` | Max filaments to scrape per shop per cycle |
| `TRACKER_USER_AGENT` | User-Agent for scrape requests |
| `SPOOLDEX_REPO_PATH` | Path to main Spooldex repo (for catalog exports) |
| `R2_*` | Cloudflare R2 credentials (optional in dev) |

## Conventions

- **Scraper politeness:** Always respect `robots.txt` (see `src/lib/robots.ts`). Use `MIN_REQUEST_DELAY_MS` between requests. Don't hammer shops.
- **Slug format:** URL-safe, lowercase, hyphenated. Generated from brand + series + material + color.
- **Price storage:** Always in cents (integer). Currency stored alongside.
- **Color matching:** Uses multi-hex color arrays for gradient/multicolor filaments.
- **Localized routes:** All public pages under `/[locale]/` (de, en).
- **API versioning:** All API routes under `/api/v1/`.

## Testing

```bash
npm run test             # Run all tests
```

Tests live next to source files (`*.test.ts`). Scraper parsers and utility functions have dedicated test files.

## Common Pitfalls

- **Prisma client out of sync:** Run `npm run db:generate` after any schema change.
- **Playwright not installed:** Run `npx playwright install chromium` if scraper tests fail.
- **Port conflict:** Dev server and Docker web both use 3000. Stop one before starting the other.
- **Seed requires Spooldex exports:** The seed script reads from `SPOOLDEX_REPO_PATH`. Make sure the path exists and contains `exports/`.
- **DB port in Docker:** Exposed on 5433 (not 5432) to avoid conflicts with other local Postgres instances.
