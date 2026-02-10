# LLM Request Handling & Agent Coordination: Architecture Analysis

## Executive Summary

This document analyzes the current architecture for LLM request handling and multi-agent coordination in Human Agency, with a focus on scalability, cohesion, and information surfacing. The current implementation is a solid foundation for demos but will need significant architectural evolution to support the vision of parallel, cohesive agent swarms with intelligent information prioritization.

---

## 1. Current Architecture Overview

### Request Flow
```
User → Demo.jsx → OrchestrationService → /api/agent (Edge) → OpenRouter → LLM
                        ↓
                  AgentStore (Zustand)
                        ↓
                  UI Components (AgentMap, ActivityStream)
```

### Key Components
- **Edge Function (`/api/agent.js`)**: Single gateway to OpenRouter, handles all LLM calls
- **OrchestrationService**: Spawns agents, manages execution loops, handles human input
- **AgentStore**: Zustand store for client-side state, events, and UI synchronization
- **Supabase**: Persistence layer for sessions, agents, events, artifacts

---

## 2. What Works Well

### Security Model
The API key isolation via Edge Function is correct—keys never touch the client. The service key pattern for Supabase admin operations is also sound.

### Role-Based Prompting
The system prompts per role (coordinator, researcher, executor, validator, synthesizer) provide good initial specialization. The structured JSON response format enables predictable parsing.

### Hierarchical Structure
The parent-child agent tree maps well to how complex tasks decompose. The preset system allows quick demonstration of different scenarios.

### Human Intervention Points
The `needs_input` mechanism and waiting state allow for human-in-the-loop at critical decision points.

---

## 3. Scalability Concerns

### 3.1 Sequential Execution Within Agents

**Current**: Each agent runs a sequential loop—call LLM, wait for response, update state, repeat. The `executeAgent` function is fundamentally synchronous per-agent.

```javascript
while (iterations < maxIterations) {
  const { result } = await callAgent(currentAgent, messages);  // Blocking
  // ... process result
  await new Promise((r) => setTimeout(r, 2000));  // Fixed 2s delay
}
```

**Problem**: With 20+ agents, you're limited by:
- OpenRouter rate limits (varies by tier)
- Edge function cold starts and timeouts
- No request batching or queuing

**Recommendation**:
- Implement a centralized **request coordinator** that manages a priority queue of pending LLM calls
- Use **token bucket** rate limiting that adapts to OpenRouter's limits
- Consider **request batching** for agents that can share context
- Move to **server-sent events (SSE)** or **WebSocket** for streaming responses instead of polling

### 3.2 No Message Deduplication or Caching

**Current**: Every agent iteration sends full message history. For a 10-iteration agent, you're paying for the entire context window 10 times.

**Recommendation**:
- Implement **context compression**: Summarize older messages before sending
- Add **semantic caching**: If an agent asks essentially the same thing twice, return cached response
- Consider **sliding window** with summaries for long-running agents

### 3.3 State Synchronization

**Current**: Dual state in Zustand (client) and Supabase (server), with no conflict resolution.

```javascript
// Client updates
store.updateAgent(agentId, { status: 'working' });

// Server updates (separate, no coordination)
await supabaseAdmin.from('agents').update(updates).eq('id', agentId);
```

**Problem**: Race conditions, stale reads, and drift between client/server state.

**Recommendation**:
- Make Supabase the **single source of truth**
- Use Supabase Realtime subscriptions to push updates to clients
- Client state becomes a cache/projection of server state
- Implement **optimistic updates** with rollback on conflict

### 3.4 No Backpressure Handling

**Current**: Agents spawn children immediately with `setTimeout(..., 1000)`. No consideration for system load.

**Recommendation**:
- Implement **spawn throttling** based on active agent count
- Add **circuit breaker** pattern for failing agents
- Consider **agent pooling** for common operations

---

## 4. Agent Cohesion: The Critical Gap

This is the most significant architectural gap for the vision. Currently, **agents are isolated islands**—they don't share knowledge, coordinate decisions, or maintain coherent understanding.

### 4.1 Current Inter-Agent Communication

**Reality**: There is none. Agents only share:
- Their objective (set at spawn time)
- Parent context (implicit through `context` field)

There's no mechanism for:
- Agent A to ask Agent B a question
- Sharing discovered insights across the swarm
- Coordinating on conflicting approaches
- Building shared understanding

