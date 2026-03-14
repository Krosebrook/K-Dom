# Architecture — K-Dom

## System Overview

K-Dom is a **fully client-side, single-page application (SPA)**. There is no backend server, no database server, and no network calls outside of the Google Gemini API. All game state is managed in React and persisted via localStorage.

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Browser (Client)                           │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      React 19 SPA                              │ │
│  │                                                                │ │
│  │  ┌─────────────────────────────────────────────────────────┐  │ │
│  │  │                    App.tsx                               │  │ │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │ │
│  │  │  │  Simulation  │  │  Save/Load   │  │  AI Polling  │   │  │ │
│  │  │  │  Loop (2s)   │  │ localStorage │  │ (45s/60s)    │   │  │ │
│  │  │  └──────────────┘  └──────────────┘  └──────────────┘   │  │ │
│  │  └─────────────────────────────────────────────────────────┘  │ │
│  │                                                                │ │
│  │  ┌────────────────────────┐  ┌────────────────────────────┐   │ │
│  │  │    IsoMap.tsx          │  │    UIOverlay.tsx (DOM)     │   │ │
│  │  │  ┌──────────────────┐  │  │  ┌────────────────────┐   │   │ │
│  │  │  │  @r3f Canvas     │  │  │  │  Stats bar         │   │   │ │
│  │  │  │  ┌────────────┐  │  │  │  │  Building toolbar  │   │   │ │
│  │  │  │  │ Three.js   │  │  │  │  │  AI goal panel     │   │   │ │
│  │  │  │  │ Render     │  │  │  │  │  Military panel    │   │   │ │
│  │  │  │  └────────────┘  │  │  │  │  News feed         │   │   │ │
│  │  │  │  ┌────────────┐  │  │  │  └────────────────────┘   │   │ │
│  │  │  │  │ UnitSystem │  │  │  └────────────────────────────┘   │ │
│  │  │  │  │ (AI + anim)│  │  │                                   │ │
│  │  │  │  └────────────┘  │  │  ┌────────────────────────────┐   │ │
│  │  │  │  ┌────────────┐  │  │  │  Overlays (z-50)            │   │ │
│  │  │  │  │ Post FX    │  │  │  │  StartScreen               │   │ │
│  │  │  │  └────────────┘  │  │  │  EventModal                │   │ │
│  │  │  └──────────────────┘  │  │  AdvisorChat               │   │ │
│  │  └────────────────────────┘  └────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                      │
│              ┌───────────────┘                                      │
│              ▼                                                       │
│  ┌──────────────────────────┐     ┌─────────────────────────────┐  │
│  │      localStorage        │     │   Google Gemini API          │  │
│  │  'kingdom_builder_save'  │     │  gemini-3-flash-preview      │  │
│  │  { grid, stats, persona} │     │  (goals, events, news, chat) │  │
│  └──────────────────────────┘     └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### `index.tsx` — Entry Point
Mounts the React root. Sets `StrictMode`. No other logic.

### `App.tsx` — Game State Controller
The root component. Owns all game state via `useState`. Runs three independent timer loops:

| Loop | Interval | Purpose |
|------|---------|---------|
| Simulation | 2,000 ms (`TICK_RATE_MS`) | Gold, pop, defense, happiness, season |
| Auto-save | 5,000 ms | Writes state to localStorage |
| Floating text decay | 50 ms | Decrements `life` of floating text overlays |
| News tick | 45,000 ms | Triggers `generateTownCrierEvent` |
| Event tick | 60,000 ms (30% fire rate) | Triggers `generateGameEvent` |

Key refs (`gridRef`, `statsRef`, `toolRef`, `rotRef`, `personaRef`) shadow useState values so closures inside timers always read current values without needing them as loop dependencies.

### `components/IsoMap.tsx` — 3D World
The largest file (~1,050 LOC). Contains:

- **Texture generators** — procedural canvas-based grass, stone, water textures (season-aware)
- **PitMesh** — moat/drawbridge pit rendering with animated water fill
- **DrawbridgeMesh** — spring-physics animated drawbridge
- **ProceduralBuilding** — switch-based building geometry per `BuildingType`
- **NatureSystem** — instanced mesh trees and rocks using deterministic seeding
- **UnitSystem** — full autonomous AI for 4 unit types with combat, formation, and patrolling
- **UnitBody / UnitHead / UnitHPBar** — per-unit render components using @react-three/drei Instances
- **IsoMap (default export)** — Canvas setup, lighting, grid rendering, post-processing, floating text HTML

#### UnitSystem AI Logic (runs in `useFrame`)

