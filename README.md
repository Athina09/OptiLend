# Optilend 

AI-powered alternative credit intelligence demo for MSMEs: **Next.js frontend**, **Express scoring API**, **segment loan recommendations**, and optional **encryption helpers**.

## Packages

| Folder | Role | Docs |
|--------|------|------|
| **`client/`** | Next.js 14 (App Router), MSME/bank flows, OptilendScore UI | Run `npm run dev` inside `client/` |
| **`scoring-layer/`** | Standalone scoring API: rules + nearest peer in `dataset.json` | [scoring-layer/README.md](./scoring-layer/README.md) |
| **`client/lib/loan-recommendation/`** | Segment loan datasets + mapping to dashboard loan cards (bundled with the Next app) | Imported as `@/lib/loan-recommendation` |
| **`security/`** | AES-256-CBC helpers (`ENCRYPTION_KEY`) for backends | [security/README.md](./security/README.md) |
| **`server/`** | Optilend Express server (e.g. email routes) | `cd server && npm start` |
| **`Chatbot/`**, **`test/`** | Other services (if used) | See each folder |

## Quick start (full demo)

1. **Install**

   ```bash
   npm run install:all
   ```

   (Installs `client`, `server`, and `scoring-layer` dependencies.)

2. **Scoring API** (default port **5055**)

   ```bash
   npm run scoring-layer
   ```

3. **Next client** (from repo root)

   ```bash
   npm run client
   ```

4. **Env (client)** — optional but recommended so the browser can reach the scorer:

   In `client/.env.local`:

   ```env
   SCORING_API_URL=http://127.0.0.1:5055
   NEXT_PUBLIC_SCORING_LAYER_URL=http://127.0.0.1:5055
   ```

   - **`SCORING_API_URL`** — used by **`client/app/api/score/route.ts`** to proxy `POST /api/score` → `{SCORING_API_URL}/score`.
   - **`NEXT_PUBLIC_SCORING_LAYER_URL`** — optional direct calls from the browser (`lib/scoring-api.ts`).

## Features (high level)

- **Landing**: Hero, 3D background, GSAP, security badges  
- **MSME**: Login, AA consent, assessment, **dashboard with live OptilendScore** from scoring layer  
- **Bank**: Login, portfolio, MSME detail  
- **Scoring**: Explainable **300–900** score (legacy demo + rich assessment); see [scoring-layer/README.md](./scoring-layer/README.md)  
- **Loans**: Industry-segment recommendations when `scoring_segment` / profile matches; see `client/lib/loan-recommendation/`

## Client routes

| Route | Description |
|-------|-------------|
| `/` | Landing |
| `/msme/login` | MSME login |
| `/msme/dashboard` | Dashboard (score meter, scoring panel, loans) |
| `/bank/login` | Bank login |
| `/bank/dashboard` | Portfolio |
| `/bank/msme/[id]` | MSME detail |

## Tech stack

- Next.js 14, TypeScript, Tailwind, GSAP, Three.js  
- Express (scoring layer + server)

## Build (client only)

```bash
cd client && npm run build && npm start
```

## Disclaimer

Demo / hackathon use. Not production credit or legal advice.
