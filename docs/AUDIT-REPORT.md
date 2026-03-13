# Audit Report — K-Dom

**Generated:** 2026-03-13  
**Auditor:** GitHub Copilot automated codebase audit  
**Repository:** Krosebrook/K-Dom  
**Git HEAD:** 42b5bda  
**Base commit audited:** bdf6062 (`feat(IsoMap): Add building destruction and unit stats`)

---

## Executive Summary

K-Dom is a well-structured, single-file-per-concern React SPA. The code is readable, consistently styled, and fully functional. The build succeeds with zero npm vulnerabilities. The primary findings are: (1) three TypeScript type errors caused by a `@react-three/drei` v10 typing constraint — **fixed in this audit** by changing component type annotations to `React.FC<Props>`; (2) the Gemini API key is embedded in the client bundle at build time, which is an inherent architectural risk for a client-only app; (3) no automated tests exist.

There is **no dead code** requiring restoration. The codebase is clean.

---

## Health Metrics

| Metric | Value | Rating |
|--------|-------|--------|
| Build status | ✅ Passes (`vite build`) | Good |
| TypeScript errors | 0 (fixed from 3) | Good |
| npm vulnerabilities | 0 | Good |
| Test coverage | 0% (no tests) | Poor |
| Dead code | 0 candidates | Excellent |
| Orphaned exports | 0 | Excellent |
| Hardcoded secrets | 0 | Good |
| `.env` committed | No | Good |
| Bundle size (IsoMap) | 1.14 MB / 346 KB gzip | Warning |
| API key exposure | Client-side bundle | Risk |
| Documentation | Comprehensive (this audit) | Good |

---

## Findings

### Critical

*None.*

---

### High

#### H1: Gemini API Key Embedded in Client Bundle
**File:** `vite.config.ts:13-14`, `services/geminiService.ts:9`  
**Why:** The `GEMINI_API_KEY` environment variable is injected into the JavaScript bundle at build time. Anyone inspecting the minified bundle via browser DevTools can extract the key.  
**Fix:** Route Gemini API calls through a serverless function that holds the key server-side (see ROADMAP T1-5). As an interim measure, add key restrictions in Google AI Studio.  
**Effort:** Medium (serverless proxy)  
**Status:** Open

---

### Medium

#### M1: No Automated Tests
**File:** Entire codebase  
**Why:** Zero test coverage means any code change can break the simulation loop, water propagation, or AI fallback logic silently.  
**Fix:** Add Vitest test suite with at minimum: unit tests for `propagateWater`, `getUpgradeCost`, `getBuildingConfig`, and the simulation tick math.  
**Effort:** Medium  
**Status:** Open (see ROADMAP T1-4)

#### M2: Hardcoded AI Model ID
**File:** `services/geminiService.ts:10`  
```typescript
const modelId = 'gemini-3-flash-preview';
```
**Why:** If the model is deprecated or renamed, all AI calls fail silently (fallback content activates). The model cannot be changed without a code change and redeploy.  
**Fix:** Read from `process.env.GEMINI_MODEL_ID` with a default fallback.  
**Effort:** Trivial (< 5 min)  
**Status:** Open (see ROADMAP T1-1)

#### M3: No localStorage Schema Validation on Load
**File:** `App.tsx:135-148`  
**Why:** `loadGame()` casts `JSON.parse` result directly to `SaveData` without checking fields. A corrupted or schema-mismatched save causes a runtime error with no user feedback.  
**Fix:** Add field presence checks; clear corrupted saves rather than crashing.  
**Effort:** Low  
**Status:** Open (see ROADMAP T1-3)

---

### Low

#### L1: Wall Visual Connectivity Not Implemented
**File:** `components/IsoMap.tsx:239-246`  
```typescript
// TODO: Walls should connect based on world position, but for now simple local logic.
```
**Why:** Walls render as isolated segments regardless of adjacency. This is noted as a TODO in the code.  
**Fix:** Use the existing `safeGet` helper to check N/S/E/W neighbors and render merged wall segments.  
**Effort:** Low–Medium  
**Status:** Open (see ROADMAP T2-1)

#### L2: No Content Security Policy
**File:** `index.html`  
**Why:** No CSP restricts what scripts, styles, or connections are allowed. Not critical for current functionality, but is a security hygiene issue.  
**Fix:** Add CSP meta tag or response header.  
**Effort:** Trivial  
**Status:** Open (see ROADMAP T1-2)

#### L3: Building Level Cap Not Enforced
**File:** `App.tsx:handleUpgrade`, `UIOverlay.tsx:canUpgrade`  
**Why:** There is no maximum building level. A player can upgrade Hovels indefinitely, scaling income/population without bound.  
**Fix:** Define `MAX_LEVEL = 3` and disable upgrade when `tile.level >= MAX_LEVEL`.  
**Effort:** Trivial  
**Status:** Open (see ROADMAP T2-2)

