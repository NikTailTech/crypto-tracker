# Crypto Tracker

A modern Next.js app to track crypto transactions, calculate cost basis, and monitor portfolio performance with high precision.

Built for personal portfolio management, tax prep workflows, and strategy comparison (FIFO, LIFO, Average Cost).

## Why this project

- Track all your transactions in one place
- Get accurate realized and unrealized PnL
- Compare cost basis methods side by side
- Export tax data as CSV/JSON
- Keep everything local in simple JSON files (no database required)

## Quick start (launch the app)

### Requirements

- Node.js 18+ (recommended 20+)
- npm

### Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and you will be redirected to `/dashboard`.

### Useful commands

```bash
npm run dev     # Start local dev server
npm run build   # Build for production
npm run start   # Start production build
npm run lint    # Lint the project
npm test        # Run test suite (Vitest)
```

## How the application works

### 1) Data storage

All data is stored locally in `data/`:

- `data/transactions.json` - all transactions
- `data/settings.json` - app settings (theme, cost basis method, wallets, exchanges, etc.)
- `data/prices.json` - current prices (supports CHF/USD per symbol)
- `data/exchange-rates.json` - FX rates used for conversion

Writes are atomic to reduce data corruption risk.

### 2) Processing flow

UI page -> API route -> validation (Zod) -> storage/engine -> response -> UI update

Key engine responsibilities:

- Parse transactions chronologically
- Build and consume lots by strategy (FIFO/LIFO/Average Cost)
- Include fees in cost basis math
- Track realized events and open holdings
- Calculate dashboard summary, allocation, and performance data

### 3) Pricing and currency logic

Portfolio valuation price source order:

1. `GET /api/portfolio?prices=BTC:...,ETH:...` query override
2. Saved prices in `data/prices.json`
3. Last known transaction price per asset

Transactions and prices are normalized via exchange rates for consistent portfolio/tax calculations.

## Features

- Local JSON storage (no DB setup needed)
- Decimal-safe financial math (`decimal.js`)
- Transaction types: buy, sell, swap, transfer, staking reward, airdrop, fee-only
- Cost basis engine: FIFO, LIFO, Average Cost
- Realized/unrealized PnL, ROI, fees, strategy comparison
- Dashboard charts (allocation + performance)
- Transaction CRUD + CSV import
- Tax report generation by year
- CSV/JSON report export
- Backup export/import
- Theme: light, dark, system
- Customizable platform accent color

## Pages

- `/dashboard` - overview, allocation, performance, strategy comparison
- `/transactions` - list, filter, sort, add/edit/delete, CSV import
- `/assets/[symbol]` - single asset detail and history
- `/prices` - manage current prices by symbol/currency
- `/reports` - tax report by year + export
- `/settings` - app configuration, exchange rates, backup/restore

## API overview

- `GET /api/prices` - get prices
- `PUT /api/prices` - update prices
- `GET /api/transactions` - list all transactions
- `POST /api/transactions` - create transaction
- `PUT /api/transactions` - update transaction
- `GET /api/transactions/[id]` - get one transaction
- `PATCH /api/transactions/[id]` - partial update (validated)
- `DELETE /api/transactions/[id]` - delete transaction
- `GET /api/settings` - get settings
- `PUT /api/settings` - update settings
- `GET /api/exchange-rates` - get exchange rates
- `PUT /api/exchange-rates` - update exchange rates
- `GET /api/portfolio` - summary, allocation, performance
- `GET /api/backup` - export backup JSON
- `POST /api/import` - import backup JSON
- `POST /api/import/csv` - import CSV transactions
- `GET /api/reports/tax?year=YYYY` - tax report for a year
- `GET /api/reports/export?year=YYYY&format=csv|json` - export report file

## Example transaction

```json
{
  "id": "tx-001",
  "date": "2024-01-15T10:30:00.000Z",
  "type": "buy",
  "asset": "BTC",
  "amount": "0.5",
  "price_per_unit": "42000",
  "total_value": "21000",
  "fee": "21",
  "fee_asset": "CHF",
  "wallet": "Exchange",
  "exchange": "Coinbase",
  "notes": "Initial purchase"
}
```

## Fee in another asset (example: BNB)

If fee is paid in crypto instead of fiat, provide:

- `fee_asset`: e.g. `BNB`
- `fee_price_per_unit`: price of 1 `fee_asset` at transaction time, in transaction currency

This keeps fee accounting and cost basis accurate.

## Project structure (short)

```text
src/
  app/               # Next.js App Router pages + API routes
  components/        # Reusable UI/layout/forms
  lib/
    engine/          # Cost basis + portfolio computation
    storage.ts       # JSON read/write
    schemas.ts       # Zod validation
    fx.ts            # Currency conversion helpers
  types/             # Shared TypeScript types
data/                # Local persisted JSON files
```

## Tech stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4
- Zod
- decimal.js
- Recharts
- Vitest

## Notes

- This project is intended for educational and personal tracking use.
- Tax outputs can help reporting workflows, but they are not tax/legal advice.
