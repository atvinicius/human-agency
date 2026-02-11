# Human Agency

**Mission Control for the AI Age** — one human directing a swarm of AI agents in real time.

[Live Demo](https://human-agency.vercel.app) &middot; [Manifesto](MANIFESTO.md) &middot; [Development Plan](PLAN.md)

---

## What It Does

Human Agency is an orchestration platform where a single operator launches, monitors, and steers dozens of AI agents working in parallel. Instead of chat, the interface is a **live map** that grows as agents spawn, branch, and complete objectives.

- **Custom missions** — describe any objective; an AI planner decomposes it into a team of specialized agents (coordinator, researcher, executor, validator, synthesizer)
- **Real-time visualization** — D3-powered agent map with pan/zoom, color-coded by role and status
- **Human-in-the-loop** — agents surface decisions for operator approval; pause, resume, or redirect at any point
- **Streaming execution** — watch agents think in real time via Server-Sent Events
- **Priority queue** — concurrent LLM calls with priority ordering, rate-limit handling, and context compression

## Architecture

```
Operator → Landing → /demo → Mission Control
                                  │
                      ┌───────────┴───────────┐
                PresetSelector         CustomMissionInput
                      │                        │
              OrchestrationService    /api/plan-mission (streaming)
                ┌─────┴─────┐                  │
          RequestQueue   AgentStore     Agent tree preview → Launch
               │          (Zustand)
        /api/agent-stream (SSE)
               │
        OpenRouter → Kimi K2
               │
        ContextCompressor (every 3 iterations)
               │
        AgentMap (D3) + ActivityStream
```

### Directory Structure

```
src/
├── pages/           Landing, Demo, Login, AuthCallback
├── components/      AgentMap, AgentNode, ActivityStream, InterventionPanel,
│                    PresetSelector, CustomMissionInput, ProtectedRoute
├── services/        orchestrationService, requestQueue, contextCompressor,
│                    streamParser, mockAgentService, presetService
├── stores/          agentStore, authStore, themeStore (Zustand)
├── lib/             supabase client
└── utils/           colorScheme, layoutEngine

api/
├── agent.js           Edge Function — LLM proxy (non-streaming)
├── agent-stream.js    Edge Function — streaming via AI SDK
├── plan-mission.js    Edge Function — mission planner (streaming)
└── _middleware/auth.js JWT validation
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

# Optional — persistence + auth
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
```

### Run

```bash
npm run dev        # Development server (Vite, port 5173)
npm run build      # Production build
npm test           # Run test suite (Vitest)
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
| Auth & Database | Supabase (RLS, JWT, Realtime) |
| API | Vercel Edge Functions |
| Testing | Vitest |

## Research

- [Architecture Analysis](docs/architecture-analysis-llm-coordination.md) — gap identification and evolution roadmap
- [Competitive Landscape](docs/market-research-competitive-landscape.md) — market sizing, 30+ competitors mapped
- [Technology Catalog](docs/research-technologies-and-inspirations.md) — Mem0, MCP, Langfuse, adoption recommendations

## License

Private. All rights reserved.
