# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a **Shopify embedded app** ("Loom - Offer & Sales") built with Remix v2, Vite 6, Prisma (PostgreSQL), and Shopify Polaris. It manages product sales/discounts, countdown timers, and coupon offers for Shopify merchants.

### Running the dev server

The standard `npm run dev` invokes `shopify app dev` which requires Shopify CLI authentication and a connected Shopify Partner account. For local development without Shopify credentials, run Vite directly:

```bash
export DATABASE_URL="postgresql://devuser:devpass@localhost:5432/loom_dev"
export SHOPIFY_API_KEY="test_api_key"
export SHOPIFY_API_SECRET="test_api_secret"
export SCOPES="write_products"
export SHOPIFY_APP_URL="http://localhost:3000"
npx vite --port 3000
```

The `/app/*` routes return 410 without a valid Shopify session (expected). The root `/` serves the landing page and `/auth/login` serves the auth form.

### Database

PostgreSQL is required. Start the service and create a local DB:

```bash
sudo pg_ctlcluster 16 main start
sudo -u postgres psql -c "CREATE USER devuser WITH PASSWORD 'devpass' CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE loom_dev OWNER devuser;"
export DATABASE_URL="postgresql://devuser:devpass@localhost:5432/loom_dev"
npx prisma generate && npx prisma db push
```

### Lint

```bash
npm run lint
```

Note: the repo has 4 pre-existing ESLint errors (`List` component not imported in coupon routes) and 2 warnings. These are not environment issues.

### Build

```bash
npm run build
```

### Key gotchas

- `SHOPIFY_APP_URL` must be set or the app crashes on startup with "Detected an empty appUrl configuration".
- The `engines` field requires Node >=20.19. The VM has Node v22 via nvm which satisfies this.
- There are no automated test suites in this repo (no test scripts or test frameworks configured).
- The `extensions/` directory contains Shopify Theme App Extensions (Liquid + CSS/JS) that are deployed via `shopify app deploy` — they don't need local setup.
