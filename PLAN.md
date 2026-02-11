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
- [x] D3-based hierarchical agent map with pan/zoom (`AgentMap.jsx`)
- [x] Color-coded agent nodes by role and status (`AgentNode.jsx`)
- [x] Parent-child connection edges (`AgentEdge.jsx`)
- [x] Zoom/pan/fit-to-view controls (`MapControls.jsx`)
- [x] Real-time re-layout as agents spawn (`layoutEngine.js`)
- [x] Role/status color mapping utility (`colorScheme.js`)

### Interaction & Control
- [x] Pause/Resume — individual and global (`QuickActions.jsx`, `agentStore.js`)
- [x] Click-to-select with agent detail panel (name, role, status, objective, progress, activity)
- [x] Human intervention panel when agent needs input (`InterventionPanel.jsx`)
- [x] Activity stream with chronological event log (`ActivityStream.jsx`)

### Real AI Integration
- [x] Vercel Edge Function API layer (`api/agent.js`) — keeps API keys server-side
- [x] OpenRouter integration using Kimi K2 model
- [x] Orchestration engine with 10-iteration agent execution loop (`orchestrationService.js`)
- [x] Role-based system prompts (coordinator, researcher, executor, validator, synthesizer)
- [x] Structured JSON response parsing with child agent spawn directives
- [x] Mock agent simulator as fallback (`mockAgentService.js`)

### Demo System
- [x] Preset scenario selector (`PresetSelector.jsx`, `presetService.js`)
- [x] Solo SaaS Builder (25 agents), Investment Due Diligence (15 agents), Content Empire
- [x] Staggered agent spawning for visual effect (500-1000ms between children)
- [x] Mission statistics (elapsed time, agent counts, progress, estimated completion)

### Infrastructure
- [x] React 19 + Vite 7 + Tailwind CSS 4
- [x] React Router DOM for `/` and `/demo` routes
- [x] Zustand state management (`agentStore.js`, `themeStore.js`)
- [x] Supabase client + optional persistence (`lib/supabase.js`)
- [x] Vercel deployment with Edge Functions (`vercel.json`)
- [x] Environment variable management (`.env`, `.env.example`)

### Research & Strategy (docs/)
- [x] Architecture analysis with gap identification and evolution roadmap
- [x] Competitive landscape analysis ($5.4B → $47-52B market, 30+ competitors mapped)
- [x] Technology catalog with adoption recommendations (Mem0, MCP, Vercel AI SDK, Langfuse)

### Phase 3: Foundation Hardening
- [x] Event importance classification — events tagged as critical/important/normal/debug (`agentStore.js`)
- [x] Activity stream visual hierarchy with importance-based styling and filter pills (`ActivityStream.jsx`)
- [x] Critical event count badge with pulse animation
- [x] Priority request queue with concurrency control (3 concurrent, priority-ordered) (`requestQueue.js`)
- [x] Rate limit handling (429 detection, automatic pause/retry)
- [x] Context compression — rolling summaries every 3 iterations with sliding window (`contextCompressor.js`)
- [x] Streaming responses via Vercel AI SDK + OpenRouter provider (`api/agent-stream.js`)
- [x] Client-side stream parser for AI SDK data protocol (`streamParser.js`)
- [x] Live "thinking" text display on agent nodes and detail panel during streaming
- [x] Custom mission input — users type objectives, AI plans agent tree (`CustomMissionInput.jsx`)
- [x] Mission planner Edge Function with streaming output (`api/plan-mission.js`)
- [x] Plan preview with agent tree visualization before launch

---

## Current Architecture

```
User → Landing.jsx → /demo → Demo.jsx → PresetSelector / CustomMissionInput
                                  ↓                            ↓
                        OrchestrationService          /api/plan-mission (streaming)
                          ↓          ↓                         ↓
                    RequestQueue  AgentStore          Agent tree preview → Launch
                       ↓          (Zustand)
                /api/agent-stream (SSE)
                       ↓
                OpenRouter → Kimi K2 (streaming)
                       ↓
               ContextCompressor (every 3 iterations)
                       ↓
                AgentMap (D3 viz) + ActivityStream (filtered by importance)
```

### Directory Structure

