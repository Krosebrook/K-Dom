# Roadmap — K-Dom

**Type:** WSJF-scored technical roadmap derived from codebase audit  
**Date:** 2026-03-13  
**Method:** Weighted Shortest Job First (WSJF) = (BV + TC + RR) / Size  
**Scale:** Fibonacci 1–13 (1=trivial, 13=huge)

---

## WSJF Scoring Table

| # | Item | BV | TC | RR | Size | WSJF | Tier |
|---|------|----|----|----|----|------|------|
| 1 | Proxy Gemini API key (serverless function) | 8 | 5 | 13 | 5 | 5.2 | 1 |
| 2 | Automated test suite (Vitest) | 8 | 8 | 8 | 5 | 4.8 | 1 |
| 3 | Wall visual connectivity | 5 | 3 | 3 | 3 | 3.7 | 2 |
| 4 | LocalStorage save schema validation | 5 | 5 | 5 | 3 | 5.0 | 1 |
| 5 | Content Security Policy header | 5 | 3 | 8 | 2 | 8.0 | 1 |
| 6 | Bundle size optimization (code splitting) | 5 | 3 | 3 | 5 | 2.2 | 3 |
| 7 | Configurable model ID (env var) | 3 | 5 | 8 | 1 | 16.0 | 1 |
| 8 | Building max level cap (UI) | 3 | 3 | 3 | 2 | 4.5 | 2 |
| 9 | Formation types: line and circle | 3 | 2 | 2 | 3 | 2.3 | 3 |
| 10 | Units persist across save/load | 5 | 3 | 3 | 5 | 2.2 | 3 |
| 11 | Persistent chat history | 3 | 2 | 2 | 2 | 3.5 | 2 |
| 12 | Game over / loss condition | 8 | 5 | 5 | 8 | 2.3 | 3 |
| 13 | Sound effects | 3 | 2 | 2 | 8 | 0.9 | 4 |
| 14 | Mobile touch controls | 5 | 5 | 5 | 13 | 1.2 | 4 |

*BV = Business Value, TC = Time Criticality, RR = Risk Reduction*

---

## Tier 1 — Fix Now

### T1-1: Make Gemini API Key configurable via environment variable (model ID)
**WSJF:** 16.0  
**What:** `gemini-3-flash-preview` is hardcoded in `services/geminiService.ts:10`. If the model is deprecated, all AI features break silently.  
**Why:** Single-line change with outsized risk reduction.  
**Where:** `services/geminiService.ts:10`  
**Effort:** 1 (< 5 min)  
**Fix:**
```typescript
// services/geminiService.ts
const modelId = process.env.GEMINI_MODEL_ID || 'gemini-3-flash-preview';
```
Add to `.env.example`:
```
GEMINI_MODEL_ID=gemini-3-flash-preview
```
**Acceptance criteria:** Model changes via env var without code change.

---

### T1-2: Content Security Policy
**WSJF:** 8.0  
**What:** No CSP is configured. While K-Dom has no user-generated HTML, a CSP limits damage from any future XSS vectors.  
**Why:** Low effort, meaningfully reduces security risk.  
**Where:** `index.html`  
**Effort:** 2  
**Fix:**
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               connect-src https://generativelanguage.googleapis.com;
               img-src 'self' data:;
               style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com;">
