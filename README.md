# Microservices Dispatch Engine

Event-driven dispatch platform built with NestJS. Orders are created via HTTP, matched to nearby drivers through Redis geo + locks, and tracked in an append-only timeline. A Next.js control panel simulates merchants and drivers against the live stack.

![DispatchOS control panel](web/public/dispatchos.png)

## Features

- **Order service** — transactional outbox → Kafka `order.created`
- **Dispatch service** — geo matching, Redis locks, assignment history, retry on decline/timeout/new drivers
- **Driver service** — Postgres + Redis geo/status, publishes driver lifecycle events
- **Tracking service** — append-only `order_timeline` with idempotent Kafka consumption
- **API gateway** — single HTTP entry for the frontend
- **Web UI** — order + driver simulation tables, health chips, per-order timeline

## Architecture

```
┌─────────────┐     HTTP      ┌──────────────┐     HTTP      ┌─────────────────┐
│  web (3005) │ ────────────► │ api-gateway  │ ────────────► │ order / driver  │
│  /api/*     │   proxy       │   (3010)     │   proxy       │ dispatch / track│
└─────────────┘               └──────┬───────┘               └────────┬────────┘
                                     │                                │
                                     │         Kafka (9092)           │
                                     └────────────────────────────────┘
                                              order.created
                                              dispatch.events
                                              driver.events
```

Each domain service has its own Postgres database. Redis (geo + locks) and Kafka are shared.

| Service | Port | Database | Role |
| --- | --- | --- | --- |
| `api-gateway` | 3010 | — | HTTP proxy to backend services |
| `order` | 3001 | `order_db` :5433 | Orders + outbox |
| `dispatch` | 3002 | `dispatch_db` :5434 | Matching + assignments |
| `tracking` | 3003 | `tracking_db` :5435 | Order timeline |
| `driver` | 3004 | `driver_db` :5436 | Drivers + Redis geo |
| `web` | 3005 | — | Simulation UI |

## Tech stack

- **Backend:** NestJS 11, Prisma 6, PostgreSQL 16, Redis 7, Kafka 3.9 (KRaft)
- **Frontend:** Next.js 16, React 19, Tailwind CSS 4
- **Infra:** Docker Compose

## Prerequisites

- Node.js 20+
- Docker Desktop (for Postgres, Redis, Kafka)
- `psql` CLI (optional, for seeding drivers)

## Quick start

### 1. Clone and install

```bash
git clone <your-repo-url>
cd Microservices_Dispatch_Engine
npm install
cd web && npm install && cd ..
```

### 2. Environment

```bash
copy .env.example .env
copy web\.env.example web\.env.local
```

### 3. Start infrastructure

```bash
npm run docker:up
```

### 4. Run database migrations

```bash
npm run prisma:migrate:deploy:all
npm run prisma:generate:all
```

### 5. Seed sample drivers

```bash
psql postgresql://driver:driver@localhost:5436/driver_db -f scripts/seed-drivers.sql
```

### 6. Start everything

```bash
npm run start:all
```

- **UI:** http://localhost:3005
- **Gateway:** http://localhost:3010/health

### 7. Simulate a delivery

1. Open the UI → click **Go online** on at least one driver (writes to Redis geo).
2. Click **Karachi** then **Place order** (pickup near seeded drivers ~24.86, 67.00).
3. Driver receives offer → **Accept** → **Complete**.
4. Click **Timeline** on the order to see tracking events.

## npm scripts

| Script | Description |
| --- | --- |
| `npm run docker:up` | Start Postgres, Redis, Kafka |
| `npm run docker:down` | Stop containers |
| `npm run docker:reset` | Stop and delete volumes |
| `npm run prisma:generate:all` | Generate all Prisma clients |
| `npm run prisma:migrate:deploy:all` | Apply all migrations (production-safe) |
| `npm run start:all` | Gateway + all services + web UI |
| `npm run start:api-gateway` | Gateway only (:3010) |
| `npm run start:order` | Order service (:3001) |
| `npm run start:dispatch` | Dispatch service (:3002) |
| `npm run start:tracking` | Tracking service (:3003) |
| `npm run start:driver` | Driver service (:3004) |
| `npm run start:web` | Next.js UI (:3005) |
| `npm run build:all` | Build all Nest apps |
| `npm test` | Run unit tests |

## Kafka topics

| Topic | Producer | Consumers |
| --- | --- | --- |
| `order.created` | order (outbox relay) | dispatch, tracking |
| `dispatch.events` | dispatch | driver, order, tracking |
| `driver.events` | driver | dispatch, tracking |

### Event matrix

| Event | Topic | Producer | Main effect |
| --- | --- | --- | --- |
| `order.created` | `order.created` | order | dispatch starts matching; tracking logs |
| `ASSIGNMENT_OFFERED` | `dispatch.events` | dispatch | driver → OFFERED; order → OFFERED |
| `ASSIGNMENT_TIMEOUT` | `dispatch.events` | dispatch | driver → AVAILABLE; re-dispatch |
| `ASSIGNMENT_CONFIRMED` | `dispatch.events` | dispatch | order → ASSIGNED |
| `ASSIGNMENT_COMPLETED` | `dispatch.events` | dispatch | order → COMPLETED |
| `ASSIGNMENT_CANCELLED` | `dispatch.events` | dispatch | order → CANCELLED |
| `ASSIGNMENT_ACCEPTED` | `driver.events` | driver | assignment → CONFIRMED |
| `ASSIGNMENT_REJECTED` | `driver.events` | driver | assignment → REJECTED; next driver |
| `ORDER_COMPLETED` | `driver.events` | driver | assignment → COMPLETED |
| `ORDER_CANCELLED` | `driver.events` | driver | assignment → CANCELLED (no re-dispatch) |

