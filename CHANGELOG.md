# Changelog — K-Dom

All notable changes to this project are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## [Unreleased]

### Fixed
- TypeScript errors in `components/IsoMap.tsx` — changed `UnitBody`, `UnitHead`, and `UnitHPBar` component definitions to use `React.FC<Props>` type annotations to resolve TS2322 errors caused by `@react-three/drei` v10 Instances children type constraints

### Added
- `docs/` documentation suite: ARCHITECTURE.md, API.md, PRD.md, ROADMAP.md, RUNBOOK.md, DATABASE.md, SECURITY.md, AUDIT-REPORT.md, DEAD-CODE-TRIAGE.md, CONTRIBUTING.md
- `docs/adr/` Architecture Decision Records: framework selection, database/persistence strategy, AI model, rendering engine, deployment strategy
- `.env.example` with documented environment variable descriptions
- `README.md` fully rewritten with setup instructions, tech stack, architecture overview, and known issues

---

## [0.2.0] — 2026-03-13 (bdf6062)

### Added
- **Unit AI system** (`IsoMap.tsx`) — autonomous peasants, soldiers, officers, and enemy raiders
  - Officers recruit soldiers into squads (max 4) with wedge formation
  - Officers detect enemies within 8-tile sight range; patrol otherwise
  - Enemies spawn at grid edges every 10 seconds; attack units and buildings
  - Combat system: 1 attack per second; officers 25 HP, soldiers 15 HP, enemies 10 HP
  - Building destruction: 10% chance per hit when enemy attacks a building
- **Unit spawning from buildings** — soldiers/officers spawn near Barracks; peasants near Keep
- **Dynamic unit state sync** — new conscripts and promoted officers appear as entities in the 3D world
- **HP bar overlays** — damaged units display a `<Html>` HP bar in the 3D scene
- `onBuildingDestroyed` callback passed from `IsoMap` to `App` — enemy building destruction removes the tile from the grid

---

## [0.1.0] — Initial Release (grafted root)

### Added
- React 19 SPA with Vite build tooling and TypeScript
- Isometric 3D map rendered with Three.js + @react-three/fiber
- 34×34 tile grid with 12 building types across Civic and Military categories
- Two-second simulation loop: gold income, population growth, defense, happiness, season
- Seasonal effects: farm income modifiers, texture changes, happiness penalties in Winter
- Day/night cycle: sun position animation, ambient lighting transitions
- Procedural terrain height variation using sine waves
- Procedural nature: instanced trees and rocks on empty tiles
- Post-processing: N8AO ambient occlusion, TiltShift depth-of-field, AGX tone mapping
- Moat water system: BFS propagation to connect adjacent moat/drawbridge tiles
- Spring-physics drawbridge animation
- Building upgrade system: 5 building types upgradeable up to unlimited levels (cost scales with level)
- Building rotation (R key + UI button)
- Google Gemini AI integration:
  - Quest generation with JSON schema and fallback goals
  - Town crier news feed (every 45 seconds)
  - Random decision events (every ~60 seconds)
  - Advisor chat overlay
- 4 advisor personas: The Steward, The Warlord, The Merchant, The Architect
- localStorage auto-save (every 5 seconds) and load
- Military management: conscript subjects → soldiers, promote soldiers → officers
- Tile inspector panel: upgrade, gate toggle, lock toggle, moat fill controls
- Floating text feedback for gold costs, upgrades, destroyed buildings
- Responsive HUD with Tailwind CSS
- StartScreen with AI toggle and persona selection

---

## Notes on Git History

This changelog was reconstructed from a shallow clone. The full commit history may include additional intermediate commits not reflected here. Only 2 commits were visible: the initial feature commit (`bdf6062`) and the documentation/audit commit (`42b5bda`).
