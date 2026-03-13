# Runbook — K-Dom

## Service Overview

| Property | Value |
|----------|-------|
| Service type | Static client-side SPA |
| Runtime | Browser (Chrome/Edge recommended) |
| Backend | None |
| Database | localStorage (browser-local) |
| External dependencies | Google Gemini API |
| Deployment target | Any static host (Netlify, Vercel, GitHub Pages, CDN) |

---

## Startup / Build

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Set API key (copy .env.example first)
cp .env.example .env.local
# Edit .env.local: GEMINI_API_KEY=your_key_here

# 3. Start dev server
npm run dev
# → App available at http://localhost:3000
```

### Production Build

```bash
# Build with API key injected
GEMINI_API_KEY=your_key npm run build
# Output in dist/

# Preview production build locally
npm run preview
```

---

## Health Checks

| Check | Method | Expected |
|-------|--------|---------|
| App loads | Open browser at host URL | Start screen renders |
| 3D map loads | Click "New Kingdom" | Isometric 3D map visible within 5 seconds |
| AI connected | Start new game with AI enabled | Quest appears in top-right panel within 5 seconds |
| Save working | Play for 6+ seconds, refresh page | "Continue Reign" button appears on start screen |

---

## Common Failure Modes

### App fails to load / blank screen

**Symptoms:** White or black screen after navigating to the app URL.

**Diagnosis:**
```
1. Open browser DevTools → Console
2. Look for errors:
   - "Could not find root element to mount to" → index.html missing #root
   - Module import errors → CDN or bundle loading failed
   - WebGL errors → Browser doesn't support WebGL 2
```

**Resolution:**
- Verify `dist/index.html` was deployed correctly
- Check that all JS/CSS files in `dist/assets/` are accessible
- Test in Chrome/Edge if WebGL issue is suspected
- Reload the page (clears transient import errors)

---

### 3D map shows loading spinner indefinitely

**Symptoms:** "Loading Realm..." spinner does not go away.

**Diagnosis:** The `IsoMap` lazy chunk (`IsoMap-*.js`) failed to load.

**Resolution:**
- Open DevTools → Network tab → look for failed requests to `IsoMap-*.js`
- Check static host is serving all files in `dist/assets/`
- Try hard refresh (`Ctrl+Shift+R`)

---

### AI Advisor not generating quests / "Awaiting orders..."

**Symptoms:** Quest panel shows "Awaiting orders..." permanently.

**Diagnosis:**
```
1. Check DevTools → Console for warnings like:
   "Advisor failed to generate goal (using fallback):"
2. Check Network tab for requests to generativelanguage.googleapis.com
3. If no network requests: API key was not set at build time
4. If 403 error: API key is invalid or revoked
5. If 429 error: Quota exceeded
```

**Resolution:**
- Verify `GEMINI_API_KEY` was set before running `npm run build`
- Verify the key in Google AI Studio is active
- If fallback content is acceptable: the game continues with pre-written goals automatically
- Rebuild with a valid key: `GEMINI_API_KEY=new_key npm run build`

**Note:** The fallback goals activate automatically. The game is fully playable without AI.

---

### Save data corrupted / "Failed to load save"

**Symptoms:** `console.error("Failed to load save", e)` in DevTools console; start screen shows no "Continue Reign" button despite previous play.

**Diagnosis:**
```
1. DevTools → Application → Local Storage → [origin] → kingdom_builder_save_v1
2. Try to parse the value manually: JSON.parse(value)
```

**Resolution:**
```javascript
// Clear corrupted save (run in DevTools console)
localStorage.removeItem('kingdom_builder_save_v1');
// Page refresh will show a fresh New Kingdom screen
```

---

### Performance: low framerate / stuttering

**Symptoms:** 3D rendering is choppy; game simulation appears slow.

**Diagnosis:**
- DevTools → Performance tab → record 5 seconds
- Check if Three.js render loop (`requestAnimationFrame`) is taking >16ms

**Resolution:**
- Close other GPU-intensive browser tabs
- Ensure hardware acceleration is enabled in browser settings
- For development: set `dpr` to `[1, 1]` in `IsoMap.tsx:916` (currently `[1, 1.5]`) to reduce render resolution
- The N8AO post-processing effect is the most expensive; set `halfRes` (already enabled by default)

---

### Unit AI system freezing or units disappearing

**Symptoms:** Units stop moving; unit count drops unexpectedly.

**Diagnosis:** Check browser console for JavaScript errors. The UnitSystem uses `useRef` for the authoritative unit list; errors in `useFrame` can silently break the loop.

**Resolution:**
- Reload the page (unit state is not persisted)
- If reproducible, open an issue with steps to reproduce

---

## Environment Variable Reference

| Variable | Required | Build-time | Description |
|----------|----------|-----------|-------------|
| `GEMINI_API_KEY` | No (fallbacks exist) | Yes | Google Gemini API key |

**How it's injected (Vite):**
```typescript
// vite.config.ts
define: {
    'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
}
```
Both `process.env.API_KEY` and `process.env.GEMINI_API_KEY` are set to the same value.

---

## Data Operations

### Export save data
```javascript
// DevTools console
console.log(localStorage.getItem('kingdom_builder_save_v1'));
// Copy the output to save externally
```

### Import save data
```javascript
// DevTools console
localStorage.setItem('kingdom_builder_save_v1', '{"version":1,...}');
// Refresh the page
```

### Reset to new game
```javascript
// DevTools console
localStorage.removeItem('kingdom_builder_save_v1');
// Refresh the page
```

---

## Deployment Procedures

### Netlify
1. Connect repository to Netlify
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Environment variables: Add `GEMINI_API_KEY` in Netlify dashboard → Site settings → Environment variables
5. Trigger redeploy after changing the key

### Vercel
1. Import repository to Vercel
2. Framework preset: Vite
3. Add `GEMINI_API_KEY` in Vercel dashboard → Project settings → Environment variables
4. Redeploy to pick up key changes

### GitHub Pages
1. Build locally: `GEMINI_API_KEY=your_key npm run build`
2. Push `dist/` contents to `gh-pages` branch
3. ⚠️ **Warning:** The key is baked into the published bundle — anyone can inspect it

---

## Monitoring and Alerting

There is no monitoring infrastructure. The app has no telemetry, no error reporting service, and no uptime monitoring.

**Manual checks:**
- Visit the app URL in an incognito window monthly to verify it loads
- Check Google AI Studio dashboard for API quota usage
- `npm audit` periodically to check for new vulnerability disclosures

---

## Incident Severity Levels

| Level | Example | Response |
|-------|---------|---------|
| P1 — App down | Blank screen for all users | Rebuild and redeploy immediately |
| P2 — AI broken | Quests not generating | Verify API key; fallback content activates automatically |
| P3 — Degraded | Low FPS on some browsers | Investigate in next development cycle |
| P4 — Cosmetic | Wrong color on a building | Log and fix in next release |

---

## Secrets Rotation

### Rotating the Gemini API key
1. Create a new API key in Google AI Studio
2. Revoke the old key
3. Update `GEMINI_API_KEY` in your hosting provider's environment variables
4. Trigger a production redeploy (required — key is embedded at build time)
5. Verify AI features work after deploy