Every 20 rendered frames (≈ 3×/sec at 60fps):
- Officers recruit nearby unassigned soldiers (up to squad of 4)
- Officers seek enemies in 8-tile sight range; otherwise patrol
- Soldiers follow squad leader or independently hunt enemies
- Enemies prioritize units → buildings; wander if nothing nearby

Every 60 rendered frames (≈ 1×/sec at 60fps):
- Combat: attackers deal 10–25 HP damage to adjacent targets
- 10% chance per hit to destroy a building (`onBuildingDestroyed` callback)
- Dead units (hp ≤ 0) are removed from `unitsRef`

### `components/UIOverlay.tsx` — HUD
All DOM UI layered over the canvas. Uses Tailwind CSS. Receives all data as props from App.tsx.

### `components/StartScreen.tsx` — Title / Config
Pre-game screen. Lets players toggle AI, pick advisor persona, or load saved game.

### `components/EventModal.tsx` — Event Interrupts
Full-screen modal for random AI-generated events. Shows title, description, two choices with gold costs.

### `components/AdvisorChat.tsx` — Chat Overlay
Full-screen chat UI with message history, loading indicator, and text input form.

### `services/geminiService.ts` — AI Layer
All Gemini API calls. Uses `@google/genai` client library with structured JSON output (`responseMimeType: "application/json"` + `responseSchema`). Each function has a fallback that returns pre-written content if the API fails.

---

## Data Flow

```
User clicks tile
    → App.handleTileClick(x, y)
    → reads toolRef.current (avoids stale closure)
    → validates gold vs. cost
    → setStats(prev → new stats with gold deducted)
    → setGrid(prev → new grid with building placed)
    → if Moat/Drawbridge: propagateWater() BFS to hydrate connected tiles
    → spawnFloatingText(x, y, text, color) for visual feedback
```

```
2-second simulation tick
    → reads gridRef.current (flat traversal)
    → accumulates: income, popGrowth, defense, housing
    → setStats(prev → next):
         - season = SEASON_ORDER[Math.floor(day / DAYS_PER_SEASON) % 4]
         - happiness = lerp(prev.happiness, targetHappiness, 0.05)
         - subjects = clamp(prev.subjects + popGrowth, 0, maxPop)
         - gold += income
         - checks currentGoal completion
```

---

## State Schema

See [docs/DATABASE.md](DATABASE.md) for full localStorage schema documentation.

---

## Authentication

None. K-Dom is an anonymous client-side game with no user accounts, sessions, or authentication.

---

## External Integrations

| Service | Usage | Auth |
|---------|-------|------|
| Google Gemini API | Quest, event, news, chat generation | `GEMINI_API_KEY` env var at build time |

No webhooks. No background queues. No other external services.

---

## Error Handling Strategy

- **Gemini API failures**: All `geminiService.ts` functions are wrapped in `try/catch`. On failure, they return fallback pre-written content (goals, news) or `null` (events). The UI handles `null` gracefully.
- **Save/load**: `loadGame()` wraps `JSON.parse` in `try/catch`; failures are logged to `console.error` and ignored.
- **Missing API key**: Gemini calls will throw; fallback content is served. A `console.warn` is emitted.
- **Build-time injection**: If `GEMINI_API_KEY` is not set at build time, `process.env.API_KEY` will be `undefined`, and the Gemini client will throw on any call.

---

## Build and Deployment

### Build
```bash
npm run build
```
Outputs to `dist/`. Vite code-splits `IsoMap` as a separate lazy chunk.

### Deployment
Static files only. No server required. Works with:
- Netlify, Vercel (set `GEMINI_API_KEY` as environment variable)
- GitHub Pages (key must be embedded at build time)
- Any CDN/static host

### Bundle Sizes (production)
| Chunk | Size (raw) | Gzipped |
|-------|-----------|---------|
| `index.js` | 504 KB | 126 KB |
| `IsoMap.js` | 1,138 KB | 346 KB |
| `index.css` | 38 KB | 7 KB |

The IsoMap chunk is large due to Three.js and @react-three/fiber/drei bundled together. Dynamic import (`lazy()`) in App.tsx ensures the game shell loads before the 3D engine.

---

## Infrastructure Dependencies

| Dependency | Purpose | Fallback if unavailable |
|-----------|---------|------------------------|
| Google Gemini API | AI content generation | Pre-written fallback content |
| localStorage | Game save persistence | Game works; save/load not available |
| WebGL | 3D rendering | App fails gracefully with canvas error |
| Browser Canvas API | Procedural texture generation | Falls back to 1×1 grey texture |
