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
