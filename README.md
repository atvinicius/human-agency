# Human Agency

**Mission Control for the AI Age** — one human directing a swarm of AI agents in real time.

[Live Demo](https://human-agency.vercel.app) &middot; [Manifesto](MANIFESTO.md) &middot; [Development Plan](PLAN.md)

---

## What It Does

Human Agency is a research orchestration platform where a single operator launches deep investigative missions powered by teams of AI agents. Instead of chat, the interface is a **living map** — agents appear as luminous orbs that spawn, branch, search the web, share findings, and converge into a structured report.

### Research Missions

Choose from 5 deep-dive research presets or describe your own objective:

- **The Longevity Equation** — anti-aging science, senolytics, GLP-1 repurposing, AI drug discovery
- **The Critical Minerals Chess Match** — geopolitics of rare earths, supply chain mapping, Western response
- **The Deepfake Reckoning** — synthetic media fraud, detection arms race, regulatory gaps
- **The Abyss Catalog** — deep-ocean biodiversity vs. mining, ISA regulatory battles
- **The Machine Consciousness Problem** — philosophy of mind meets AI architecture

Each mission spawns 9–11 specialized agents (researchers, validators, synthesizers) coordinated by an AI director. Agents search the web, share findings with siblings, and produce a consolidated report.

### Key Capabilities

- **Multi-agent orchestration** — coordinators, researchers, validators, and synthesizers working in parallel with smart spawn limits (25 agents, depth 4)
- **Live web search** — agents query the web in real time via Serper, Brave, or Tavily
- **Inter-agent collaboration** — shared findings registry, parent-child context passing, sibling awareness to prevent duplication
- **Real-time visualization** — D3-powered force-directed map with role-colored orbs, directional data flow particles, and search indicators
- **Consolidated output** — auto-synthesized mission report with copy/download, organized by Report/Artifacts/Raw Findings
- **Human-in-the-loop** — pause, resume, or redirect agents at any point; agents surface decisions for operator approval
- **Custom missions** — describe any objective and an AI planner decomposes it into a specialized agent team
- **Credits system** — new users get $10 in beta credits to run missions immediately

## Architecture

```
User → Landing → /demo → Mission Control
                              │
                  ┌───────────┴───────────┐
            PresetSelector         CustomMissionInput
                  │                        │
          OrchestrationService    /api/plan-mission (streaming)
            ↓       ↓       ↓              │
      RequestQueue  AgentStore  FindingsRegistry  Agent tree → Launch
           ↓        (Zustand)   (per-session)
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
├── pages/           Landing, Demo, Login, AuthCallback
├── components/
│   ├── map/         AgentMap, AgentOrb, OrganicEdge, MapControls,
│   │                RippleLayer, InlineIntervention, OrbDetailOverlay
│   ├── stream/      ActivityStream
│   └── ...          PresetSelector, CustomMissionInput, MissionReport,
│                    MissionHistory, BetaWelcome, CreditBalance, ConfirmDialog
├── services/        orchestrationService, findingsRegistry, requestQueue,
│                    contextCompressor, streamParser, presetService, mockAgentService
├── stores/          agentStore, missionReportStore, authStore, creditStore, themeStore
├── lib/             supabase client
└── utils/           colorScheme, orbStyles, forceLayoutEngine, renderMarkdown

api/
├── agent.js           Edge Function — LLM proxy (non-streaming)
├── agent-stream.js    Edge Function — streaming + web search via AI SDK tools
├── plan-mission.js    Edge Function — mission planner (streaming)
├── search.js          Edge Function — modular web search (Serper/Brave/Tavily)
└── _middleware/       JWT auth + credit check
```

## Getting Started

### Prerequisites

- Node.js 18+
- [OpenRouter](https://openrouter.ai) API key
- [Supabase](https://supabase.com) project (optional — app runs in demo mode without it)

### Setup

```bash
git clone https://github.com/atvinicius/human-agency.git
cd human-agency
npm install
cp .env.example .env
```

Edit `.env` with your keys:

```env
# Required — LLM access
OPENROUTER_API_KEY=sk-or-v1-...

# Optional — persistence + auth + credits
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# Optional — web search for agents (Serper: 2500 free queries/month)
SERPER_API_KEY=your-serper-key
```

### Run

```bash
npm run dev        # Development server (Vite, port 5173)
npm run build      # Production build
npm test           # Run test suite (95 tests, Vitest)
```

### Deploy

```bash
npx vercel
```

Set environment variables in the Vercel dashboard. Edge Functions in `api/` deploy automatically.

## Authentication

When Supabase is configured, the app requires authentication to access Mission Control.

- **Magic link** (default) — passwordless email sign-in
- **Email/password** — traditional sign-up with email confirmation
- New users automatically receive **$10 in beta credits**
- API endpoints validate JWTs server-side; unverified emails are rejected
- Without Supabase env vars, auth is bypassed entirely (demo mode)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19, Vite 7 |
| Styling | Tailwind CSS 4, Framer Motion |
| State | Zustand 5 |
| Visualization | D3 (hierarchy, zoom, selection) |
| LLM | OpenRouter (Kimi K2) via Vercel AI SDK |
| Web Search | Serper (default), Brave, Tavily |
| Auth & Database | Supabase (RLS, JWT, credits) |
| API | Vercel Edge Functions |
| Testing | Vitest 4 (95 tests) |

## Research

- [Architecture Analysis](docs/architecture-analysis-llm-coordination.md) — gap identification and evolution roadmap
- [Competitive Landscape](docs/market-research-competitive-landscape.md) — market sizing, 30+ competitors mapped
- [Technology Catalog](docs/research-technologies-and-inspirations.md) — Mem0, MCP, Langfuse, adoption recommendations

## License

Private. All rights reserved.
