# ADR 002 — Persistence: localStorage Only

**Status:** Accepted  
**Date:** Reconstructed from audit of commit bdf6062  
**References:** `App.tsx:108-148`, `constants.tsx:25` (`SAVE_KEY`), `types.ts:SaveData`

---

## Context

The game needs to persist player progress between browser sessions. Options range from fully local storage to a remote database.

---

## Decision

Use **browser localStorage** as the sole persistence layer. Save key: `kingdom_builder_save_v1`. Auto-save every 5 seconds. No backend, no user accounts.

---

## Consequences

### Positive
- Zero infrastructure cost — no server, no database
- Instant reads/writes (synchronous API)
- No authentication required
- Fully private — data never leaves the user's device

### Negative
- Progress is not portable across devices or browsers
- localStorage is browser-local — clearing browser data loses the save
- ~5–10 MB storage limit (current save is ~70 KB, well within limits)
- No save backup/export feature in UI

### Risks
- Browser storage can be cleared by the user, browser updates, or OS cleanup tools
- Schema versioning is minimal (version field exists but no migration logic)

---

## Alternatives Considered

| Alternative | Reason not chosen |
|------------|------------------|
| IndexedDB | More complex API; localStorage is sufficient for this data size |
| Supabase / Firebase | Requires user accounts; over-engineered for a local demo game |
| sessionStorage | Data lost on tab close — unusable for game saves |
| URL state | 70 KB of grid state would make an unusable URL |
