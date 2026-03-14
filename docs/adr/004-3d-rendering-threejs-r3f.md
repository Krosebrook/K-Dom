# ADR 004 — 3D Rendering: Three.js + @react-three/fiber

**Status:** Accepted  
**Date:** Reconstructed from audit of commit bdf6062  
**References:** `components/IsoMap.tsx`, `package.json`

---

## Context

The game requires an isometric 3D view with:
- Procedurally generated geometry (no external assets)
- Animated units with per-frame position updates
- Post-processing effects (ambient occlusion, depth of field, tone mapping)
- Instanced rendering for performance (trees, rocks, units)
- Reactive to React state (grid, season, time of day)

---

## Decision

Use **Three.js 0.173** via **@react-three/fiber 9** (r3f) for the 3D canvas, with **@react-three/drei 10** for helpers (Instances, MapControls, Html, Sky, Stars, etc.) and **@react-three/postprocessing 3** for effects.

---

## Consequences

### Positive
- r3f integrates Three.js into React's component tree — scene graph is declarative JSX
- `useFrame` hook provides clean per-frame animation without manual requestAnimationFrame
- `@react-three/drei` provides many ready-made components (sky, stars, clouds, map controls, instanced meshes, HTML overlays)
- Three.js has excellent browser WebGL 2 support

### Negative
- Large bundle: IsoMap chunk is 1.14 MB uncompressed (346 KB gzipped)
- @react-three/drei v10 has stricter TypeScript constraints for Instances children (caused the 3 TS errors found in the audit)
- `three-custom-shader-material` required for custom cel-shading shader
- WebGL 2 required — older browsers not supported

### Risks
- @react-three/fiber v9 + @react-three/drei v10 compatibility matrix — different major versions need careful management
- Three.js geometry/material instances are created per component and not always disposed — potential memory leak on remount

---

## Alternatives Considered

| Alternative | Reason not chosen |
|------------|------------------|
| Babylon.js | Separate ecosystem from drei/r3f; React integration less mature |
| PlayCanvas | Requires their editor; less React-native |
| 2D canvas (Pixi.js) | Cannot achieve the 3D isometric look without a 3D engine |
| CSS transforms (isometric illusion) | Not suitable for the procedural geometry and shadows needed |
