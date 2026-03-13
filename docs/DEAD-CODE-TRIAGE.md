# Dead Code Triage Report

Generated: 2026-03-13  
Workspace: K-Dom (Medieval Realm Simulator)  
Git HEAD: 42b5bda

---

## Summary

- **Total candidates:** 1
- **By type:** Commented-out [0] | Renamed [0] | Orphaned [0] | Duplicate [0] | Dead branch [0] | Broken import [0] | Type Error [1]
- **By recommendation:** RESTORE [0] | KEEP_CURRENT [1] | MERGE [0] | NEEDS_DECISION [0]
- **By git authorship:** Human-written dead code replaced by AI [0] | AI-written dead code [0] | Unknown [0]

**Verdict: No dead code found requiring restoration.**

The codebase is clean of commented-out functional code, orphaned exports, renamed/backup files, or broken import chains. The only actionable finding is three TypeScript type errors in `components/IsoMap.tsx` related to `@react-three/drei` Instances children typing in v10.

---

## Discovery Commands Run

```bash
# Backup files
find . -type f \( -name "*.old" -o -name "*.bak" -o -name "*.backup" -o -name "*.orig" -o -name "*.deprecated" -o -name "*_old.*" -o -name "*_backup.*" -o -name "*_v1.*" -o -name "*_prev.*" -o -name "*.unused" \) -not -path "*/node_modules/*" -not -path "*/.git/*"
# Result: NONE FOUND

# Commented-out code blocks
grep -rn "^[[:space:]]*//" --include="*.ts" --include="*.tsx" . | grep -v node_modules
# Result: Only explanatory/structural section comments found, no commented-out logic

# TODOs referencing old code
grep -rn "TODO\|FIXME\|was working\|old version\|revert\|restore\|broken by" --include="*.ts" --include="*.tsx" . | grep -v node_modules
# Result: components/IsoMap.tsx:241: // TODO: Walls should connect based on world position (aspirational, not dead code)

# Orphaned exports
# All exported functions from geminiService.ts are consumed in App.tsx
# All exported components are imported by App.tsx
# BUILDINGS constant is imported by UIOverlay.tsx, geminiService.ts
# All types from types.ts are imported
# Result: No orphaned exports found
```

---

## Triage Table

| # | File | Lines | Type | Dead Author | Replace Author | Recommendation | Risk |
|---|------|-------|------|-------------|----------------|----------------|------|
| 1 | `components/IsoMap.tsx` | 757, 765, 770 | Type Error (not dead code) | N/A | N/A | KEEP_CURRENT + FIX_TYPES | Low |

---

## Detailed Entries

### `components/IsoMap.tsx` : Lines 757, 765, 770

**Type:** TypeScript type error (not dead code — this is actively running code)  
**What it does:** Renders animated unit bodies, heads, and HP bars inside `@react-three/drei`'s `<Instances>` component. The `UnitBody`, `UnitHead`, and `UnitHPBar` components return `<Instance>` elements and are passed as children of `<Instances>` with a `key` prop.  
**Git author (dead code):** N/A — this code is active  
**Git author (replacement):** N/A  
**Last active commit:** bdf6062 (`feat(IsoMap): Add building destruction and unit stats`)  
**Current replacement:** N/A  
**Replacement working?** YES — build succeeds with `vite build`; only `tsc --noEmit` fails  
**Tests affected:** None (no tests in this project)  

**TypeScript Error Details:**
```
components/IsoMap.tsx(757,31): error TS2322: Type '{ key: string; unit: any; index: any; }' is not assignable to type '{ unit: Unit; index: number; }'.
  Property 'key' does not exist on type '{ unit: Unit; index: number; }'.
components/IsoMap.tsx(765,31): error TS2322: (same issue for UnitHead)
components/IsoMap.tsx(770,28): error TS2322: (same issue for UnitHPBar)
```

**Root Cause:** `@react-three/drei` v10's `Instances` component constrains its children types in a way that causes TypeScript excess-property checking to reject JSX elements with a `key` prop when the component's own prop interface does not declare `key`. React normally handles `key` as a special prop outside the component's props, but drei's Instances children typing exposes this gap.

**Recommendation:** KEEP_CURRENT — the runtime behavior is correct. Fix the TypeScript errors by annotating the callback parameters explicitly in the `.map()` calls to prevent type inference degradation.

**Fix:**  
In `components/IsoMap.tsx`, explicitly type the `.map()` callback parameters:

```tsx
// Line 756-758 (UnitBody)
{unitsState.map((u: Unit, i: number) => (
    <UnitBody key={`body-${u.id}`} unit={u} index={i} />
))}

// Line 763-765 (UnitHead)
{unitsState.map((u: Unit, i: number) => (
    <UnitHead key={`head-${u.id}`} unit={u} index={i} />
))}

// Line 769-771 (UnitHPBar)
{unitsState.map((u: Unit) => (
    <UnitHPBar key={`hp-${u.id}`} unit={u} />
))}
```

---

## Git Forensics

```bash
git log --oneline -30
# 698b98e (HEAD) Initial plan
# bdf6062 (grafted) feat(IsoMap): Add building destruction and unit stats

# Only 2 commits visible (shallow clone — full history not available)
# No evidence of prior AI sessions removing or replacing code
# No backup/deprecated files in any directory
```

**Conclusion:** The git history is shallow (grafted clone with only 2 commits). No evidence of AI-assisted regressions, dead code injections, or broken import chains. The codebase appears to have been written consistently in a single session. The only finding is the drei v10 TypeScript typing issue, which is a code quality concern rather than dead code.

---

**STATUS: No restorations needed. Proceeding to Phase 1 (full audit) automatically.**
