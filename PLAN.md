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
- [x] Vercel deployment with Serverless Functions
- [x] Environment variable management (`.env`, `.env.example`)
- [x] 98 tests across 10 test files (Vitest 4)

### Server-Side Orchestration (PR #3, #1)
- [x] DB-persisted agents, messages, sessions, findings, report sections (migration `003_server_orchestration.sql`)
- [x] `api/iterate.js` — server-side agent iteration via `generateText()` (Node.js runtime)
- [x] `api/orchestrate.js` — pg_cron dispatcher, claims + iterates agents server-side
- [x] `api/respond-input.js` — human input submission for server-side agents
- [x] Shared modules: `api/_lib/parseResponse.js`, `api/_lib/agentQueries.js`, `api/_lib/spawnLogic.js`
- [x] Role-based prompts in `api/_config/prompts.js`
- [x] `claim_agent_for_iteration` RPC with `FOR UPDATE SKIP LOCKED` for safe concurrency
- [x] Supabase Realtime subscriptions in agentStore + missionReportStore (agents, events, report_sections)
- [x] Mission resume: `resumeSession(sessionId)` loads from DB, subscribes to Realtime
- [x] Synthesis enrichment: agent objectives + search findings injected for richer output
- [x] On-demand pg_cron: `enable_orchestration()` / `disable_orchestration()` (migration `005_on_demand_scheduling.sql`)
- [x] Dual-mode orchestrationService: client-side (browser) or server-side (default when Supabase configured)

### Auth, History & Security Fixes (PR #2)
- [x] Auth race condition fix — `initialized` flag + `waitForAuth()` in authStore
- [x] MissionHistory waits for auth before fetching sessions
- [x] Session creation ensures `user_id` via auth-subscribe fallback
- [x] Database indexes on `sessions(user_id)` and `sessions(user_id, started_at DESC)`
- [x] 9 RLS policies tightened to prevent cross-user data leaks (migration `004_tighten_rls.sql`)
- [x] ProtectedRoute component for authenticated routes

### Credits Hardening (PR #4)
- [x] Credit deduction on both client (agent-stream.js onFinish) and server (iterate.js after generateText)
- [x] Hardened billing with 402 responses on insufficient credits
- [x] Credit balance polling + transaction logging

