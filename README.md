# Microservices Dispatch Engine

NestJS monorepo. `web/` is the frontend. `scripts/` is for seeding and checks.

## Apps

| App | Role | Port |
| --- | --- | --- |
| `api-gateway` | HTTP entry for the frontend | 3000 |
| `order` | HTTP + Kafka producer/consumer | 3001 |
| `dispatch` | HTTP + Kafka matching engine | 3002 |
| `tracking` | HTTP + Kafka timeline | 3003 |
| `driver` | HTTP + Kafka + Redis geo | 3004 |

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

Order is an HTTP service. Create writes the order and an `outbox` row in one transaction, then an in-process relay publishes Kafka topic `order.created` (with a 10s cron fallback). It also consumes `dispatch.events` and updates order status: `ASSIGNMENT_OFFERED` → `OFFERED`, `ASSIGNMENT_CONFIRMED` → `ASSIGNED`, `ASSIGNMENT_COMPLETED` → `COMPLETED`, `ASSIGNMENT_CANCELLED` → `CANCELLED`.

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

## Dispatch service

Dispatch consumes Kafka `order.created` and `driver.events`, writes assignment rows, and emits `dispatch.events`. Nearby drivers come from Redis `GEOSEARCH drivers:geo` (5 km). Offers use `SET lock:driver:{id} {orderId} NX EX 30`.

Pickup lat/lng are stored on each assignment so reject/timeout can match again without calling order-service. Driver cancel after accept marks the assignment `CANCELLED` and does **not** re-dispatch. A merchant retry later should create a **new order** (new `order_id`) so unique constraints stay clean.

```bash
npx prisma migrate dev --schema apps/dispatch/prisma/schema.prisma --name init_assignments
npm run start:dispatch
```

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/assignments` | list assignment attempts |
| `GET` | `/health` | |

Statuses: `OFFERED`, `CONFIRMED`, `REJECTED`, `TIMEOUT`, `CANCELLED`, `COMPLETED`.

The assignments list and health route are proxied on the API gateway.

## Tracking service

Tracking is append-only. It consumes `order.created`, `dispatch.events`, and `driver.events` in consumer group `tracking-consumer` and inserts into `order_timeline`. Unique `(orderId, eventId)` ignores Kafka re-deliveries.

Recorded types: `order.created`, `ASSIGNMENT_OFFERED`, `ASSIGNMENT_TIMEOUT`, `ASSIGNMENT_ACCEPTED`, `ASSIGNMENT_REJECTED`, `ORDER_COMPLETED`, `ORDER_CANCELLED`.

```bash
npx prisma migrate dev --schema apps/tracking/prisma/schema.prisma --name init_order_timeline
npm run start:tracking
```

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/orders/:id/timeline` | events for one order, oldest first |
| `GET` | `/health` | |

The timeline route is proxied on the API gateway (`GET /orders/:id/timeline`).

## Driver service

Driver is the database of record for identity/status/location. Redis holds `driver:{id}:status` and the `drivers:geo` index. Status updates publish Kafka topic `driver.events` (partition key = driver id). The service also consumes `dispatch.events` for `ASSIGNMENT_OFFERED` / `ASSIGNMENT_TIMEOUT`.

```bash
npx prisma migrate dev --schema apps/driver/prisma/schema.prisma --name init_drivers
npm run start:driver
```

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/drivers` | list drivers |
| `PATCH` | `/drivers/:id/status` | body: `status`, optional `action`, `latitude`, `longitude`, `orderId` |
| `GET` | `/health` | |

Statuses: `OFFLINE`, `AVAILABLE`, `OFFERED`, `BUSY`. Actions: `ACCEPT`, `DECLINE`, `COMPLETE`, `CANCEL`. `COMPLETE` requires drop-off lat/lng.

The same driver routes are proxied on the API gateway.

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
