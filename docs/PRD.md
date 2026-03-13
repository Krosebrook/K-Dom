# Product Requirements Document — K-Dom

**Type:** Current-state reverse-engineered PRD (not aspirational)  
**Date:** 2026-03-13  
**Derived from:** Codebase audit of commit `bdf6062`

---

## Product Overview

K-Dom is a browser-based medieval kingdom-building strategy game. Players construct a kingdom on a 34×34 isometric tile grid, manage resources (gold, subjects, defense, happiness), and receive AI-generated guidance from a Royal Advisor powered by Google Gemini. The game includes autonomous unit entities (peasants, soldiers, officers, enemies) that move, patrol, and fight in real time.

### What it actually does (as implemented)
1. Presents a 3D isometric map built with Three.js
2. Lets players place, rotate, and upgrade 12 building types
3. Runs a background simulation loop (every 2 seconds) that calculates income, population growth, defense, happiness, and season advancement
4. Spawns unit entities that wander, patrol, fight, and raid buildings
5. Generates AI quests, news headlines, random events, and advisory chat via Google Gemini
6. Saves and loads game state via localStorage

---

## Target Users

Inferred from the UI and game mechanics:

- **Casual strategy game players** — accessible one-click building system, no complex resource chains
- **AI/generative experience enthusiasts** — the AI Advisor is prominently featured; AI toggle on the start screen
- **Fans of medieval/fantasy aesthetics** — visual design, medieval terminology throughout

There are no authentication flows, accounts, or multiplayer — this is a single-player local game.

---

## Core Features

### Feature 1: Building Placement System
**Status:** Fully implemented  
**Entry point:** `App.handleTileClick()` → `IsoMap` tile click events  
**Data models:** `Grid` (34×34 `TileData[][]`), `BuildingType` enum, `TileData`  
**Logic:** Tool selection → cost validation → gold deduction → grid state update → water propagation for moats  
**Known issues:**
- Walls don't visually connect to adjacent walls (TODO in `IsoMap.tsx:241`)
- Demolish costs 5 gold (subtract from treasury)

**Buildings and their stats (`constants.tsx`):**
| Building | Cost | Pop/tick | Gold/tick | Defense |
|----------|------|---------|-----------|---------|
| Path | 5g | 0 | 0 | 0 |
| Hovel | 50g | 3 | 0 | 0 |
| Market | 150g | 0 | 10 | 0 |
| Farm | 100g | 0 | 5 | 0 |
| Keep | 500g | 1 | 2 | 50 |
| Barracks | 250g | 0 | 0 | 10 |
| Wall | 20g | 0 | 0 | 5 |
| Gatehouse | 150g | 0 | 0 | 20 |
| Tower | 200g | 0 | 0 | 30 |
| Moat | 30g | 0 | 0 | 15 |
| Drawbridge | 200g | 0 | 0 | 25 |

---

### Feature 2: Kingdom Simulation Engine
**Status:** Fully implemented  
**Entry point:** `App.tsx` `useEffect` with `setInterval(tick, 2000)`  
**Data models:** `KingdomStats`, `Grid`, `Season` enum  

**Implemented mechanics:**
- Gold income accumulates every tick (Farm income reduced 80% in Winter, +50% in Autumn)
- Population grows up to `(Hovel count × 10 level) + 5` cap
- Defense = buildings + soldiers×2 + officers×15 + wall-garrison bonus (min of walls and soldiers ×10)
- Wet moat tiles add 5 defense per tile
- Happiness: 100 base, −20 if pop > 90% of housing, −10 if gold < 100, −10 if defense < subjects/2, −5 in Winter
- Population leaves (−1/tick) if happiness < 50
- Season advances every 10 days: Spring → Summer → Autumn → Winter → Spring

---

### Feature 3: Building Upgrade System
**Status:** Fully implemented  
**Entry point:** `UIOverlay` Upgrade button → `App.handleUpgrade()`  
**Upgradeable buildings:** Hovel, Market, Farm, Barracks, Tower  
**Upgrade cost:** `base_cost × (current_level + 1)` (Lv1→2 = 2× base, Lv2→3 = 3× base)  
**Effect:** `level` field on TileData increments; buildings scale 15% larger per level; income/defense scales linearly with level

---

### Feature 4: AI Royal Advisor System
**Status:** Fully implemented (with fallbacks)  
**Entry point:** `services/geminiService.ts`, called from `App.tsx`  

**Sub-features:**
- **Persona selection:** 4 personas (The Steward, The Warlord, The Merchant, The Architect) selected on start screen; biases goal generation
- **Quest generation:** AI creates quests targeting gold/subjects/defense/soldiers/building_count; rewards gold on completion
- **Town Crier news feed:** AI-generated medieval headlines every 45 seconds
- **Random events:** AI-generated decision events (2 choices, gold costs) every ~60 seconds; 30% trigger rate
- **Advisor chat:** Full conversation interface with last 5 turns as context

**Known issues:**
- Model ID `gemini-3-flash-preview` — if this model is retired, all AI calls will fail (fallbacks activate)
- No streaming — chat responses load as a single block

---

### Feature 5: Unit AI System
**Status:** Fully implemented  
**Entry point:** `IsoMap.tsx` `UnitSystem` component (runs in WebGL `useFrame`)  
**Unit types:** Peasant, Soldier, Officer, Enemy  

