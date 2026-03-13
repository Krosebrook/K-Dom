# API Reference — K-Dom

K-Dom has no HTTP API of its own. This document covers:
1. The **Gemini AI service layer** (`services/geminiService.ts`) — all external API calls
2. The **component props interfaces** — the internal API surface between React components

---

## Gemini AI Service (`services/geminiService.ts`)

**Base model:** `gemini-3-flash-preview`  
**Auth:** `process.env.API_KEY` (injected at build time from `GEMINI_API_KEY` env var)  
**Client:** `@google/genai` v1.44.0

All functions use structured JSON output via `responseMimeType: "application/json"` and a `responseSchema`. All functions have fallbacks.

---

### `generateKingdomGoal(stats, grid, persona)`

Generates a new AI quest for the player.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `stats` | `KingdomStats` | Current kingdom statistics |
| `grid` | `Grid` | Full 34×34 tile grid (used to count buildings) |
| `persona` | `AdvisorPersona` | Advisor persona — biases the goal type |

**Returns:** `Promise<AIGoal | null>`

**Response schema:**
```json
{
  "description": "string — medieval quest description",
  "targetType": "subjects | gold | building_count | defense | soldiers",
  "targetValue": "integer",
  "buildingType": "string (optional) — required if targetType is building_count",
  "reward": "integer — gold reward"
}
```

**Fallback:** Returns one of 5 pre-written goals if API fails or quota exceeded.

**Trigger:** Called when game starts with AI enabled, and on quest completion (reward claimed).

---

### `generateGameEvent(stats)`

Generates a random medieval event requiring a decision.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `stats` | `KingdomStats` | Current kingdom statistics |

**Returns:** `Promise<GameEvent | null>`

**Response schema:**
```json
{
  "title": "string",
  "description": "string",
  "optionA": "string — choice A label",
  "optionB": "string — choice B label",
  "costA": "integer — gold cost for option A",
  "costB": "integer — gold cost for option B"
}
```

**Fallback:** Returns `null`. The event system skips rendering if null is returned.

**Trigger:** ~30% probability check every 60 seconds, only if no active event.

---

### `generateTownCrierEvent(stats)`

Generates a short news headline for the news feed.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `stats` | `KingdomStats` | Current kingdom statistics |

**Returns:** `Promise<NewsItem | null>`

**Response schema:**
```json
{
  "text": "string — headline, max 10 words",
  "type": "positive | negative | neutral"
}
```

**Fallback:** Returns one of 5 pre-written news items.

**Trigger:** Every 45 seconds while game is active and AI is enabled.

---

### `chatWithAdvisor(history, stats, persona)`

Sends a conversation turn to the advisor and returns a response.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `history` | `ChatMessage[]` | Full chat history (only last 5 messages sent) |
| `stats` | `KingdomStats` | Current kingdom statistics (injected as context) |
| `persona` | `AdvisorPersona` | Advisor persona (sets role-play context) |

**Returns:** `Promise<string>`

**Response:** Free-form text, max 2 sentences, in medieval character voice.

**Fallback:** Returns "I am at a loss for words, sire." on API error, "The spirits disrupt my thoughts (API Error)." on exception.

**Trigger:** User submits message in the AdvisorChat overlay.

---

## Component Props Interfaces

### `App.tsx` (root component)

No external props. Internal state:

| State | Type | Description |
|-------|------|-------------|
| `gameStarted` | `boolean` | Whether the game is active |
| `aiEnabled` | `boolean` | Whether AI features are active |
| `persona` | `AdvisorPersona` | Selected advisor persona |
| `grid` | `Grid` (34×34) | Full tile grid |
| `stats` | `KingdomStats` | All kingdom metrics |
| `selectedTool` | `BuildingType` | Currently active building tool |
| `selectedTilePos` | `{x,y} \| null` | Currently inspected tile |
| `currentGoal` | `AIGoal \| null` | Active quest |
| `isGeneratingGoal` | `boolean` | Debounce flag for goal fetch |
| `newsFeed` | `NewsItem[]` | Last 13 news items |
| `previewRotation` | `0\|1\|2\|3` | Building rotation state |
| `timeOfDay` | `number` (0–1) | Drives day/night cycle |
| `activeEvent` | `GameEvent \| null` | Currently displayed event |
| `chatOpen` | `boolean` | Chat overlay visibility |
| `chatHistory` | `ChatMessage[]` | Advisor conversation history |
| `chatLoading` | `boolean` | Chat API in-flight flag |
| `floatingTexts` | `FloatingText[]` | Active floating feedback texts |

