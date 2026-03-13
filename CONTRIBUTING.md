# Contributing to K-Dom

## Development Setup

### Prerequisites
- Node.js ≥ 18 (recommend 20 LTS)
- npm (bundled with Node.js)
- A Google Gemini API key (optional — fallback content activates without one)
- A WebGL-capable browser (Chrome or Edge recommended)

### First-time setup
```bash
# 1. Clone the repository
git clone https://github.com/Krosebrook/K-Dom.git
cd K-Dom

# 2. Install dependencies
npm install

# 3. Set up environment (optional for AI features)
cp .env.example .env.local
# Edit .env.local: GEMINI_API_KEY=your_key

# 4. Start the dev server
npm run dev
# → http://localhost:3000
```

---

## Project Structure

```
K-Dom/
├── App.tsx              Main game logic, all state
├── types.ts             TypeScript types and enums (edit here to add new types)
├── constants.tsx        Building configs, game constants (edit to tune gameplay)
├── components/
│   ├── IsoMap.tsx       3D world (Three.js) — buildings, units, environment
│   ├── UIOverlay.tsx    HUD — all DOM UI above the canvas
│   ├── StartScreen.tsx  Pre-game screen
│   ├── EventModal.tsx   Random event popup
│   └── AdvisorChat.tsx  Advisor chat overlay
├── services/
│   └── geminiService.ts All Gemini API calls
└── docs/                Documentation
```

---

## Code Standards

### TypeScript
- All files use TypeScript. No `any` type if it can be avoided.
- Component functions use `React.FC<Props>` type for function components that accept JSX props (required for `key` prop compatibility with `@react-three/drei`).
- Run `npx tsc --noEmit` before submitting — there should be **zero TypeScript errors**.

### Formatting
- No auto-formatter is configured. Match the style of the file you're editing:
  - 2-space indentation
  - Single quotes for strings
  - Semicolons at end of statements

### Tailwind CSS
- All DOM styling uses Tailwind CSS utility classes.
- No separate `.css` files for component styles.
- The `index.css` file contains only global base styles.

### Naming
- Components: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE` (e.g., `GRID_SIZE`, `TICK_RATE_MS`)
- TypeScript interfaces: `PascalCase` (e.g., `BuildingConfig`, `TileData`)
- TypeScript enums: `PascalCase` with `PascalCase` values (e.g., `BuildingType.Hovel`)

---

## Git Workflow

### Branches
- `main` — production-ready code
- `feature/your-feature-name` — new features
- `fix/your-fix-description` — bug fixes
- `docs/description` — documentation-only changes

### Commit messages
Follow conventional commits format:
```
type(scope): short description

feat(IsoMap): add wall visual connectivity
fix(App): prevent duplicate goal generation
docs(README): update setup instructions
chore(deps): bump @react-three/drei to 10.8.0
```

Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `perf`, `test`

### Pull Requests
- Target the `main` branch
- Include a description of what changed and why
- Link any related issues
- Ensure `npm run build` passes with zero warnings (excluding the known chunk size warning for IsoMap)
- Ensure `npx tsc --noEmit` exits with 0 errors

---

## Testing

**Note:** There is currently no automated test suite. Adding tests is on the roadmap (see `docs/ROADMAP.md`).

When adding new logic:
1. Test manually in the dev server
2. Test with and without a Gemini API key (verify fallbacks work)
3. Test save/load: place buildings, wait 6+ seconds, refresh, verify state restored

Key test cases to manually verify when changing `App.tsx`:
- Gold cannot go below the result of spending (gold deduction is applied correctly)
- Population respects the housing cap
- Season advances correctly after 10 days
- Water propagates correctly when placing moat adjacent to edge tiles

---

## Adding a New Building Type

1. Add the enum value to `BuildingType` in `types.ts`
2. Add a `BuildingConfig` entry to `BUILDINGS` in `constants.tsx`
3. Add the rendering case to `ProceduralBuilding` in `IsoMap.tsx`
4. Add to `civicTools` or `militaryTools` array in `UIOverlay.tsx`
5. Update `validAiBuildingTypes` in `geminiService.ts` if the AI should be able to request it
6. Update `docs/API.md` and `docs/PRD.md`

---

## Modifying the Simulation Loop

The main simulation runs in `App.tsx` in the `useEffect` at line ~194. Key considerations:
- Stats are read via `statsRef.current` and `gridRef.current` (not `stats`/`grid` directly) to avoid stale closures
- Use `setStats(prev => ...)` functional update form — never access the state variable directly in the closure
- `currentGoal` IS accessed directly (not via ref) in the closure — this means a goal change doesn't immediately reflect in the next tick. If changing goal logic, consider whether a ref is needed.

---

## Working with Gemini AI

The AI service is in `services/geminiService.ts`. All functions use:
- Structured JSON output (`responseSchema`)
- `try/catch` with fallback content

When adding a new AI feature:
1. Define a JSON schema using `Type` from `@google/genai`
2. Write a fallback function that returns the same shape
3. Always wrap the API call in `try/catch` and return the fallback on error
4. Test with `GEMINI_API_KEY` unset to verify the fallback activates

---

## API Key Security

**Never commit your API key.** `.env.local` is in `.gitignore`.

If you accidentally commit a key:
1. Revoke it immediately in Google AI Studio
2. Generate a new key
3. Use `git filter-branch` or BFG Repo Cleaner to remove it from history

---

## Documentation

The `docs/` directory contains the full documentation suite. When making changes:
- Update `README.md` if setup steps, scripts, or env vars change
- Update `docs/API.md` if component props or service functions change
- Update `docs/DATABASE.md` if the save data schema changes
- Update `docs/SECURITY.md` if new security considerations arise
- Update `CHANGELOG.md` under `[Unreleased]`

---

## Known Gotchas

1. **`React.FC<Props>` on components inside `<Instances>`:** Components that render `<Instance>` from @react-three/drei and are used inside `<Instances>` must be typed with `React.FC<Props>` (not inline destructuring). Otherwise TypeScript generates TS2322 errors about the `key` prop.

2. **Stale closure in simulation loop:** The simulation `useEffect` runs on `[gameStarted, currentGoal]`. If you add new state that the loop needs, add a ref to shadow it rather than adding it to the dependency array (which would restart the interval).

3. **IsoMap is lazy-loaded:** Changes to `IsoMap.tsx` won't cause a hot reload of `App.tsx`. The component is in a separate lazy chunk. If builds seem stale, hard-refresh with `Ctrl+Shift+R`.

4. **Water propagation is one-way:** `propagateWater` sets `isWet = true` but never unsets it. Removing a moat tile does not de-hydrate connected tiles. This is a known limitation.
