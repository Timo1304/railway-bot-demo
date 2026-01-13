# Discord ⇄ Web Realtime Relay

A full-stack event pipeline that streams Discord messages to a web interface in real-time. Built to demonstrate **Support Engineering as Systems Engineering**—taking a support problem (visibility) and solving it with robust infrastructure.

## 🏗 The Architecture: "The Realtime Relay"

This is not a monolithic script; it is a decoupled microservices architecture designed for resilience.

### The Stack
- **Ingestion (The Ear):** Node.js + Discord.js (Gateway API)
- **Persistence & Broadcast (The Brain):** Supabase (PostgreSQL + Realtime)
- **Presentation (The Face):** Next.js 15 (App Router) + Tailwind CSS
- **Infrastructure:** Deployed on Railway as a Monorepo (Worker Service + Web Service)

### How it Works
1.  **Ingest:** The Bot service sits as a background worker on Railway. It maintains a persistent WebSocket connection to the Discord Gateway (using the `MessageContent` intent).
2.  **Sanitize & Store:** When a message arrives, the bot upserts it into Supabase using a unique `discord_message_id`. This ensures **idempotency**—if the bot restarts and re-fetches messages, we don't get duplicates.
3.  **Broadcast:** Supabase detects the `INSERT` event and broadcasts the payload via WebSockets to the `realtime-messages` channel.
4.  **Render:** The Next.js frontend is subscribed to this channel. It receives the JSON payload and updates the DOM instantly without a page refresh or heavy polling.

## 🤔 Alternatives Considered

### 1. The "Happy Path" (Next.js API Routes)
* **Idea:** Run the bot instance inside a Next.js API route.
* **Why Rejected:** Next.js is serverless/ephemeral. A Discord bot requires a continuous process. Spawning a bot per request leads to "Zombie Processes" and rate-limiting from Discord.

### 2. Direct HTTP Webhooks
* **Idea:** Use Discord Webhooks to push data to an endpoint.
* **Why Rejected:** Webhooks are passive. They generally rely on Slash Commands (`/command`) interactions. The prompt required streaming *all* messages from a channel, which requires an active Gateway connection.

### 3. Direct WebSocket (Bot ➔ Frontend)
* **Idea:** Have the Node.js bot host a `ws` server and have the frontend connect directly.
* **Why Rejected:** Tight coupling. If the bot crashes, the frontend loses state. By decoupling via Supabase, the frontend can still load historical data even if the ingestion worker is down.

## 🐛 Known Limitations & Trade-offs

* **Public Read Access:** Currently, the RLS (Row Level Security) policy allows `public` read access. In a production internal tool, this should be gated behind an auth provider (like Discord OAuth).
* **Edge Case Latency:** While Supabase Realtime is fast, there is a minor hop (Discord ➔ Bot ➔ DB ➔ Frontend). For high-frequency trading, this would be slow; for support logs, it's instant.
* **Bot Restart Gaps:** If the bot service is down for an extended period, messages sent during that downtime are not currently "backfilled" automatically upon restart (though `fetchHistory` grabs the latest state on page load).

## 🚀 How to Run Locally

1.  **Clone:** `git clone <repo_url>`
2.  **Install:** `npm install`
3.  **Keys:** Add `.env.local` with Supabase & Discord credentials.
4.  **Run:**
    * Terminal 1 (Site): `npm run dev`
    * Terminal 2 (Bot): `npx tsx bot/bot.ts`
