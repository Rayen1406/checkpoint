# Hackathon Checkpoint Manager

Simple MVP web app for managing 2-hour hackathon checkpoints with a 15-minute submission window.

## Folder Structure

- `backend` - Express + MongoDB API with checkpoint logic and organizer/team routes.
- `frontend` - React app for team leader and organizer dashboards.

## Features Implemented

- Team flow:
  - Enter team name at `/`
  - Team dashboard at `/team`
  - Live checkpoint status + big countdown
  - Submit progress + blockers during active window
  - Duplicate submission prevention per team/checkpoint
  - Team timeline with Submitted / Missed / Current / Upcoming states
- Organizer flow:
  - Login at `/admin` (hardcoded credentials from env)
  - Dashboard at `/admin/dashboard` with current status and totals
  - Organizer can set global hackathon start time from dashboard
  - Team detail timeline at `/admin/team/:teamId`
- Checkpoint logic:
  - Global base time (configurable by organizer in UI)
  - Interval every 2 hours
  - Submission window of 15 minutes
- Real-time:
  - Organizer dashboard refreshes on socket event when a new submission arrives
  - Polling fallback every 5 seconds

## Backend Setup

1. Open terminal in `backend`
2. Install dependencies:
   - `npm install`
3. Create `.env` from `.env.example`
4. Start API:
   - `npm run dev`

Backend runs on `http://localhost:4000` by default.

## Frontend Setup

1. Open terminal in `frontend`
2. Install dependencies:
   - `npm install`
3. Create `.env` from `.env.example`
4. Start frontend:
   - `npm run dev`

Frontend runs on `http://localhost:5173` by default.

## API Overview

### Team

- `POST /api/team/start`
  - body: `{ "teamName": "Team Alpha" }`
- `GET /api/team/:teamId/dashboard`
- `POST /api/team/:teamId/submit`
  - body: `{ "progress": "Built login flow", "blockers": "API timeout" }`

### Organizer

- `POST /api/admin/login`
  - body: `{ "username": "organizer", "password": "organizer123" }`
- `GET /api/admin/dashboard` (Bearer token required)
- `GET /api/admin/team/:teamId` (Bearer token required)

## Default Admin Credentials

Set in backend `.env`:

- `ADMIN_USERNAME=organizer`
- `ADMIN_PASSWORD=organizer123`

## Notes

- MongoDB must be running locally or provided as `MONGODB_URI`.
- Checkpoint records are materialized automatically around current time.
- Status color convention:
  - Green: on time
  - Red: missed
  - Yellow: pending/current

## Host Publicly From This PC (Windows)

This project can be hosted directly from your computer so anyone on the internet can access it.

### 1. Prepare backend env

In `backend/.env`:

- Set `HOST=0.0.0.0`
- Keep `PORT=4000`
- Set a strong `JWT_SECRET`
- Change `ADMIN_USERNAME` and `ADMIN_PASSWORD` from defaults
- Optional: set `CLIENT_ORIGIN` to your public URL (or leave empty to allow all)

### 2. Build frontend once

From `frontend`:

- `npm install`
- `npm run build`

### 3. Run backend continuously with PM2

From `backend`:

- `npm install`
- `pm2 start src/server.js --name checkpoint-backend`
- `pm2 save`

### 4. Expose to internet (recommended: Cloudflare Tunnel, no router setup)

Install and run tunnel:

- `winget install --id Cloudflare.cloudflared -e`
- `cloudflared tunnel --url http://localhost:4000`

Cloudflare prints a public `https://...trycloudflare.com` URL. Share that URL.

### 5. Optional alternative: direct port forwarding

If you use your own public IP/domain instead of tunnel:

- Allow inbound TCP `4000` in Windows Firewall
- Port-forward router WAN `4000` -> this PC `4000`
- Set `CLIENT_ORIGIN=https://your-domain-or-ip`

### 6. Verify

Open these from another network:

- `https://your-public-url/api/health`
- `https://your-public-url/`

## Telegram URL On PC Startup

You can auto-send the live public URL to Telegram every time this PC starts.

### 1. Create a Telegram bot and get chat id

- Open Telegram and message `@BotFather`
- Run `/newbot` and copy the bot token
- Start a chat with your bot and send one message (for example: `hi`)
- Get your chat id by opening:
  - `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
  - copy `chat.id` from the JSON response

### 2. Set env values in `backend/.env`

- `TELEGRAM_BOT_TOKEN=...`
- `TELEGRAM_CHAT_ID=...`
- `PUBLIC_PORT=4000`
- Optional: `PUBLIC_SUBDOMAIN=...`

### 3. Run both backend + notifier with PM2

From `backend`:

- `pm2 delete checkpoint-backend checkpoint-tunnel-notifier`
- `pm2 start ecosystem.config.cjs`
- `pm2 save`

### 4. Ensure PM2 auto-starts on Windows boot

Run once:

- `pm2-startup install`

After reboot, PM2 starts both apps. The notifier creates a tunnel and sends the URL to your Telegram.

### 5. Check logs

- `pm2 logs checkpoint-tunnel-notifier --lines 100`
