# Lab Zero

Lab Zero is a simple hackathon-ready repo for a browser-based chemistry lab MVP. The project is intentionally lightweight: React + Vite on the frontend, Three.js for the 3D lab shell, and a tiny Express backend that serves local JSON data and placeholder proxy routes.

## Run It

```bash
npm install
npm run dev
```

- Client: `http://localhost:5173`
- Server: `http://localhost:3001`

## Project Structure

```text
lab-zero/
  client/
    src/
      core/       # 3D lab scene and config
      zones/      # Zone A, B, C, D definitions
      engine/     # reaction + mistake logic
      systems/    # zoom, narration, scale helpers
      ui/         # panels and overlays
      data/       # reactions.json
  server/
    src/
      routes/     # API endpoints
      services/   # data loading and proxy helpers
  scripts/
    dev.js        # starts client + server together
```

## Phase Plan

- Phase 1: basic 3D lab scene, Zone B focus, one working reaction with simple failure logic
- Phase 2: expand to all zones and add more reactions and mistake handling
- Phase 3: add zoom-out, scale shifts, and narration
- Phase 4: add passport and portfolio screens

## Team Split

- Dev 1: `client/src/core` and `client/src/zones`
- Dev 2: `server/src` and API routes
- Dev 3: `client/src/engine`, `client/src/systems`, and client/server integration

## Notes

- No database is used. Reactions live in `client/src/data/reactions.json`.
- Progress is stored locally in the browser with `localStorage`.
- The current MVP loads reaction data from the Express API and falls back to local JSON if the API is unavailable.