---

### `IsoMap` Props

```typescript
interface IsoMapProps {
  grid: Grid;                            // 34×34 tile grid
  stats: KingdomStats;                   // Kingdom stats (for unit spawning)
  onTileClick: (x: number, y: number) => void;
  hoveredTool: BuildingType;             // Active tool (for hover preview color)
  previewRotation: number;               // Rotation preview (0–3)
  timeOfDay: number;                     // 0–1 day cycle
  season: Season;                        // Current season (affects textures)
  floatingTexts: FloatingText[];         // Animated gold/feedback overlays
  onBuildingDestroyed: (x: number, y: number) => void; // Enemy destroyed building
}
```

---

### `UIOverlay` Props

```typescript
interface UIOverlayProps {
  stats: KingdomStats;
  selectedTool: BuildingType;
  onSelectTool: (type: BuildingType) => void;
  currentGoal: AIGoal | null;
  newsFeed: NewsItem[];
  onClaimReward: () => void;
  isGeneratingGoal: boolean;
  aiEnabled: boolean;
  advisorPersona: AdvisorPersona;
  onConscript: () => void;               // Convert 1 subject → soldier for 50g
  onPromote: () => void;                 // Convert 1 soldier → officer for 100g
  selectedTile: TileData | null;         // Tile inspector target
  onToggleGate: () => void;             // Toggle Gatehouse/Drawbridge open/close
  onToggleLock: () => void;             // Toggle Gatehouse/Drawbridge lock
  onFillMoat: () => void;              // Trigger water BFS propagation
  onRotate: () => void;                 // Increment rotation 0→1→2→3→0
  rotation: number;                     // Current rotation (0–3)
  onUpgrade: () => void;               // Upgrade selected building
  onChatOpen: () => void;              // Open advisor chat overlay
}
```

---

### `StartScreen` Props

```typescript
interface StartScreenProps {
  onStart: (aiEnabled: boolean, persona: AdvisorPersona) => void;
  hasSave: boolean;
  onContinue: () => void;
}
```

---

### `EventModal` Props

```typescript
interface EventModalProps {
  event: GameEvent;
  onChoice: (choiceIndex: number) => void;  // 0 = optionA, 1 = optionB
}
```

---

### `AdvisorChat` Props

```typescript
interface AdvisorChatProps {
  history: ChatMessage[];
  onSend: (msg: string) => void;
  isLoading: boolean;
  onClose: () => void;
  persona: AdvisorPersona;
}
```

---

## Core Data Types

See `types.ts` for full definitions. Key types:

### `BuildingType` (enum)
`None | Path | Hovel | Market | Farm | Keep | Barracks | Wall | Gatehouse | Tower | Moat | Drawbridge`

### `KingdomStats`
```typescript
{
  gold: number;
  subjects: number;
  soldiers: number;
  officers: number;
  day: number;
  defense: number;
  happiness: number;   // 0–100
  season: Season;
}
```

### `TileData`
```typescript
{
  x: number;
  y: number;
  buildingType: BuildingType;
  variant?: number;
  rotation?: number;    // 0–3 (×90°)
  isOpen?: boolean;     // Gatehouse/Drawbridge open state
  isLocked?: boolean;   // Gatehouse/Drawbridge lock state
  isWet?: boolean;      // Moat hydration state
  level: number;        // 1–3 building level
}
```

### `AIGoal`
```typescript
{
  description: string;
  targetType: 'subjects' | 'gold' | 'building_count' | 'defense' | 'soldiers';
  targetValue: number;
  buildingType?: BuildingType;
  reward: number;
  completed: boolean;
}
```
