# Dispatch Engine UI

Next.js control panel for order and driver simulation.

![DispatchOS control panel](public/dispatchos.png)

## Setup

From the repo root (recommended):

```bash
npm run start:all
```

Or run the UI alone:

```bash
copy .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3005. Requests go to `/api/*`, proxied to the gateway on port **3010** (see `next.config.ts`).

## API calls (via `/api` proxy)

| Action | Method | Path |
| --- | --- | --- |
| List orders | `GET` | `/api/orders` |
| Create order | `POST` | `/api/orders` |
| List drivers | `GET` | `/api/drivers` |
| Driver action | `PATCH` | `/api/drivers/:id/status` |
| Assignments | `GET` | `/api/assignments` |
| Timeline | `GET` | `/api/orders/:id/timeline` |
| Health | `GET` | `/api/health` |

## Before simulating

1. Seed drivers: `psql postgresql://driver:driver@localhost:5436/driver_db -f ../scripts/seed-drivers.sql`
2. Click **Go online** on drivers in the UI (required for Redis geo).
3. Use **Karachi** for pickup coords (~24.86, 67.00).

See the [root README](../README.md) for full documentation.
