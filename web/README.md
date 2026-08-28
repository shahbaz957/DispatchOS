# Dispatch Engine UI

Next.js control panel for order and driver simulation. All requests go through the API gateway.

## Setup

```bash
cd web
copy .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3005`. The UI calls `/api/*`; Next proxies that to the gateway on port **3010**.

## Seed drivers

From the repo root (with Docker Postgres up):

```bash
psql postgresql://driver:driver@localhost:5436/driver_db -f scripts/seed-drivers.sql
```

Then start services and put drivers online from the UI.