```
**Acceptance criteria:** DevTools → Security shows no CSP violations on normal gameplay.

---

### T1-3: LocalStorage save schema validation on load
**WSJF:** 5.0  
**What:** `loadGame()` casts parsed JSON to `SaveData` without validating fields. A corrupted or outdated save can cause runtime errors.  
**Why:** Prevents silent state corruption on load; enables future schema versioning.  
**Where:** `App.tsx:135-148`  
**Effort:** 3  
**Fix:** Add field presence checks before using loaded data:
```typescript
const loadGame = () => {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        // Validate required fields
        if (!Array.isArray(data.grid) || !data.stats || typeof data.stats.gold !== 'number') {
            console.warn("Save data invalid or from incompatible version — starting fresh");
            localStorage.removeItem(SAVE_KEY);
            return;
        }
        setGrid(data.grid);
        setStats(data.stats);
        setPersona(data.persona || AdvisorPersona.Balanced);
        setGameStarted(true);
    } catch (e) {
        console.error("Failed to load save", e);
        localStorage.removeItem(SAVE_KEY); // Clear corrupted save
    }
};
```
**Acceptance criteria:** Invalid localStorage value doesn't break the game; a clear error is logged.

---

### T1-4: Automated test suite (Vitest)
**WSJF:** 4.8  
**What:** Zero test coverage. Logic in `App.tsx` (simulation tick, water propagation), `constants.tsx` (getBuildingConfig, getUpgradeCost), and `geminiService.ts` (fallback logic) are testable without a DOM.  
**Why:** Prevents regressions in the simulation engine and prevents future AI edits from breaking core logic.  
**Where:** New `__tests__/` directory  
**Effort:** 5  
**Key tests to write:**
- `propagateWater` — BFS correctly marks wet tiles
- `getUpgradeCost` — correct formula at each level
- `getBuildingConfig` — fallback to None on invalid type
- `generateKingdomGoal` fallback content structure
- Simulation tick: income/defense/happiness math

---

### T1-5: Proxy Gemini API key through a serverless function
**WSJF:** 5.2  
**What:** The API key is embedded in the client JS bundle, visible in browser DevTools.  
**Why:** Prevents API key misuse; required for public deployments.  
**Where:** New `api/` directory (Vercel/Netlify functions) + update `geminiService.ts`  
**Effort:** 5  
**Approach:** Create a serverless route `/api/ai` that accepts the same call signature, makes the Gemini request server-side, and returns the response. The client never holds the key.  
**Acceptance criteria:** Gemini API key does not appear in the client JS bundle.

---

## Tier 2 — This Sprint

### T2-1: Wall visual connectivity
**WSJF:** 3.7  
**What:** Walls render as standalone segments regardless of adjacency. Real castle walls should merge visually.  
**Why:** Major visual quality issue. The TODO comment in the code marks this as known.  
**Where:** `components/IsoMap.tsx:239-246`  
**Effort:** 3  
**Approach:** In `ProceduralBuilding` Wall case, use `safeGet` to check N/S/E/W neighbors and render cross-section geometry for connected walls. The `safeGet` function is already defined in the same block.

---

### T2-2: Building max level cap
**WSJF:** 4.5  
**What:** Buildings can be upgraded without limit. The UI shows a level counter but there's no cap.  
**Why:** Prevents gold exploits via unbounded income scaling.  
**Where:** `App.tsx:handleUpgrade()`, `UIOverlay.tsx:canUpgrade`  
**Effort:** 2  
**Fix:** Add `const MAX_LEVEL = 3;` and disable upgrade button when `tile.level >= MAX_LEVEL`.

---

### T2-3: Persistent chat history
**WSJF:** 3.5  
**What:** Chat history is cleared on every page refresh. Players lose context between sessions.  
**Why:** Improves advisor continuity; low-effort addition to the existing save system.  
**Where:** `App.tsx:loadGame/saveGame`, `chatHistory` state  
**Effort:** 2

---

## Tier 3 — This Quarter

### T3-1: Bundle size optimization
**WSJF:** 2.2  
**What:** IsoMap chunk is 1.14 MB uncompressed. Three.js + drei account for most of this.  
**Why:** Slower initial load on low-bandwidth connections.  
**Approach:** Evaluate `@react-three/drei` tree-shaking; consider lazy-loading specific drei modules; enable Vite's `manualChunks` to split drei from Three.js.

---

### T3-2: Formation types (line, circle)
**WSJF:** 2.3  
**What:** `Formation` type supports `'line' | 'wedge' | 'circle'` but only `wedge` is used.  
**Where:** `IsoMap.tsx:512-530`  
**Effort:** 3

---

### T3-3: Unit persistence across save/load
**WSJF:** 2.2  
**What:** Unit positions, HP, and AI state reset on every game load.  
**Why:** Players lose their army formation on refresh.  
**Approach:** Add `units: Unit[]` to `SaveData`; restore in `loadGame`.

---

### T3-4: Game over / loss condition
**WSJF:** 2.3  
**What:** No fail state exists. Gold can go negative, subjects can reach 0, enemies can destroy all buildings — game continues indefinitely.  
**Why:** Core game loop is missing stakes.  
**Approach:** Check for `stats.subjects === 0 && stats.gold < 0` or all buildings destroyed; show game over screen.

---

## Tier 4 — Backlog

### T4-1: Sound effects
**WSJF:** 0.9  
**Notes:** Requires Web Audio API integration; out-of-scope for the current minimal build.

---

### T4-2: Mobile touch controls
**WSJF:** 1.2  
**Notes:** The 3D canvas uses `MapControls` which has touch support, but the HUD layout is not optimized for small screens. Full mobile support requires significant layout work (13 effort units).

---

## Not Recommended

| Item | Rationale |
|------|----------|
| Add a backend / multiplayer | Contradicts the "simple local game" design; massive complexity increase |
| Switch to a different AI model provider | Gemini integration is working with good fallbacks; migration cost not justified |
| Replace Three.js with a different engine | Deep integration; high migration cost; no clear benefit |
