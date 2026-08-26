# Microservices Dispatch Engine

NestJS monorepo. `web/` is the frontend. `scripts/` is for seeding and checks.

## Apps

| App | Role | Port |
| --- | --- | --- |
| `api-gateway` | HTTP entry for the frontend | 3000 |
| `order` | HTTP + Kafka producer | 3001 |
| `dispatch` | TCP microservice | 3002 |
| `tracking` | TCP microservice | 3003 |
| `driver` | TCP microservice | 3004 |

## Infra (Docker)

One Postgres per domain service. Redis and Kafka are shared. The API gateway has no database.

| Container | Image | Host port | Credentials / notes |
| --- | --- | --- | --- |
| `dispatch-postgres-order` | `postgres:16` (local image) | 5433 | `order` / `order` / `order_db` |
| `dispatch-postgres-dispatch` | `postgres:16` | 5434 | `dispatch` / `dispatch` / `dispatch_db` |
| `dispatch-postgres-tracking` | `postgres:16` | 5435 | `tracking` / `tracking` / `tracking_db` |
| `dispatch-postgres-driver` | `postgres:16` | 5436 | `driver` / `driver` / `driver_db` |
| `dispatch-redis` | `redis:7-alpine` (local image) | 6379 | no password |
| `dispatch-kafka` | `apache/kafka:3.9.1` | 9092 | KRaft, no ZooKeeper |

Host apps use `localhost:9092`. A container on the compose network would use `kafka:19092`.

```bash
npm run docker:up      # start and wait until healthy
npm run docker:ps      # status
npm run docker:logs    # follow logs
npm run docker:down    # stop, keep data
npm run docker:reset   # stop and delete volumes
```

Same commands without npm:

```bash
docker compose up -d --wait
docker compose ps
docker compose logs -f
docker compose down
docker compose down -v
```

Connection strings are in `.env.example`.

## Order service

Order is an HTTP service. Create writes the order and an `outbox` row in one transaction, then an in-process relay publishes Kafka topic `order.created` (with a 10s cron fallback).

```bash
npx prisma migrate dev --schema apps/order/prisma/schema.prisma --name init_orders
npm run start:order
```

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/orders` | body: `merchantId`, `latitude`, `longitude`, optional `clientOrderId` |
| `PATCH` | `/orders/:id/status` | body: `status`, optional `assignedDriverId` |
| `GET` | `/health` | |

Statuses: `PENDING_DISPATCH`, `OFFERED`, `ASSIGNED`, `COMPLETED`, `CANCELLED`. New orders start as `PENDING_DISPATCH`.

The same create/status routes are proxied on the API gateway (`http://localhost:3000`).

## Run Nest apps

```bash
npm install
npm run start:api-gateway
npm run start:order
npm run start:dispatch
npm run start:tracking
npm run start:driver
```

Check the gateway: `http://localhost:3000/health`

Ping a service through the gateway (that service must be running): `http://localhost:3000/health/order`
