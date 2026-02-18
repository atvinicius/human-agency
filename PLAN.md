# Human Agency - Development Plan

## Vision

A visual "Mission Control" interface where humans direct swarms of AI agents. Instead of chat, it's a living map that grows as agents spawn, work, and complete tasks. The **Sovereign Operator** directs millions of agents — we're building the orchestration layer that makes this possible.

---

## What's Been Built (Shipped)

### Landing & Brand
- [x] Landing page with manifesto (Zero-Cost Axiom, Ratio Crisis, Sovereign Operator, What We're Building)
- [x] "See How It Works" CTA linking to `/demo`
- [x] Waitlist email capture
- [x] Dark/light theme toggle with smooth CSS transitions
- [x] Framer Motion animations (staggered fade-ins)
- [x] Spectral (serif) + Inter (sans-serif) typography

### Agent Map & Visualization
- [x] D3-based force-directed agent map with pan/zoom (`AgentMap.jsx`)
- [x] Luminous orb agent visuals with role-tinted gradients, glow, pulse (`AgentOrb.jsx`)
- [x] Organic sinusoidal edges with animated flow particles (`OrganicEdge.jsx`)
- [x] Directional data flow particles with type-specific colors (findings/context/synthesis/search)
- [x] Search ring indicator on agent orbs during web search
- [x] Ripple layer, annotation layer, ambient glow layer
- [x] Zoom/pan/fit-to-view controls (`MapControls.jsx`)
- [x] Inline intervention for agents needing input (`InlineIntervention.jsx`)
- [x] Detail overlay on close zoom (`OrbDetailOverlay.jsx`)

### Interaction & Control
- [x] Pause/Resume — individual and global
- [x] Click-to-select with agent detail panel
- [x] Human intervention panel when agent needs input
- [x] Activity stream with importance-based filtering and search events (`ActivityStream.jsx`)
- [x] Confirmation dialogs before destructive actions while mission running (`ConfirmDialog.jsx`)
- [x] Mission history — view past runs, re-launch (`MissionHistory.jsx`)

### Real AI Integration
- [x] Vercel Edge Function API layer (`api/agent.js`, `api/agent-stream.js`) — keeps API keys server-side
- [x] OpenRouter integration using Kimi K2 model
- [x] Orchestration engine with 10-iteration execution loop, spawn limits, collaboration (`orchestrationService.js`)
- [x] Role-based system prompts (coordinator, researcher, executor, validator, synthesizer)
- [x] Structured JSON response parsing with robust multi-step extraction (`streamParser.js`)
- [x] Web search tool for researchers/coordinators via AI SDK `tool()` + `maxSteps: 3` (`api/search.js`)
- [x] Modular search providers: Serper (default), Brave, Tavily
- [x] Mock agent simulator as fallback (`mockAgentService.js`)

### Inter-Agent Collaboration
- [x] FindingsRegistry — per-session shared store for findings and completions (`findingsRegistry.js`)
- [x] Parent-to-child context passing (parent objective + findings injected on spawn)
- [x] Child-to-parent completion reporting (new completions injected into parent prompts)
- [x] Sibling awareness every 3rd iteration (prevent duplication)
- [x] Data transfer events for visualization (context, findings, synthesis, search_result)

### Smart Spawning
- [x] MissionBudget: maxTotalAgents=25, maxDepth=4, maxSpawnsPerAgent=3, softCap=20
- [x] `canSpawn()` gate checks all limits before allowing spawn
- [x] Convergence pressure via system prompt when near limits
- [x] Plan-mission limited to 5-15 agents

### Consolidated Output
- [x] MissionReport panel — slide-out drawer with tabs (Report/Artifacts/Raw Findings) (`MissionReport.jsx`)
- [x] Auto-synthesis on mission completion via LLM call with fallback to concatenation
- [x] Copy to clipboard and download as markdown
- [x] Lightweight markdown renderer (`renderMarkdown.jsx`)
- [x] "View Output" button with live section count badge

### Demo System
- [x] 5 research-focused presets: Longevity Equation, Critical Minerals Chess Match, Deepfake Reckoning, Abyss Catalog, Machine Consciousness Problem
- [x] Pre-launch briefing with editable objective and agent team preview
- [x] Custom mission input — AI plans agent tree from free-text objective
- [x] Category filter hidden when all presets share one category

### Auth, Credits & Beta
- [x] Supabase auth (magic link + email/password)
- [x] Credits system with real API cost mapping (Kimi K2 pricing)
- [x] Credit balance display in header
- [x] Credit check before every LLM call (402 response on insufficient)
- [x] "amigos" promo code → $10 credits
- [x] Beta auto-credit: $10 granted to every new user via DB trigger (`002_beta_auto_credits.sql`)
- [x] Beta welcome modal on first login (`BetaWelcome.jsx`)
- [x] Promo code field de-emphasized behind "Have a promo code?" toggle

### Infrastructure
- [x] React 19 + Vite 7 + Tailwind CSS 4
- [x] React Router DOM for `/`, `/demo`, `/login` routes
- [x] Zustand state management (agentStore, missionReportStore, authStore, creditStore, themeStore)
- [x] Supabase (auth, persistence, credits)
- [x] Vercel deployment with Edge Functions
- [x] Environment variable management (`.env`, `.env.example`)
- [x] 95 tests across 10 test files (Vitest 4)

### Research & Strategy (docs/)
- [x] Architecture analysis with gap identification and evolution roadmap
- [x] Competitive landscape analysis ($5.4B → $47-52B market, 30+ competitors mapped)
- [x] Technology catalog with adoption recommendations

---

## Current Architecture

```
User → Landing.jsx → /demo → Demo.jsx → PresetSelector / CustomMissionInput
                                ↓                            ↓
                      OrchestrationService          /api/plan-mission (streaming)
                        ↓       ↓       ↓                   ↓
                  RequestQueue  AgentStore  FindingsRegistry  Agent tree preview → Launch
                     ↓          (Zustand)    (per-session)
              /api/agent-stream (SSE + tools)
                     ↓               ↓
              OpenRouter → Kimi K2   webSearch tool (Serper/Brave/Tavily)
                     ↓
             ContextCompressor (every 3 iterations)
                     ↓
             MissionReportStore ← auto-synthesis on completion
                     ↓
          AgentMap (D3) + ActivityStream + MissionReport panel
```

### Directory Structure

```
src/
├── pages/
│   ├── Landing.jsx                 # Homepage + manifesto + waitlist
│   ├── Demo.jsx                    # Orchestration demo interface
│   └── Login.jsx                   # Auth (magic link + password)
│
├── components/
│   ├── map/
│   │   ├── AgentMap.jsx            # D3 SVG with pan/zoom + data flow wiring
│   │   ├── AgentOrb.jsx            # Luminous orb with search ring
│   │   ├── OrganicEdge.jsx         # Edges with directional flow particles
│   │   ├── RippleLayer.jsx         # Event ripple animations
│   │   ├── AnnotationLayer.jsx     # Labels and annotations
│   │   ├── AmbientLayer.jsx        # Background glow
│   │   ├── InlineIntervention.jsx  # Input UI on agent orb
│   │   ├── OrbDetailOverlay.jsx    # Close-zoom detail view
│   │   └── MapControls.jsx         # Zoom/fit controls
│   ├── stream/
│   │   └── ActivityStream.jsx      # Event feed with search events
│   ├── PresetSelector.jsx          # Research mission picker
│   ├── CustomMissionInput.jsx      # Custom objective → AI-planned agent tree
│   ├── MissionReport.jsx           # Consolidated output panel
│   ├── MissionHistory.jsx          # Past mission list + re-launch
│   ├── BetaWelcome.jsx             # First-login welcome modal
│   ├── ConfirmDialog.jsx           # Destructive action confirmation
│   ├── CreditBalance.jsx           # Header credit display
│   └── ThemeToggle.jsx             # Dark/light mode
│
├── services/
│   ├── orchestrationService.js     # Core engine + spawn limits + collaboration + report
│   ├── findingsRegistry.js         # Inter-agent shared findings store
│   ├── requestQueue.js             # Priority queue for concurrent LLM calls
│   ├── contextCompressor.js        # Rolling context summaries
│   ├── streamParser.js             # Robust JSON extraction from streams
│   ├── mockAgentService.js         # Fake agent simulator
│   ├── presetService.js            # 5 research-focused presets
│   └── missionHistoryService.js    # Supabase mission CRUD
│
├── stores/
│   ├── agentStore.js               # Agents, events, dataTransfers, filters
│   ├── missionReportStore.js       # Consolidated output state
│   ├── authStore.js                # Supabase auth state
│   ├── creditStore.js              # Credit balance + transactions
│   └── themeStore.js               # Dark/light mode
│
├── lib/
│   └── supabase.js                 # Supabase client init
│
└── utils/
    ├── colorScheme.js              # Role/status color mapping
    ├── orbStyles.js                # Orb gradient/glow/pulse utilities
    ├── forceLayoutEngine.js        # D3 force simulation
    ├── missionUtils.js             # Tree flatten/count helpers
    └── renderMarkdown.jsx          # Lightweight markdown renderer

api/
├── agent.js                        # Non-streaming Edge Function (LLM proxy)
├── agent-stream.js                 # Streaming Edge Function (AI SDK + tools)
├── plan-mission.js                 # Mission planner (streaming)
├── search.js                       # Modular web search (Serper/Brave/Tavily)
├── _middleware/
│   ├── auth.js                     # Request authentication
│   └── credits.js                  # Credit check + deduction
└── _config/
    └── pricing.js                  # Model + search pricing

supabase/
└── migrations/
    ├── 001_credits_and_promos.sql  # Credits, transactions, promo codes
    └── 002_beta_auto_credits.sql   # Auto-grant $10 to new users
```

---

## Known Gaps & Technical Debt

1. **Search credit deduction not wired** — `SEARCH_PRICING` defined but not yet deducted from user balance per search query
2. **Supabase not source of truth** — Zustand is still runtime state; no Realtime subscriptions for sync
3. **No observability** — No tracing of LLM calls, token usage, latency, costs
4. **Client-side orchestration** — Execution engine runs in browser; missions die if tab closes (background execution only survives navigation within the app)

---

## Roadmap

### Phase 3: Foundation Hardening ✓ (Complete)
- [x] Request queue with priority + rate limiting
- [x] Context compression (rolling summaries)
- [x] Streaming responses via AI SDK
- [x] Event importance classification
- [x] Custom mission input with AI planner
- [ ] Supabase as source of truth (Realtime subscriptions)

### Safety, Credits & Research Overhaul ✓ (Complete)
- [x] Confirmation dialogs for destructive actions
- [x] Mission history persistence + review + re-launch
- [x] Background workflow execution
- [x] Credits system with real API cost mapping
- [x] Promo codes + beta auto-credit ($10 for new users)
- [x] 5 research-focused presets
- [x] Smart spawn limits (25 max, depth 4, convergence pressure)
- [x] Inter-agent collaboration (FindingsRegistry)
- [x] Web search for agents (Serper/Brave/Tavily)
- [x] Consolidated MissionReport panel with auto-synthesis
- [x] Data flow visualization (directional particles, search rings)

### Phase 4: Advanced Agent Cohesion
- [ ] Agent messaging bus — real-time pub/sub for discovery sharing
- [ ] Role-based context injection — coordinator sees all, executor sees relevant
- [ ] Handoff patterns — structured agent-to-agent delegation
- [ ] Decision log — track choices across agents to prevent contradictions

### Phase 5: Information Surfacing
- [ ] Multi-level information hierarchy (summary → insights → activity → raw logs)
- [ ] Progressive disclosure (default to summary, drill into detail)
- [ ] LLM-based importance scoring of outputs
- [ ] Proactive surfacing of items needing operator attention

### Phase 6: Scale & Polish
- [ ] Auto-grouping (>5 siblings → aggregate view)
- [ ] Mini-map navigation for large agent trees
- [ ] Virtual rendering for 100+ agents
- [ ] Session persistence (resume after reload)
- [ ] Template marketplace

### Phase 7: Production Hardening
- [ ] Server-side orchestration (missions survive tab close completely)
- [ ] Observability (Langfuse integration)
- [ ] MCP integration for standardized tool access
- [ ] Distributed workers for horizontal scaling
- [ ] Learning system — successful patterns captured and reused

---

## Tech Stack

### Current
| Layer | Technology |
|-------|-----------|
| Framework | React 19, Vite 7 |
| Styling | Tailwind CSS 4, Framer Motion |
| State | Zustand 5 |
| Visualization | D3 (force, zoom, selection) |
| Routing | React Router DOM 7 |
| Icons | Lucide React |
| Database | Supabase (auth, persistence, credits) |
| API | Vercel Edge Functions |
| LLM | OpenRouter → Kimi K2 |
| Streaming | Vercel AI SDK (`ai`, `@openrouter/ai-sdk-provider`) |
| Tools | AI SDK `tool()` with Zod schemas |
| Web Search | Serper (default), Brave, Tavily |
| Validation | Zod 3 |
| Testing | Vitest 4 (95 tests) |

### Planned Additions
| Technology | Purpose | Phase |
|-----------|---------|-------|
| Supabase Realtime | State sync across devices | 3 (remainder) |
| Langfuse | LLM observability and tracing | 7 |
| MCP | Standard tool/resource integration | 7 |

---

## Environment Variables

```
# Required
OPENROUTER_API_KEY=...           # OpenRouter API key (server-side)

# Supabase (required for auth/credits)
VITE_SUPABASE_URL=...            # Client-side Supabase URL
VITE_SUPABASE_ANON_KEY=...       # Client-side anon key
SUPABASE_URL=...                 # Server-side Supabase URL
SUPABASE_SERVICE_KEY=...         # Server-side service key

# Web Search (optional — agents work without it, just no search tool)
SERPER_API_KEY=...               # Serper.dev API key (2500 free/month)

# Optional overrides
SEARCH_PROVIDER=serper           # serper | brave | tavily
BRAVE_SEARCH_API_KEY=...         # If using Brave
TAVILY_API_KEY=...               # If using Tavily
```

---

## Reference Documents

- `MANIFESTO.md` — Product thesis and brand positioning
- `docs/architecture-analysis-llm-coordination.md` — Technical gap analysis and evolution roadmap
- `docs/market-research-competitive-landscape.md` — Competitive landscape and strategic positioning
- `docs/research-technologies-and-inspirations.md` — Technology catalog and adoption recommendations