### 4.2 Proposed: Shared Context Layer

```
┌─────────────────────────────────────────────────────────────┐
│                    SHARED CONTEXT LAYER                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │   Facts      │ │  Decisions   │ │  Artifacts           │ │
│  │   Registry   │ │  Log         │ │  Repository          │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Event Bus / Message Queue               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         ↑              ↑              ↑              ↑
     Agent A        Agent B        Agent C        Agent D
```

**Components**:

1. **Facts Registry**: Immutable store of discovered truths
   - "The API uses JWT authentication"
   - "Database is PostgreSQL 14"
   - Agents can query and contribute facts
   - Conflict resolution when agents disagree

2. **Decision Log**: Append-only log of decisions made
   - "Chose React over Vue because..."
   - "Selected pricing tier X because..."
   - Enables agents to understand why, not just what

3. **Artifact Repository**: Shared outputs
   - Code, documents, analysis
   - Versioned, with provenance tracking
   - Agents can reference and build upon each other's work

4. **Event Bus**: Real-time coordination
   - "I discovered X" broadcasts
   - "I need help with Y" requests
   - "I'm blocked on Z" signals

### 4.3 Context Injection

Each agent's system prompt should include:
- **Relevant** facts from the registry (filtered by role/objective)
- **Recent** decisions that affect their work
- **Links** to artifacts they might need

The key is **intelligent filtering**—not dumping everything, but surfacing what's relevant.

---

## 5. Information Surfacing: The UX Challenge

### 5.1 Current Approach

The UI surfaces information through:
- **Activity Stream**: Chronological event feed (max 100 events)
- **Agent Map**: Visual hierarchy with color-coded status
- **Detail Panel**: Selected agent's objective, progress, activity
- **Intervention Panel**: Human input requests

**Problem**: This is agent-centric, not insight-centric. The user sees *what agents are doing* but not *what they're discovering* or *what matters*.

### 5.2 Proposed: Multi-Level Information Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│  LEVEL 1: Mission Summary                                    │
│  "Building SaaS MVP: 3 critical decisions pending,          │
│   2 blockers found, 67% complete"                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  LEVEL 2: Key Insights & Decisions                          │
│  • "Market research found 3 direct competitors"             │
│  • "Tech stack decision: Need your input"                   │
│  • "Risk: No existing user auth in codebase"                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  LEVEL 3: Agent Activity (current view)                     │
│  Researcher analyzing... Executor coding... Validator...    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  LEVEL 4: Raw Logs & Artifacts                              │
│  [Click to expand any agent for full context]               │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Intelligence Layer for Prioritization

Not everything an agent does matters equally. We need an **intelligence layer** that:

1. **Classifies outputs** by importance:
   - Critical: Requires human decision
   - Important: Significant discovery or milestone
   - Normal: Progress update
   - Background: Routine operations

2. **Detects patterns**:
   - Multiple agents hitting the same blocker
   - Conflicting conclusions between agents
   - Stalled progress on critical path

3. **Surfaces proactively**:
   - Push notifications for critical items
   - Digest summaries at intervals
   - "3 agents are waiting for your input"

### 5.4 Flexible Zoom Levels

Users should be able to:
- **Zoom out**: See mission-level progress, key metrics
- **Zoom in**: Dive into specific agent, see full reasoning
- **Filter**: By role, status, priority, topic
- **Search**: Find specific decisions or discoveries
- **Time travel**: Replay what happened, understand causality

---

## 6. Steering & Control: Human Agency

### 6.1 Current Control Points

- **Pause/Resume**: Individual or all agents
- **Human Input**: When explicitly requested
- **Preset Selection**: Initial configuration

### 6.2 Proposed: Richer Control Model

1. **Directive Broadcasting**
   - User can broadcast messages to all agents: "Focus on security aspects"
   - Agents incorporate directives into their reasoning

2. **Priority Adjustment**
   - Drag agents to change priority
   - System reallocates resources accordingly

3. **Branch/Explore**
   - "Explore alternative X" spawns a parallel investigation
   - User can compare branches and merge or discard

4. **Rollback/Undo**
   - Revert to checkpoint
   - Agents restore previous context

5. **Constraints & Guardrails**
   - "Don't exceed $X budget"
   - "Must use technology Y"
   - "Avoid approach Z"

---

## 7. Technical Recommendations