### Output Overhaul (PR #3, #1)
- [x] Enriched report data model with report_sections table
- [x] Redesigned MissionReport UI with tabs (Report/Artifacts/Raw Findings)
- [x] Report sub-components: `FindingCard.jsx`, `SourceList.jsx`, `TimelineView.jsx`
- [x] Intervention panel: `InterventionPanel.jsx`, `QuickActions.jsx`
- [x] Timeline components: `PulseBar.jsx`, `TimelineTooltip.jsx`

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
                    (dual-mode: client|server)               ↓
                        ↓       ↓       ↓           Agent tree preview → Launch
                  RequestQueue  AgentStore  FindingsRegistry
                     ↓          (Zustand +    (per-session)
                     ↓           Realtime)
         ┌───────────┴───────────────┐
   CLIENT-SIDE                 SERVER-SIDE (default)
   /api/agent-stream           pg_cron → /api/orchestrate.js
   (SSE + tools)                  ↓
         ↓                    /api/iterate.js (generateText)
   OpenRouter → Kimi K2           ↓
         ↓                    OpenRouter → Kimi K2
   ContextCompressor               ↓
   (every 3 iterations)      Supabase DB (agents, messages, findings, report_sections)
         ↓                        ↓
   MissionReportStore ←── Realtime subscriptions (INSERT/UPDATE)
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
│   ├── report/
│   │   ├── FindingCard.jsx         # Individual finding display
│   │   ├── SourceList.jsx          # Source references list
│   │   └── TimelineView.jsx        # Timeline visualization
│   ├── intervention/
│   │   ├── InterventionPanel.jsx   # Human input panel
│   │   └── QuickActions.jsx        # Quick action buttons
│   ├── timeline/
│   │   ├── PulseBar.jsx            # Activity pulse indicator
│   │   └── TimelineTooltip.jsx     # Timeline hover tooltip
│   ├── PresetSelector.jsx          # Research mission picker
│   ├── CustomMissionInput.jsx      # Custom objective → AI-planned agent tree
│   ├── MissionReport.jsx           # Consolidated output panel
│   ├── MissionHistory.jsx          # Past mission list + resume
│   ├── BetaWelcome.jsx             # First-login welcome modal
│   ├── ConfirmDialog.jsx           # Destructive action confirmation
│   ├── CreditBalance.jsx           # Header credit display
│   ├── ProtectedRoute.jsx          # Auth-gated route wrapper
│   └── ThemeToggle.jsx             # Dark/light mode
│
├── services/
│   ├── orchestrationService.js     # Core engine (dual-mode: client/server)
│   ├── findingsRegistry.js         # Inter-agent shared findings store
│   ├── requestQueue.js             # Priority queue for concurrent LLM calls
│   ├── contextCompressor.js        # Rolling context summaries
│   ├── streamParser.js             # Robust JSON extraction from streams
│   ├── mockAgentService.js         # Fake agent simulator
│   ├── presetService.js            # 5 research-focused presets
│   └── missionHistoryService.js    # Supabase mission CRUD
│
├── stores/
│   ├── agentStore.js               # Agents, events, dataTransfers + Realtime subscriptions
│   ├── missionReportStore.js       # Report sections + Realtime subscriptions
│   ├── authStore.js                # Supabase auth state + initialized flag
│   ├── creditStore.js              # Credit balance + transactions
│   └── themeStore.js               # Dark/light mode
│
├── lib/
│   └── supabase.js                 # Supabase client init
│
└── utils/
    ├── colorScheme.js              # Role/status color mapping
    ├── orbStyles.js                # Orb gradient/glow/pulse utilities
    ├── eventVisuals.js             # Event type visual config
    ├── forceLayoutEngine.js        # D3 force simulation
    ├── layoutEngine.js             # Layout calculation utilities
    ├── missionUtils.js             # Tree flatten/count helpers
    └── renderMarkdown.jsx          # Lightweight markdown renderer

api/
├── agent.js                        # Non-streaming Serverless Function (LLM proxy)
├── agent-stream.js                 # Streaming Serverless Function (AI SDK + tools)
├── iterate.js                      # Server-side agent iteration (generateText, Node.js)
├── orchestrate.js                  # pg_cron dispatcher (claim + iterate agents)
├── plan-mission.js                 # Mission planner (streaming)
├── respond-input.js                # Human input for server-side agents
├── search.js                       # Modular web search (Serper/Brave/Tavily)
├── credits.js                      # Credit balance + transactions API
├── _lib/
│   ├── agentQueries.js             # Shared Supabase agent queries
│   ├── parseResponse.js            # Shared response parsing
│   └── spawnLogic.js               # Shared canSpawn() logic
├── _config/
│   ├── prompts.js                  # Role-based system prompts
│   ├── pricing.js                  # Model + search pricing
│   └── cors.js                     # CORS configuration
└── _middleware/
    ├── auth.js                     # Request authentication
    └── credits.js                  # Credit check + deduction

supabase/
└── migrations/
    ├── 001_credits_and_promos.sql      # Credits, transactions, promo codes
    ├── 002_beta_auto_credits.sql       # Auto-grant $10 to new users
    ├── 003_server_orchestration.sql    # Agents, messages, sessions, findings, report_sections, RPC functions
    ├── 003_sessions_user_id_index.sql  # Index on sessions(user_id)
    ├── 004_tighten_rls.sql             # Tightened RLS policies (gitignored: contains secrets)
    ├── 004_background_scheduling.sql   # Background scheduling setup
    └── 005_on_demand_scheduling.sql    # On-demand pg_cron (gitignored: contains secrets)
