# Spooldex Price Tracker

Filament price tracker service — scrapes shops, tracks prices over time, and serves a REST API that [Spooldex](https://github.com/tech-grandpa/spooldex) consumes.

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Schedulers  │────▶│   Scrapers   │────▶│   Postgres   │
│  (node-cron) │     │ (PA-API etc) │     │   (Drizzle)  │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                                           ┌──────▼───────┐
                                           │  Express API  │
                                           │  /api/v1/...  │
                                           └──────────────┘
```

### Key entities

- **Filament** — canonical filament (brand, series, material, color)
- **Shop** — a retailer (Amazon DE, 3DJake, Bambu Store EU)
- **Offer** — a product listing (may be single spool or multi-pack)
- **OfferItem** — what's inside an offer (links offer → filament)
- **PriceSnapshot** — one row per scrape, enables price history

## Quick Start

```bash
# Clone
git clone https://github.com/tech-grandpa/spooldex-price-tracker.git
cd spooldex-price-tracker

# Install
npm install

# Start Postgres (Docker)
docker compose up -d db

# Configure
cp .env.example .env
# Edit .env with your database URL and Amazon PA-API keys

# Migrate & seed
npm run db:generate
npm run db:migrate
npm run db:seed

# Dev server
npm run dev
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Health check |
| GET | `/api/v1/filaments` | List filaments (query: brand, material) |
| GET | `/api/v1/filaments/:id` | Single filament |
| GET | `/api/v1/filaments/:id/offers` | Offers for a filament |
| GET | `/api/v1/filaments/:id/price-history` | Price snapshots (sparkline data) |
| GET | `/api/v1/offers` | Search offers (query: ean, q) |
| GET | `/api/v1/markets` | Available markets |

## Docker

```bash
docker compose up --build
```

This starts Postgres and the price tracker API on port 3100.

## Tech Stack

- **Runtime:** Node.js 22+ (ESM)
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL 16 + Drizzle ORM
- **API:** Express 5
- **Scrapers:** Amazon PA-API (more planned)
- **Scheduler:** node-cron

## License

MIT
