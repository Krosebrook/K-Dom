# K-Dom

<div align="center">

**A Medieval Realm Simulator powered by AI**

*Build, defend, and grow your kingdom — guided by a generative AI Royal Advisor*

</div>

---

## Overview

K-Dom is a real-time medieval kingdom-building strategy game rendered in an isometric 3D view. Players place buildings on a 34×34 tile grid, manage kingdom resources (gold, subjects, happiness, defense), and receive AI-generated quests, news, and event decisions from a Royal Advisor powered by Google Gemini.

The game features:
- **Isometric 3D rendering** via Three.js / @react-three/fiber
- **Autonomous unit AI** — peasants, soldiers, officers, and enemy raiders with combat
- **Procedural environment** — dynamic day/night cycle, seasons, trees, rocks
- **Google Gemini integration** — quest generation, town crier events, event choices, advisor chat
- **Persistent save** via localStorage

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| UI Framework | React | 19.2.4 |
| 3D Engine | Three.js | 0.173.0 |
| React 3D | @react-three/fiber | 9.5.0 |
| React 3D Helpers | @react-three/drei | 10.7.7 |
| Post-processing | @react-three/postprocessing | 3.0.4 |
| Custom Shaders | three-custom-shader-material | 6.4.0 |
| AI / LLM | @google/genai (Gemini) | 1.44.0 |
| Styling | Tailwind CSS | 4.2.1 |
| Build Tool | Vite | 6.4.1 |
| Language | TypeScript | 5.8.3 |

---

## Prerequisites

- **Node.js** ≥ 18 (recommended: 20 LTS)
- A **Google Gemini API key** — obtain from [Google AI Studio](https://ai.studio/)

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and set your Gemini API key:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run in development

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes (for AI features) | Google Gemini API key. Without it, the advisor uses fallback pre-set goals and news. |

The variable is injected at build time via `vite.config.ts` as `process.env.API_KEY` and `process.env.GEMINI_API_KEY`.

---

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Development | `npm run dev` | Start Vite dev server at localhost:3000 |
| Build | `npm run build` | Bundle for production into `dist/` |
| Preview | `npm run preview` | Serve production build locally |

---

## Project Structure

```
K-Dom/
├── index.html               # HTML entry point (importmap for CDN fallback)
├── index.tsx                # React root mount
├── App.tsx                  # Root component — game state, simulation loop
├── types.ts                 # All TypeScript types and enums
├── constants.tsx            # Building configs, game constants
├── index.css                # Global CSS (minimal — Tailwind handles styles)
├── vite.config.ts           # Vite + Tailwind configuration
├── tsconfig.json            # TypeScript compiler config
├── package.json
│
├── components/
│   ├── IsoMap.tsx           # 3D isometric map, unit AI system, environment
│   ├── UIOverlay.tsx        # HUD — stats, tools, inspector, news feed
│   ├── StartScreen.tsx      # Title screen / persona selector
│   ├── EventModal.tsx       # Random event decision popup
│   └── AdvisorChat.tsx      # AI chat overlay
│
├── services/
│   └── geminiService.ts     # All Gemini AI calls (goals, events, news, chat)
│
└── docs/                    # Documentation
    ├── DEAD-CODE-TRIAGE.md
    ├── ARCHITECTURE.md
    ├── API.md
    ├── PRD.md
    ├── ROADMAP.md
    ├── RUNBOOK.md
    ├── DATABASE.md
    ├── SECURITY.md
    ├── AUDIT-REPORT.md
    └── adr/                 # Architecture Decision Records
```

---

## Architecture Overview

K-Dom is a single-page client-only application with no backend. All state lives in React and localStorage.

```
Browser
  └── React 19 (SPA)
        ├── App.tsx           — game simulation loop (setInterval, 2s tick)
        ├── IsoMap.tsx        — Three.js canvas via @react-three/fiber
        │     └── UnitSystem  — autonomous unit AI (useFrame animation loop)
        ├── UIOverlay.tsx     — DOM overlay on top of canvas
        ├── StartScreen       — pre-game configuration
        ├── EventModal        — interrupting game events
        └── AdvisorChat       — streaming chat with Gemini
              └── geminiService.ts — all API calls to Google Gemini
                    └── Google Gemini API (gemini-3-flash-preview)

Persistence: localStorage (key: 'kingdom_builder_save_v1')
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full system design.

---

## Gameplay

### Building Tools

| Category | Buildings |
|----------|-----------|
| **Civic** | Demolish, Dirt Path, Hovel, Market, Farm, Keep |
| **Military** | Barracks, Stone Wall, Gatehouse, Watch Tower, Moat, Drawbridge |

### Controls

| Action | Control |
|--------|---------|
| Place building | Click tile |
| Rotate building | `R` key or Rotate button |
| Pan/zoom map | Mouse drag / scroll |
| Select tile | Click placed building |
| Open advisor chat | Chat button (top right) |

### Simulation Tick (every 2 seconds)

- Gold income from buildings (seasonal modifiers apply to Farms)
- Population growth (capped by Hovel capacity)
- Defense rating (walls + soldiers + officers + moat bonuses)
- Happiness calculation (crowding, poverty, defense, season)
- Season advances every 10 days (Spring → Summer → Autumn → Winter)

---

## Testing

There are **no automated tests** in the current codebase. Manual testing against the running dev server is the only testing method.

---

## Known Issues

1. **Wall connectivity:** Walls do not visually connect to adjacent walls (noted as `TODO` in `IsoMap.tsx:241`).
2. **Large bundle:** The `IsoMap` chunk is ~1.1 MB (346 KB gzipped) due to Three.js + drei.

---

## Deployment

The app is a static client-side bundle. Deploy `dist/` to any static host.

**Required:** Set `GEMINI_API_KEY` as an environment variable at build time so Vite injects it.

```bash
GEMINI_API_KEY=your_key npm run build
```

---

## Credits

Forged by [@ammaar](https://x.com/ammaar)