```

---

## Known Gaps & Technical Debt

1. **Search credit deduction not wired** — `SEARCH_PRICING` defined but not yet deducted from user balance per search query
2. **No observability** — No tracing of LLM calls, token usage, latency, costs
3. **CORS wildcard on API routes** — All API routes use `*` CORS; set `ALLOWED_ORIGIN` env var to restrict in production
4. **Not yet tested end-to-end in production** — Server-side orchestration code is deployed but no mission has been run in server-side mode yet
5. **Vercel Hobby limits** — Fluid Compute (300s) is Pro-only; Hobby caps at 60s for Node.js functions
6. **`user_id IS NULL` window** — Sessions created before auth resolves may have null user_id; mitigated via auth-subscribe fallback but not fully eliminated
7. **Dynamic pricing not wired** — `model_pricing` table exists and is seeded but JS code uses hardcoded constants; could query table on a TTL cache
8. **Per-isolate rate limiting** — current rate limiter is per-edge-isolate (best effort); strict enforcement needs Vercel KV or Upstash Redis as shared counter

---

## Roadmap

### Phase 3: Foundation Hardening ✓ (Complete)
- [x] Request queue with priority + rate limiting
- [x] Context compression (rolling summaries)
- [x] Streaming responses via AI SDK
- [x] Event importance classification
- [x] Custom mission input with AI planner
- [x] Supabase as source of truth (Realtime subscriptions)

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

### Server-Side Orchestration ✓ (Complete)
- [x] Server-side orchestration — missions survive tab close (pg_cron + iterate.js)
- [x] DB persistence for agents, messages, findings, report sections
- [x] Realtime subscriptions for live UI updates
- [x] On-demand pg_cron scheduling (start/stop with missions)
- [x] Mission resume from DB state
- [x] Synthesis enrichment with agent objectives + findings
- [x] Auth race condition fix + RLS hardening (9 policies)
- [x] Credits hardening for production billing
- [x] Output overhaul — enriched report model + redesigned UI

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
- [ ] Template marketplace

### Pre-Launch Checklist (Supabase/Vercel config, not code)
- [ ] Enable "Confirm email" in Supabase Auth — prevents beta credit farming with disposable emails
- [ ] Enable CAPTCHA on signup (hCaptcha or Turnstile) — blocks bot signups
- [ ] Set `ALLOWED_ORIGIN` env var in Vercel — restricts CORS from wildcard to app domain
- [ ] Set up Vercel log drain / alert for `[billing]` tags — failed deductions logged as `[billing] Deduction FAILED — needs reconciliation`

### Phase 7: Production Hardening
- [ ] End-to-end production testing of server-side mode
- [ ] Observability (Langfuse integration)
- [ ] Per-session spending caps — max spend per mission (e.g., $2) to prevent runaway agent loops
- [ ] Daily spending alerts — notify users when >50% balance spent in a day
- [ ] Multi-step token awareness — `maxSteps: 3` can consume ~6k output tokens; consider per-call cost cap
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
| Database | Supabase (auth, persistence, credits, Realtime) |
| API | Vercel Serverless Functions |
| LLM | OpenRouter → Kimi K2 |
| AI SDK | Vercel AI SDK (`ai`, `@openrouter/ai-sdk-provider`) |
| Tools | AI SDK `tool()` with Zod schemas |
| Web Search | Serper (default), Brave, Tavily |
| Scheduling | pg_cron + pg_net (on-demand) |
| Validation | Zod 3 |
| Testing | Vitest 4 (98 tests) |

### Planned Additions
| Technology | Purpose | Phase |
|-----------|---------|-------|
| Langfuse | LLM observability and tracing | 7 |
| MCP | Standard tool/resource integration | 7 |

---

## Environment Variables

```
# Required
OPENROUTER_API_KEY=...           # OpenRouter API key (server-side)

# Supabase (required for auth/credits/server-side orchestration)
VITE_SUPABASE_URL=...            # Client-side Supabase URL
VITE_SUPABASE_ANON_KEY=...       # Client-side anon key
SUPABASE_URL=...                 # Server-side Supabase URL
SUPABASE_SERVICE_KEY=...         # Server-side service key

# Server-side orchestration
ORCHESTRATE_SECRET=...           # Shared secret for pg_cron → orchestrate.js auth

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
