# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development commands

- Install dependencies:
  - `npm install`
- Primary local dev workflow (frontend + Netlify Functions):
  - `npx netlify dev`
  - App is served through Netlify dev (typically `http://localhost:8888`) and functions are routed from `netlify/functions/`.
- Alternative local dev workflows:
  - `npm start` (runs frontend + `src/server.js` concurrently)
  - `npm run start:frontend` (CRA dev server only)
  - `npm run start:backend` (Express server only)
  - `npm run dev` (frontend + `npx netlify dev` concurrently)
- Build:
  - `npm run build`
- Tests:
  - `npm test` (frontend/JSDOM tests via `scripts/test.js`)
  - `npm run test:backend` (Jest tests in `tests/`)
- Run a single test:
  - Frontend: `npm test -- src/path/to/file.test.tsx`
  - Backend: `npm run test:backend -- tests/path/to/file.test.js`

## Architecture overview

This is a Create React App + TypeScript project with two backend patterns in the same repo:
- Netlify serverless functions (`netlify/functions/*`) used by the deployed app and by `npx netlify dev`.
- A standalone Express server (`src/server.js`) for alternate local/backend execution.

### Frontend structure (big picture)

- `src/app/` contains route-level UI and app entry composition.
  - `src/app/main.tsx` defines the router and lazy-loaded pages (`/`, `/mindmeld`, `/wedding`, `/resume`).
  - `src/app/pages/` contains page-level features.
- `src/lib/` contains reusable cross-page logic:
  - `components/` UI building blocks
  - `hooks/` stateful behavior (`use-game-state`, animation/timer hooks, OpenAI wrapper)
  - `utils/` API calls and game logic helpers
  - `types/` shared TypeScript models

Path aliasing is enabled via `tsconfig.json`:
- `@/*` maps to `src/*`

### MindMeld data flow

MindMeld is the most stateful feature:
- `src/app/pages/mind-meld.tsx` orchestrates gameplay phases (`idle`, `awaitingUserGuess`, `waitingForAI`, `roundWon`, etc.).
- `useGameState` centralizes round/game state and refs used across async transitions.
- `src/lib/utils/api-utils.ts` is the integration layer:
  - calls Netlify functions under `/.netlify/functions/*`
  - uses OpenAI client in-browser for guess generation and match checks
  - records completed rounds to backend storage
- Netlify functions persist and query round history in Astra DB with embeddings for vector-based suggestion retrieval.

### Backend/serverless responsibilities

- `netlify/functions/record-round.js`: stores round rows, generates embeddings, writes to Astra DB.
- `netlify/functions/get-rounds.js`: vector-searches similar historical rounds and returns weighted guess candidates.
- `netlify/functions/get-all-words.js`: returns distinct words used in the dataset.
- `src/server.js` mirrors similar concerns for an Express API mode (`/api/*`) and initializes Astra/OpenAI clients for that runtime.

### Config that affects runtime behavior

- `netlify.toml`:
  - Build command: `CI=false npm run build`
  - Redirects `/api/*` to `/.netlify/functions/:splat`
  - Functions directory is `netlify/functions`
- Environment variables are required for OpenAI + Astra DB flows (used by both frontend-integrated AI calls and server/serverless code).
