# ADR 001 — Framework Selection: React + Vite

**Status:** Accepted  
**Date:** Reconstructed from audit of commit bdf6062  
**References:** `package.json`, `index.tsx`, `vite.config.ts`

---

## Context

A browser-based kingdom-building game needs a framework that can:
- Render a dynamic HUD (stats, news, toolbars) over a 3D canvas
- Manage complex interconnected game state (grid, stats, AI state)
- Hot-reload during development
- Produce a fast static bundle deployable without a server

---

## Decision

Use **React 19** for UI state management and component composition, with **Vite 6** as the build tool.

---

## Consequences

### Positive
- React's `useState`/`useEffect`/`useCallback` cover all game state management needs
- Vite provides instant HMR (Hot Module Replacement) during development
- React's JSX works cleanly with @react-three/fiber's declarative 3D API
- `React.lazy()` enables code-splitting the large IsoMap chunk
- Strong TypeScript support in both React 19 and Vite 6

### Negative
- React 19 is a major release with some breaking changes from React 18 (e.g., removed `key` from component prop auto-injection, changing how some JSX typing works)
- Bundle includes React runtime (~130 KB gzipped)

### Risks
- React 19 is relatively new — some third-party library compatibility issues possible

---

## Alternatives Considered

| Alternative | Reason not chosen |
|------------|------------------|
| Vue 3 + Vite | @react-three/fiber ecosystem specifically targets React |
| Svelte | Less mature @react-three/fiber compatibility |
| Vanilla JS | Complex game state would require a custom framework; high maintenance |
| Next.js | No server-side rendering needed; unnecessary complexity for a client game |
