# ADR 003 — AI Integration: Google Gemini (`gemini-3-flash-preview`)

**Status:** Accepted  
**Date:** Reconstructed from audit of commit bdf6062  
**References:** `services/geminiService.ts:10`, `package.json` (`@google/genai`)

---

## Context

The game's "Royal Advisor" feature requires an LLM to:
- Generate contextual quests given current kingdom stats
- Write medieval-style town crier news headlines
- Create dynamic random events with decision choices
- Respond to free-form player questions in character

The model needs structured JSON output capability for schema-constrained generation.

---

## Decision

Use **Google Gemini** via `@google/genai` SDK. Model: `gemini-3-flash-preview`. API key injected at build time via Vite's `define` config.

---

## Consequences

### Positive
- `gemini-3-flash-preview` supports `responseSchema` with JSON mode — critical for structured goal/event generation
- `@google/genai` SDK provides clean TypeScript bindings
- Fallback content means game is playable without a key
- Google AI Studio provides free-tier quota

### Negative
- API key is embedded in the client bundle — visible to any user via DevTools
- Model ID `gemini-3-flash-preview` is hardcoded — if deprecated, all AI calls fail silently
- No streaming for chat — responses load as single blocks
- Caller has no control over latency — Gemini API response time varies

### Risks
- Model deprecation risk (tracked in ROADMAP T1-1)
- API key exposure risk (tracked in SECURITY FINDING-01 and ROADMAP T1-5)
- Rate limiting from Gemini API could degrade experience during rapid play

---

## Alternatives Considered

| Alternative | Reason not chosen |
|------------|------------------|
| OpenAI GPT-4o | Higher cost; project appears tied to Google AI Studio |
| Anthropic Claude | No evidence of evaluation; similar tradeoffs |
| Local LLM (WebLLM) | Very large bundle; latency too high for game loop |
| Pre-written content only | Removes the dynamic AI experience that is core to the product |