**Implemented AI behaviors:**
- Officers: recruit soldiers into squads (max 4), attack enemies within 8 tiles, patrol otherwise
- Soldiers: follow squad leader in formation (wedge/line), or independently hunt enemies
- Peasants: wander/patrol
- Enemies: spawn at grid edges every 10 seconds (max 5 concurrent), attack nearest units/buildings
- Combat: 1 attack per second; officers deal 25 HP, soldiers 15 HP, others 10 HP
- Building destruction: 10% chance per hit when enemy attacks building; calls `onBuildingDestroyed`

---

### Feature 6: Environment and Visual System
**Status:** Fully implemented  
**Entry point:** `IsoMap.tsx`  

**Implemented:**
- Day/night cycle: sun position animates over time; `isNight` flag changes ambient/sky/fog
- Seasons: grass texture changes (green/orange/white); tree color changes; farm income modifier
- Procedural terrain: sine-based height variation on grid tiles
- Procedural nature: instanced trees and rocks on empty tiles (deterministic seeding)
- Post-processing: N8AO ambient occlusion, TiltShift depth-of-field, AGX tone mapping
- Weather: static cloud layer; adjusts opacity for day/night

---

### Feature 7: Moat & Drawbridge Water System
**Status:** Fully implemented  
**Entry point:** `App.propagateWater()` BFS algorithm  

When a Moat or Drawbridge tile is placed adjacent to an edge tile or existing wet tile, the BFS propagates `isWet = true` through connected moat/drawbridge tiles. Wet tiles animate water fill in `PitMesh`. Drawbridge animation uses spring physics.

---

### Feature 8: Save / Load System
**Status:** Fully implemented  
**Storage:** `localStorage`, key: `kingdom_builder_save_v1`  
**Auto-save:** Every 5 seconds when game is active  
**Saved data:** `{ grid, stats, persona, version: 1 }`  
**Restore:** Complete state restoration including grid layout, all stats, and persona  

---

### Feature 9: Military Management UI
**Status:** Fully implemented  
**Controls:**
- **Conscript:** Convert 1 subject → 1 soldier, costs 50g; requires subject ≥ 1 and gold ≥ 50
- **Promote Officer:** Convert 1 soldier → 1 officer, costs 100g; requires soldier ≥ 1 and gold ≥ 100

---

## Described but Not Implemented

| Feature | Evidence | Status |
|---------|---------|--------|
| Wall visual connectivity | `IsoMap.tsx:241` TODO comment | Not implemented |
| Formation types `line` and `circle` | Defined in `Formation` type; only `wedge` fully used | Partial |
| Vendor/building `variant` field | `TileData.variant?: number` defined but never set | Defined, unused |

---

## Implemented but Not Described (in prior docs)

| Feature | Location |
|---------|---------|
| Spring physics drawbridge animation | `IsoMap.tsx:DrawbridgeMesh` |
| Per-unit HP bar overlays (HTML-in-3D) | `IsoMap.tsx:UnitHPBar` |
| Enemy building destruction callback | `IsoMap.tsx:UnitSystem` → `App.onBuildingDestroyed` |
| Rotation keyboard shortcut (R key) | `App.tsx:96-104` |
| Wet moat defense bonus (+5/tile) | `App.tsx:221` |
| Wall-garrison defense formula | `App.tsx:227-228` |
| Happiness-based population loss | `App.tsx:249` |

---

## Data Model Summary

See [docs/DATABASE.md](DATABASE.md) for full localStorage schema.

| Entity | Storage | Size |
|--------|---------|------|
| Grid | localStorage | 34×34 × ~6 fields per tile |
| KingdomStats | localStorage | 8 numeric/string fields |
| AdvisorPersona | localStorage | 1 string enum value |
| Chat history | React state only | Not persisted |
| News feed | React state only | Not persisted |
| Unit positions | React state only | Not persisted |
| Floating texts | React state only | Not persisted |

---

## Non-Functional Requirements (Observed)

### Performance
- Targets 60fps for Three.js `useFrame` animation loop
- `IsoMap` is lazy-loaded via `React.lazy()` to avoid blocking the initial paint
- Instanced meshes (`Instances` from drei) for units reduce draw calls
- `useMemo` used throughout for geometry and material creation
- `React.memo` on `NatureSystem`, `ProceduralBuilding`, `UnitSystem`

### Security
- No user-generated content stored server-side
- API key only used at client; key is embedded in bundle at build time (inherent risk)
- No SQL, no XSS vectors in data paths (see [SECURITY.md](SECURITY.md))

### Accessibility
- No ARIA labels on game controls
- Keyboard shortcut for rotation (R key) documented
- No screen reader support

### Browser Compatibility
- Requires WebGL 2 support (Three.js)
- Requires `localStorage` support
- Requires modern ESM support (importmap in `index.html`)
- Tested browsers: Chrome/Edge (implied by Vite defaults)

---

## Technical Constraints

1. **Bundle size**: Three.js + drei brings ~1.1 MB to the IsoMap chunk
2. **No backend**: Cannot persist state across devices or browsers
3. **API key exposure**: `GEMINI_API_KEY` is embedded in the client bundle — anyone inspecting the source can extract it
4. **Single model dependency**: Hard-coded `gemini-3-flash-preview` model ID
5. **No rate limiting**: Rapid quest claiming could trigger multiple Gemini calls in quick succession

---

## Open Questions

1. Is `gemini-3-flash-preview` the correct/stable model identifier for the target environment?
2. Should the API key be proxied through a serverless function to prevent client-side exposure?
3. What is the intended max building level cap? Code allows unbounded upgrades.
4. Should unit count be synchronized with `stats.soldiers`/`stats.subjects` at load time? Currently units are re-initialized fresh each game session.
