# Lab Zero

Lab Zero is an interactive virtual chemistry lab built for hackathon submission. It combines a cinematic 3D lab environment, guided experiment desks, chemistry reaction flows, and AI-powered explanation/voice features to make science feel explorable instead of static.

The final submission branch is `main`.

## What The Project Does

Lab Zero lets a user enter a virtual lab, move through the space, focus into experiment stations, trigger chemistry interactions, and receive guided support while learning what the reaction means and why it matters.

The current submission includes:

- a 3D browser-based chemistry lab built with React and Three.js
- four experiment desks inside a walkable lab space
- reaction data served from an Express backend
- an AI chemistry assistant flow for student questions
- narration and speech endpoints for voice-based interaction
- quiz support and fallback question generation for chemistry concepts

## Why We Built It

Chemistry is often taught as text, memorization, and static diagrams. Lab Zero explores a more immersive approach where the lab itself becomes the interface. The goal is to make chemistry feel spatial, interactive, and easier to understand for students who learn better by exploring.

## Tech Stack

- Frontend: React, Vite, Three.js, GSAP
- Backend: Node.js, Express
- Client utilities: Axios
- Data layer: local JSON desk and reaction definitions
- AI integrations: Gemini, Claude, and ElevenLabs server routes

## Project Structure

```text
lab-zero/
  client/
    src/
      ai/           # AI assistant and speech hooks
      assets/       # logos, posters, guide art, periodic table, scene images
      components/   # overlays, quiz UI, reaction panels, HUD
      data/         # reactions and desk definitions
      lab/          # Three.js lab engine, controls, benches, zones
      api/          # client API setup
  server/
    routes/         # Express API routes
    services/       # server helpers
  scripts/
    dev.js          # runs client and server together
```

## Run Locally

Use the `main` branch for the final submission.

```bash
git checkout main
npm install
npm run dev
```

Local URLs:

- Client: `http://localhost:5173`
- Server: `http://localhost:3001`

Build and run:

```bash
npm run build
npm run start
```

## Environment Variables

The base app and core lab UI run locally without external services, but AI features use server-side API keys.

Optional:

- `PORT` for the Express server, default `3001`

Needed for live AI features:

- `GEMINI_API_KEY`
- `GEMINI_MODEL` optional, default `gemini-2.0-flash`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL` optional
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_TTS_MODEL` optional
- `ELEVENLABS_STT_MODEL` optional
- `ELEVENLABS_VOICE_ID` optional

If these keys are missing, some routes fall back gracefully, while live voice and model-backed answers will be unavailable.

## API Overview

Current server routes include:

- `GET /api/health`
- `GET /api/reactions`
- `GET /api/reactions/phase-1`
- `POST /api/narrate`
- `POST /api/narrate/transcribe`
- `POST /api/iteminfo`
- `POST /api/ai-chat`
- `POST /api/explain`
- `POST /api/quiz`
- `POST /api/portfolio`

## Submission Notes

This repo is set up so judges can clone the project, install dependencies, and run the main lab experience directly from the `main` branch. The production build currently succeeds on `main`.

## Next Steps

- expand the number of playable reactions
- connect more polished assessment and portfolio flows
- deepen voice guidance and AI tutoring
- continue optimizing asset size and frontend chunking