```
src/
├── pages/
│   ├── Landing.jsx                 # Homepage + manifesto + waitlist
│   └── Demo.jsx                    # Orchestration demo interface
│
├── components/
│   ├── map/
│   │   ├── AgentMap.jsx            # D3 canvas with pan/zoom
│   │   ├── AgentNode.jsx           # Agent visual nodes
│   │   ├── AgentEdge.jsx           # Parent-child edges
│   │   └── MapControls.jsx         # Zoom/fit controls
│   ├── intervention/
│   │   ├── InterventionPanel.jsx   # Human input panel
│   │   └── QuickActions.jsx        # Pause/Resume/Dive
│   ├── stream/
│   │   └── ActivityStream.jsx      # Event feed
│   ├── PresetSelector.jsx          # Demo scenario picker
│   ├── CustomMissionInput.jsx      # Custom objective → AI-planned agent tree
│   └── ThemeToggle.jsx             # Dark/light mode
│
├── services/
│   ├── orchestrationService.js     # Core execution engine (real AI + streaming)
│   ├── requestQueue.js             # Priority queue for concurrent LLM calls
│   ├── contextCompressor.js        # Rolling context summaries
│   ├── streamParser.js             # AI SDK data stream parser
│   ├── mockAgentService.js         # Fake agent simulator
│   └── presetService.js            # Demo scenario definitions
│
├── stores/
│   ├── agentStore.js               # Agents, events, filters, pause state
│   └── themeStore.js               # Dark/light mode
│
├── lib/
│   └── supabase.js                 # Supabase client init
│
└── utils/
    ├── colorScheme.js              # Role/status color mapping
    └── layoutEngine.js             # D3 hierarchical layout

api/
├── agent.js                        # Vercel Edge Function (LLM proxy, non-streaming)
├── agent-stream.js                 # Streaming Edge Function (AI SDK + SSE)
└── plan-mission.js                 # Mission planner Edge Function (streaming)

docs/
├── architecture-analysis-llm-coordination.md
├── market-research-competitive-landscape.md
└── research-technologies-and-inspirations.md
```

### Data Model

```
Agent {
  id, parentId, childIds[]
  role: coordinator | researcher | executor | validator | synthesizer
  status: spawning | working | waiting | paused | blocked | completed | failed
  priority: critical | high | normal | low | background
  progress: 0-100
  name, objective, currentActivity
  pendingInput?: HumanInputRequest
}
```

---

## Known Gaps

Identified through architecture analysis and real-world demo usage:

1. **Sequential execution** — Agents run one iteration at a time with fixed 2s delays. No parallel LLM calls, no adaptive pacing.
2. **No context compression** — Full message history is sent every iteration. A 10-iteration agent sends the same context 10 times, wasting tokens.
3. **Isolated agents** — No inter-agent communication. A researcher can't share findings with a sibling executor. Each agent is an island.
4. **Dual state without sync** — Zustand is the runtime source of truth, Supabase is optional persistence. No conflict resolution, no realtime subscriptions wired up.
5. **Agent-centric UI** — The interface shows *what agents are doing*, not *what matters*. No importance classification, no insight surfacing.
6. **No observability** — No tracing of LLM calls, token usage, latency, costs, or error rates.
7. **No streaming** — Responses arrive as complete blocks. No progressive output while agents think.

---

## Roadmap

### Phase 3: Foundation Hardening ✓

Focus: Make the existing demo reliable, efficient, and ready for real usage.

- [x] **Request queue with priority** — Priority queue (3 concurrent, 5 levels) with rate limit handling and adaptive retry. (`requestQueue.js`)
- [x] **Context compression** — Rolling summaries every 3 iterations with sliding window, LLM-based summarization with truncation fallback. (`contextCompressor.js`)
- [x] **Streaming responses** — AI SDK `streamText` via OpenRouter provider. New streaming Edge Function + client stream parser. Live "thinking" text on agent nodes. (`api/agent-stream.js`, `streamParser.js`)
- [x] **Event importance classification** — Deterministic classification (critical/important/normal/debug). Visual hierarchy in ActivityStream with filter pills and critical count badge. (`agentStore.js`, `ActivityStream.jsx`)
- [x] **Custom mission input** — Users type free-text objectives. AI planner decomposes into agent tree. Preview with tree visualization before launch. (`CustomMissionInput.jsx`, `api/plan-mission.js`)
- [ ] **Supabase as source of truth** — Wire up Realtime subscriptions. Zustand becomes a projection of server state. Optimistic updates with rollback on conflict.