### 7.1 Short-Term (Current Sprint)

1. **Add request queuing**: Simple in-memory queue with rate limiting
2. **Implement context summaries**: Compress older messages before sending
3. **Add importance classification**: Tag events with severity level
4. **Enable agent-to-agent messaging**: Simple pub/sub via store

### 7.2 Medium-Term (Next Quarter)

1. **Migrate to server-side orchestration**: Move execution loops to a dedicated service
2. **Implement shared context layer**: Facts registry, decision log
3. **Add streaming responses**: SSE or WebSocket for real-time updates
4. **Build intelligence layer**: Pattern detection, prioritization
5. **Design zoom UI**: Multi-level information hierarchy

### 7.3 Long-Term (Product Vision)

1. **Distributed execution**: Run agents across multiple workers
2. **Learning system**: Improve agent behavior based on outcomes
3. **Template marketplace**: Community-contributed presets
4. **Cross-session memory**: Agents remember previous missions
5. **Multi-user collaboration**: Multiple humans steering same swarm

---

## 8. Architecture Evolution Path

### Phase 1: Reliable Single-User Demo
```
Current → + Request Queue → + Context Compression → + Event Classification
```

### Phase 2: Cohesive Agent Swarms
```
+ Shared Context Layer → + Agent Messaging → + Conflict Resolution
```

### Phase 3: Intelligent Orchestration
```
+ Intelligence Layer → + Proactive Surfacing → + Flexible Zoom
```

### Phase 4: Production Scale
```
+ Server-Side Execution → + Distributed Workers → + Learning System
```

---

## 9. Key Design Tradeoffs

### Centralized vs. Distributed Orchestration

| Centralized | Distributed |
|-------------|-------------|
| Simpler to implement | More scalable |
| Easier to debug | Fault tolerant |
| Single point of failure | Complex coordination |
| Better for demos | Better for production |

**Recommendation**: Start centralized, design for distribution. The shared context layer pattern works for both.

### Agent Autonomy vs. Human Control

| High Autonomy | High Control |
|---------------|--------------|
| Faster execution | More predictable |
| More surprising results | Higher confidence |
| Risk of runaway | Bottleneck on human |
| Good for exploration | Good for execution |

**Recommendation**: Configurable spectrum. Research tasks default to high autonomy; execution tasks require more checkpoints.

### Rich Context vs. Token Efficiency

| Rich Context | Lean Context |
|--------------|--------------|
| Better coherence | Lower cost |
| More relevant outputs | Faster responses |
| Higher latency | More iteration needed |
| Risk of confusion | Risk of forgetting |

**Recommendation**: Intelligent compression. Summarize history, inject only relevant shared context, full detail on current task.

### Real-time vs. Batch Updates

| Real-time | Batch |
|-----------|-------|
| Immediate feedback | Lower overhead |
| Higher resource usage | Potential staleness |
| Better UX | Simpler implementation |
| WebSocket complexity | HTTP simplicity |

**Recommendation**: Hybrid. Real-time for critical updates (human input needed, agent blocked), batch for routine progress.

---

## 10. Open Questions

1. **How do we measure agent cohesion?** What metrics indicate the swarm is working together vs. in isolation?

2. **What's the right granularity for human intervention?** Too much = bottleneck. Too little = loss of control.

3. **How do we handle contradictions?** When two agents reach opposite conclusions, who decides?

4. **What's the memory model?** How much context crosses session boundaries? What's forgotten?

5. **How do we prevent cascade failures?** One bad agent output corrupting the shared context?

---

## 11. Conclusion

The current architecture is a functional prototype that demonstrates the core concept. However, the vision of truly cohesive parallel agent swarms requires significant investment in:

1. **Shared context infrastructure**: Agents need to share knowledge, not just structure
2. **Intelligent information surfacing**: Users need insight-centric views, not just activity feeds
3. **Flexible control mechanisms**: Beyond pause/resume to true steering
4. **Scalable execution**: From client-side loops to distributed orchestration

The good news: the current abstractions (agents, sessions, events, artifacts) provide a solid foundation. The architecture can evolve incrementally without requiring a full rewrite.

The critical next step is implementing the **shared context layer**—this unlocks both agent cohesion and intelligent surfacing, and is prerequisite for everything else.

---

*Document created: 2026-02-10*
*Author: Architecture Analysis (Claude)*
*Status: Draft for Discussion*