## API gateway

Base URL: `http://localhost:3010`  
The web UI proxies via `http://localhost:3005/api/*`.

| Method | Path | Proxies to |
| --- | --- | --- |
| `GET` | `/health` | gateway |
| `GET` | `/health/:service` | `order`, `dispatch`, `tracking`, `driver` |
| `GET` | `/orders` | order |
| `POST` | `/orders` | order |
| `PATCH` | `/orders/:id/status` | order |
| `GET` | `/orders/:id/timeline` | tracking |
| `GET` | `/assignments` | dispatch |
| `GET` | `/drivers` | driver |
| `PATCH` | `/drivers/:id/status` | driver |

### Create order

```http
POST /orders
Content-Type: application/json

{
  "merchantId": "M-1234",
  "latitude": 24.8607,
  "longitude": 67.0011,
  "clientOrderId": "ORD-optional-unique-id"
}
```

### Update driver status

```http
PATCH /drivers/:id/status
Content-Type: application/json

{ "status": "AVAILABLE" }
{ "status": "BUSY", "action": "ACCEPT", "orderId": "<uuid>" }
{ "status": "AVAILABLE", "action": "DECLINE", "orderId": "<uuid>" }
{ "status": "AVAILABLE", "action": "COMPLETE", "orderId": "<uuid>", "latitude": 24.86, "longitude": 67.00 }
{ "status": "AVAILABLE", "action": "CANCEL", "orderId": "<uuid>" }
```

## Dispatch matching policy

1. **5 km first** — `GEOSEARCH drivers:geo` within 5 km, nearest first.
2. **Fallback** — if nobody available in 5 km, offer to the nearest driver globally.
3. **One offer at a time** — `SET lock:driver:{id} {orderId} NX EX 30`.
4. **Decline / timeout** — next nearest untried driver (skips drivers already in `assignments` for that order).
5. **Background retry (every 5s)** — if all tried drivers rejected/timed out and a **new** driver comes online, re-offer automatically.
6. **Driver cancel after accept** — assignment `CANCELLED`, order `CANCELLED`, **no** re-dispatch. Merchant retry = new order with new `order_id`.

## Service details

### Order (`apps/order`)

- Statuses: `PENDING_DISPATCH`, `OFFERED`, `ASSIGNED`, `COMPLETED`, `CANCELLED`
- Outbox pattern for reliable `order.created` publish
- Consumes `dispatch.events` to sync order status

### Dispatch (`apps/dispatch`)

- Assignment statuses: `OFFERED`, `CONFIRMED`, `REJECTED`, `TIMEOUT`, `CANCELLED`, `COMPLETED`
- Crons: expired offers (5s), stale order retry (5s)

### Driver (`apps/driver`)

- Statuses: `OFFLINE`, `AVAILABLE`, `OFFERED`, `BUSY`
- Redis: `driver:{id}:status`, `drivers:geo`, `lock:driver:{id}`
- **Seed only writes Postgres** — drivers enter Redis when they go **online** via API/UI

### Tracking (`apps/tracking`)

- Append-only `order_timeline` with unique `(orderId, eventId)` for Kafka idempotency

## Environment variables

See [`.env.example`](.env.example). Key values:

| Variable | Default | Purpose |
| --- | --- | --- |
| `API_GATEWAY_PORT` | `3010` | Gateway port (avoids common :3000 conflicts) |
| `KAFKA_BROKERS` | `localhost:9092` | Kafka for all services |
| `REDIS_HOST` / `REDIS_PORT` | `localhost` / `6379` | Driver geo + dispatch locks |
| `*_DATABASE_URL` | see `.env.example` | Per-service Postgres |

Web UI: see [`web/.env.example`](web/.env.example) (`NEXT_PUBLIC_API_URL=/api`).

## Project structure

```
├── apps/
│   ├── api-gateway/    # HTTP entry, proxies to services
│   ├── order/          # Orders + outbox
│   ├── dispatch/       # Matching engine + assignments
│   ├── tracking/       # Order timeline
│   └── driver/         # Driver state + Redis geo
├── web/                # Next.js simulation UI
├── scripts/            # seed-drivers.sql
├── docker-compose.yml  # Postgres ×4, Redis, Kafka
└── package.json        # Monorepo scripts
```

## Testing

```bash
npm test
npx jest apps/dispatch/src/dispatch.service.spec.ts
```

## Troubleshooting

| Problem | Fix |
| --- | --- |
| UI shows "Failed to fetch" | Ensure `npm run start:all` is running; gateway on **3010**, not 3000 |
| Port 3000 in use | Gateway uses **3010** by design; another app may own 3000 |
| No drivers in UI | Run `scripts/seed-drivers.sql` |
| Orders stuck `PENDING_DISPATCH` | Put drivers **online**; pickup must be near drivers (~24.86, 67.00) or fallback will still match |
| `assignments` table missing | `npm run prisma:migrate:deploy:all` |
| Docker errors | Start Docker Desktop, then `npm run docker:up` |
| After `docker:reset` | Re-run migrations + seed |

## License

UNLICENSED — private project.
