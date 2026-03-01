# Nexusware - AI Cold Email & CRM Platform

## Project Overview
Nexusware is a scalable, "Instantly-like" cold email outreach platform designed for high-volume sending, automated warmup, and detailed analytics. It combines CRM capabilities with a robust email infrastructure.

## Core Features
### 1. Outreach Engine
-   **Campaigns**: Multi-step email sequences with delays (Days/Hours).
-   **Spintax Support**: `{{Hi|Hello}}` for content variation.
-   **Personalization**: Merge tags `{{firstName}}`, `{{company}}` supported dynamically.
-   **Status Tracking**: NEW -> CONTACTED -> REPLIED (Auto-detected).

### 2. Infrastructure (High Scale)
-   **Queue System**: Powered by **BullMQ** & **Redis** (Upstash) to handle thousands of concurrent jobs.
-   **Worker Process**: Dedicated background worker for email dispatching.
-   **Rate Limiting**: Global and per-mailbox limits to protect domain reputation.
-   **Resilience**: Automatic retries and error logging.

### 3. Smart Warmup System
-   **Peer-to-Peer Network**: Mailboxes automatically exchange emails with other workspace mailboxes.
-   **Ramp-Up Algorithm**: Gradual increase in volume (Start 5/day -> Max 50/day).
-   **Reputation Guard**: Helps new domains achieve high deliverability.

### 4. Analytics & Tracking
-   **Pixel Tracking**: Invisible 1x1 pixel for Open Rate monitoring.
-   **Link Wrapping**: Automatic rewriting of links to track Click Rate.
-   **Dashboard**: Real-time visualization of Sent, Open, Click, and Reply metrics.

### 5. Smart Notifications
-   **Multi-Channel Alerts**: WhatsApp and Telegram integration for real-time outreach alerts.
-   **Trigger Events**: Instant notifications for lead replies and meeting bookings.

## Tech Stack
-   **Frontend**: Next.js 14, Tailwind CSS, Lucide Icons.
-   **Backend**: Node.js, Express.
-   **Database**: PostgreSQL (Neon Tech), Prisma ORM.
-   **Queue**: Redis (Upstash) + BullMQ.
-   **Cloud Notifications**: Telegram Bot API / Axios.
-   **Hosting**: Vercel (Frontend), Render (Backend).

## Deployment Guide
### Environment Variables
Ensure the following are set in your `.env`:
-   `DATABASE_URL`: PostgreSQL connection string.
-   `REDIS_URL`: `rediss://...` (Upstash).
-   `API_URL`: Backend URL (for tracking pixels).
-   `NEXT_PUBLIC_API_URL`: Backend URL (for frontend).
-   `TELEGRAM_BOT_TOKEN`: Token for Telegram notification bot.

### Running Production
1.  **Frontend**: `npm run build && npm start`
2.  **Backend**: `npm run build && npm start`
    -   *Note*: `npm start` launches both the API Server and the Background Worker in the same process group (via `server.ts` import).

## Current Status
-   **Phase 1 (Campaigns)**: ✅ Complete
-   **Phase 2 (Queue Infra)**: ✅ Complete
-   **Phase 3 (Warmup)**: ✅ Complete
-   **Phase 4 (Analytics)**: ✅ Complete
-   **Phase 5 (Notifications & UI Fixes)**: ✅ Complete
-   **Production Deployment**: Ready and pushed to GitHub/Vercel.
