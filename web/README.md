# Dispatch Engine UI

Next.js control panel for order and driver simulation. It talks only to the API gateway.

```bash
cd web
copy .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3005`. The gateway must be on `http://localhost:3000` (this app uses port 3005 so they do not clash).