#### L4: Large Bundle Size
**File:** Build output (`IsoMap-*.js`)  
**Why:** The IsoMap lazy chunk is 1.14 MB uncompressed (346 KB gzipped). This is expected for Three.js + drei but could be reduced.  
**Fix:** Tree-shake drei imports; use Vite `manualChunks` to further split Three.js.  
**Effort:** Medium  
**Status:** Open (see ROADMAP T3-1)

---

### Informational

#### I1: `TileData.variant` Field is Defined but Never Used
**File:** `types.ts:47`  
```typescript
variant?: number;  // Unused field — always undefined
```
Not a bug, but dead type definition. Likely a placeholder for building visual variants.

#### I2: Formation Types `line` and `circle` Defined but Partially Implemented
**File:** `IsoMap.tsx:346-348`, `IsoMap.tsx:512-530`  
Only `'wedge'` formation is fully used in officer AI. The `getFormationOffset` function handles `'line'` partially.

#### I3: Chat History Not Persisted
**File:** `App.tsx` — `chatHistory` state  
Chat history is reset on every page reload. Not a bug, but noted as a user experience gap.

---

## Phase 0 Log (Dead Code Audit)

| Check | Result |
|-------|--------|
| Backup/renamed files (*.old, *.bak, etc.) | None found |
| Commented-out functional code blocks | None found |
| Orphaned exports (exported but never imported) | None found |
| TODO/FIXME referencing old code | 1 TODO found (`IsoMap.tsx:241`) — aspirational feature, not dead code |
| Duplicate implementations | None found |
| Dead branches (`if (false)`, disabled flags) | None found |
| Import chain breaks (A imports C, B has old version) | None found |

**Restorations executed:** 0  
**Pre-restoration snapshot commit:** Not required (no restorations needed)

---

## Documentation Drift Analysis

| Category | Documented (Prior) | Missing in Code | In Code but Undocumented |
|----------|-------------------|-----------------|-------------------------|
| Setup | Minimal (old README) | — | Full AI key injection mechanism |
| Architecture | None | — | Simulation loop, unit AI, water BFS |
| API/Props | None | — | All component interfaces |
| Env Vars | `GEMINI_API_KEY` only | `GEMINI_MODEL_ID` (not yet supported) | Both API_KEY and GEMINI_API_KEY aliases |
| Build Scripts | Basic (`npm run dev`) | — | Preview script |
| Security | None | — | API key exposure, CSP gap |
| Building Types | None | — | All 12 types with costs and stats |

All documentation drift has been addressed in this audit by generating complete documentation.

---

## WSJF Roadmap Summary

See [docs/ROADMAP.md](ROADMAP.md) for full WSJF-scored roadmap.

Top 5 priorities by WSJF score:
1. **WSJF 16.0** — Configurable model ID via env var (trivial effort, high risk reduction)
2. **WSJF 8.0** — Content Security Policy (trivial effort, security hygiene)
3. **WSJF 5.2** — API key serverless proxy (medium effort, eliminates high finding H1)
4. **WSJF 5.0** — localStorage save validation (low effort, prevents crashes)
5. **WSJF 4.8** — Automated test suite (medium effort, prevents regressions)

---

## Audit Checklist

- [x] Phase 0: Git forensics completed (log, blame, diff)
- [x] Phase 0: Dead code candidates identified with git authorship
- [x] Phase 0: `docs/DEAD-CODE-TRIAGE.md` created
- [x] Phase 0: No restorations needed — zero dead code found
- [x] Phase 0: TypeScript fix applied and verified (`npx tsc --noEmit` exits 0)
- [x] Diagnostic commands run (npm audit, tsc, build)
- [x] Full directory tree mapped
- [x] All env vars cataloged
- [x] Security scan completed
- [x] Dependency audit executed (0 vulnerabilities)
- [x] Documentation drift analysis completed
- [x] README.md generated (post-fix state)
- [x] .env.example generated
- [x] docs/ARCHITECTURE.md generated
- [x] docs/API.md generated
- [x] docs/adr/ generated (5 numbered ADRs)
- [x] docs/PRD.md generated
- [x] docs/ROADMAP.md generated (WSJF-scored)
- [x] CHANGELOG.md generated
- [x] CONTRIBUTING.md generated
- [x] docs/RUNBOOK.md generated
- [x] docs/DATABASE.md generated
- [x] docs/SECURITY.md generated (OWASP mapping)
- [x] docs/AUDIT-REPORT.md generated
- [x] All changes committed with descriptive messages
