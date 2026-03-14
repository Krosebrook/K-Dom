# Security — K-Dom

## Overview

K-Dom is a fully client-side browser application. There is no backend, no server, no database, and no user accounts. The primary security concern is the exposure of the Google Gemini API key in the client bundle.

**Vulnerability audit date:** 2026-03-13  
**npm audit result:** `found 0 vulnerabilities` (224 packages audited)

---

## OWASP Top 10 Mapping

| # | Category | Status | Evidence | Finding |
|---|----------|--------|----------|---------|
| A01 | Broken Access Control | ✅ N/A | No user accounts, no server, no protected resources | Not applicable |
| A02 | Cryptographic Failures | ⚠️ LOW | API key embedded in client bundle | See API Key Exposure below |
| A03 | Injection | ✅ SAFE | No SQL, no shell commands; Gemini inputs are kingdom stats (numbers/enums) | No injection vectors found |
| A04 | Insecure Design | ⚠️ LOW | API key architecture exposes key to anyone with browser DevTools | See API Key Exposure |
| A05 | Security Misconfiguration | ✅ N/A | No server to misconfigure | Not applicable |
| A06 | Vulnerable Components | ✅ CLEAN | `npm audit` reports 0 vulnerabilities | No known CVEs in dependencies |
| A07 | Authentication Failures | ✅ N/A | No authentication | Not applicable |
| A08 | Software Integrity Failures | ✅ LOW | Package lock file present; `npm audit` clean | `package-lock.json` tracks integrity |
| A09 | Security Logging/Monitoring | ℹ️ NONE | `console.warn` on API failures only; no logging infrastructure | Acceptable for a client game |
| A10 | SSRF | ✅ N/A | No server-side requests | Not applicable |

---

## Findings

### FINDING-01: Gemini API Key Embedded in Client Bundle
**Severity:** Low–Medium  
**File:** `vite.config.ts:13-14`, `services/geminiService.ts:9`  
**Details:**  
The `GEMINI_API_KEY` environment variable is injected into the JavaScript bundle at build time by Vite:
```typescript
// vite.config.ts
define: {
    'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
},
```
Anyone who inspects the minified JavaScript bundle (via browser DevTools → Sources) can extract the API key. This is an inherent consequence of the current architecture (no backend proxy).

**Risk:** The API key can be used to make Gemini API calls at the owner's expense.

**Remediation options (not yet implemented):**
1. **Serverless proxy** — Route Gemini calls through a serverless function (Vercel/Netlify function) that holds the key server-side. The client calls your proxy, never Gemini directly.
2. **API key restrictions** — In Google AI Studio, restrict the key to specific referrer domains and set usage quotas.
3. **Accept the risk** — For a demo/personal project, the risk may be acceptable if the key has quota limits set.

---

### FINDING-02: No Content Security Policy (CSP)
**Severity:** Low  
**File:** `index.html`  
**Details:** No `Content-Security-Policy` header or meta tag is configured. This is not critical for a static app with no user-generated content.

**Remediation:** Add a CSP meta tag restricting scripts to `'self'` and the Gemini API origin:
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src https://generativelanguage.googleapis.com; script-src 'self' 'unsafe-inline';">
```

---

### FINDING-03: Hardcoded Model ID
**Severity:** Informational  
**File:** `services/geminiService.ts:10`  
```typescript
const modelId = 'gemini-3-flash-preview';
```
If this model is deprecated, all AI calls will fail silently (fallback content activates). No secrets are exposed, but availability may be impacted.

---

## Secrets Audit

```bash
# Scan for hardcoded secrets
grep -rn "sk-\|sk_live\|sk_test\|AKIA\|password\s*=\s*['\"]" --include="*.ts" --include="*.tsx" . | grep -v node_modules
# Result: No hardcoded secrets found

# Check for committed .env files
git ls-files | grep -i "\.env$"
# Result: No .env files committed
```

**Result:** No hardcoded secrets found. No `.env` files committed to version control.

---

## Input Validation

| Input Source | Validated? | Notes |
|-------------|-----------|-------|
| Tile click (x, y) | ✅ Yes | Bounds checked via grid array access |
| Building type from UI | ✅ Yes | Only `BuildingType` enum values used |
| Gemini API responses | ✅ Partial | `responseSchema` enforces JSON structure; sanity check for `building_count` type |
| localStorage save data | ✅ Partial | Parsed with `JSON.parse` in try/catch; no schema validation on load |
| Chat input from user | ✅ Input trimmed | Sent directly to Gemini (no HTML encoding needed for API call) |

**No XSS vectors found:** User input is sent to Gemini as plain text, not rendered as HTML. The chat UI uses React's safe text rendering.

---

## Dependency Audit

```
npm audit result (2026-03-13):
found 0 vulnerabilities
224 packages audited
```

Notable deprecated packages (informational only, no CVEs):
- `node-domexception@1.0.0` — deprecated (indirect dependency)
- `glob@10.5.0` — old version (indirect dependency)

---

## CORS Configuration

Not applicable. K-Dom makes no same-origin API calls. The Gemini API client (`@google/genai`) handles its own CORS via the API key in the request.

---

## Rate Limiting

No rate limiting is implemented on the client side beyond:
- A `isGeneratingGoal` debounce flag that prevents concurrent goal generation calls
- Fixed intervals (45s for news, 60s for events) using `setInterval`

If a user rapidly claims quest rewards, multiple `generateKingdomGoal` calls could be made in quick succession. This is bounded by the Gemini API's own rate limits.

---

## Auth Flow Security Review

Not applicable — no authentication system exists.

---

## Recommendations (Priority Order)

| Priority | Action | Effort |
|----------|--------|--------|
| High | Add API key domain restrictions in Google AI Studio | Low (config change) |
| High | Add usage quotas in Google AI Studio | Low (config change) |
| Medium | Proxy Gemini API through serverless function | Medium (new backend) |
| Low | Add Content Security Policy headers | Low (config change) |
| Low | Add JSON schema validation on localStorage load | Low (code change) |