### Phase 4: Agent Cohesion

Focus: Agents become a swarm, not a collection of isolated workers.

- [ ] **Shared context layer** — Facts Registry where agents publish discoveries. Decision Log for tracking choices made. Artifact Repository for outputs. Agents read from shared context before each iteration.
- [ ] **Agent messaging bus** — Lightweight pub/sub so agents can notify siblings and parents. A researcher surfaces a critical finding immediately, not at end of cycle.
- [ ] **Context injection** — Automatically inject relevant shared context into agent prompts based on role and objective. Coordinator sees everything; executor sees only what's relevant.
- [ ] **Handoff patterns** — Structured agent-to-agent task delegation (inspired by OpenAI Agents SDK handoff model).

### Phase 5: Information Surfacing

Focus: Shift from "watching agents work" to "seeing what matters."

- [ ] **Multi-level information hierarchy**
  - Level 1: Mission summary (one-line status, key metric)
  - Level 2: Key insights and decisions requiring attention
  - Level 3: Agent activity (current view)
  - Level 4: Raw logs and artifacts
- [ ] **Progressive disclosure** — Default to Level 1-2. Drill into Level 3-4 on demand.
- [ ] **Proactive surfacing** — System highlights when something needs operator attention (conflict between agents, unexpected finding, resource concern).
- [ ] **Importance scoring** — LLM-based classification of outputs by significance. High-importance items bubble to the top.

### Phase 6: Scale & Polish

Focus: Handle large agent trees and deliver a polished product experience.

- [ ] **Auto-grouping** — When >5 siblings share a role, collapse into aggregate view showing count and aggregate progress.
- [ ] **Mini-map navigation** — Overview of the full agent tree for quick navigation in large missions.
- [ ] **Priority surfacing (attention layer)** — Visual treatment: critical agents pulse, background agents fade. Operator's eye is drawn to what matters.
- [ ] **Performance optimization** — Virtual rendering for 100+ agent trees. Only render visible nodes.
- [ ] **Session persistence** — Resume a mission after page reload. Full state recovery from Supabase.
- [ ] **Template marketplace** — Share and discover preset mission templates.

### Phase 7: Production Hardening

Focus: From demo to real product.

- [ ] **Server-side orchestration** — Move execution engine to backend. Client becomes a pure viewer. Enables long-running missions that survive tab close.
- [ ] **Observability** — Integrate Langfuse or similar. Trace every LLM call, token usage, latency, cost. Dashboard for mission economics.
- [ ] **MCP integration** — Adopt Model Context Protocol for tool/resource integration. Agents can use external tools (web search, file access, APIs) through a standard interface.
- [ ] **Distributed workers** — Agent execution across multiple serverless functions or workers. Horizontal scaling.
- [ ] **Learning system** — Agents improve over sessions. Successful patterns are captured and reused. Mission templates evolve.
- [ ] **Auth & multi-tenancy** — User accounts, mission history, usage limits, billing.

---

## Tech Stack

### Current
| Layer | Technology |
|-------|-----------|
| Framework | React 19, Vite 7 |
| Styling | Tailwind CSS 4, Framer Motion |
| State | Zustand 5 |
| Visualization | D3 (hierarchy, zoom, selection) |
| Routing | React Router DOM 7 |
| Icons | Lucide React |
| Database | Supabase (optional) |
| API | Vercel Edge Functions |
| LLM | OpenRouter → Kimi K2 |
| Streaming | Vercel AI SDK (`ai`, `@openrouter/ai-sdk-provider`) |
| Validation | Zod 3 |
| Mock Data | Faker.js 9 |

### Planned Additions
| Technology | Purpose | Phase |
|-----------|---------|-------|
| Mem0 or custom | Shared agent memory / context layer | 4 |
| Langfuse | LLM observability and tracing | 7 |
| MCP | Standard tool/resource integration | 7 |

---

## Reference Documents

- `MANIFESTO.md` — Product thesis and brand positioning
- `docs/architecture-analysis-llm-coordination.md` — Technical gap analysis and evolution roadmap
- `docs/market-research-competitive-landscape.md` — Competitive landscape and strategic positioning
- `docs/research-technologies-and-inspirations.md` — Technology catalog and adoption recommendations
