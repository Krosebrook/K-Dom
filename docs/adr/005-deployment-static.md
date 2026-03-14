# ADR 005 — Deployment: Static Site (Client-Only)

**Status:** Accepted  
**Date:** Reconstructed from audit of commit bdf6062  
**References:** `vite.config.ts`, `package.json scripts`

---

## Context

The game needs to be accessible via a public URL. Deployment options range from full-stack (server + frontend) to pure static file hosting.

---

## Decision

Deploy as a **pure static site** from the `dist/` output of `vite build`. No backend server. The Gemini API key is embedded in the bundle at build time.

---

## Consequences

### Positive
- Zero server costs — CDN/static hosting is typically free (Netlify, Vercel, GitHub Pages)
- Instant global distribution via CDN
- No server maintenance, no uptime concerns
- Can be deployed anywhere that serves static files

### Negative
- Gemini API key is baked into the bundle at build time — visible to any user (see SECURITY FINDING-01)
- Redeployment required to change any environment variable
- No server-side computation possible

### Risks
- If a serverless proxy is added in the future (ROADMAP T1-5), this ADR will need to be superseded

---

## Alternatives Considered

| Alternative | Reason not chosen |
|------------|------------------|
| Next.js with server routes | Adds complexity; the only backend need is the API key proxy |
| Express server | Significant operational overhead for a solo project |
| Cloudflare Workers | Valid option for API key proxy — see ROADMAP T1-5 |
