# Technology Research: LLM Coordination, Agent Orchestration & Collaborative Systems

## Executive Summary

This document catalogs technologies, frameworks, open-source projects, and design patterns relevant to Human Agency's vision of parallel, cohesive agent swarms with intelligent information surfacing. Research is organized by domain, with specific recommendations based on our current stack (React, Zustand, Supabase, Vercel Edge, OpenRouter).

---

## 1. Multi-Agent Orchestration Frameworks

### Tier 1: Production-Ready Frameworks

#### **LangGraph** (Recommended to Study)
- **What**: Graph-based agent orchestration within LangChain ecosystem
- **Why relevant**: State management approach aligns with our hierarchical agent trees
- **Key features**: Directed graph workflows, conditional logic, multi-team coordination, supervisor nodes
- **Strengths**: Fastest execution, most efficient state management in benchmarks; supports persistent workflows
- **Considerations**: Python-first, steeper learning curve, requires graph-thinking
- **GitHub**: Part of LangChain ecosystem
- **Docs**: [langchain.com/langgraph](https://www.langchain.com/langgraph)

#### **CrewAI** (Recommended to Study)
- **What**: Role-based multi-agent framework
- **Why relevant**: Crews + Flows architecture mirrors our coordinator/executor/researcher pattern
- **Key features**: Two-layer architecture (Crews for collaboration, Flows for orchestration), role assignment
- **Strengths**: Most beginner-friendly, great docs, enterprise features, paid control plane available
- **Popularity**: 43,775 GitHub stars (Feb 2026)
- **Considerations**: Python-only, may be opinionated for our JS stack
- **GitHub**: [github.com/crewAIInc/crewAI](https://github.com/crewAIInc/crewAI)

#### **OpenAI Agents SDK** (Replaced Swarm)
- **What**: Production evolution of OpenAI's Swarm educational framework
- **Why relevant**: **Handoff patterns** are directly applicable to our agent coordination
- **Key concepts**:
  - Agents as tools (agents can delegate to other agents)
  - Handoffs as first-class primitives
  - Guardrails for input/output validation
- **Key insight**: "Handoffs are the transfer of control from one agent to another—just like when you phone the bank"
- **Docs**: [openai.github.io/openai-agents-python](https://openai.github.io/openai-agents-python/)

#### **Microsoft AutoGen / Agent Framework**
- **What**: Conversational multi-agent orchestration
- **Why relevant**: Dynamic role-playing, context-aware agents
- **Key features**: Agents can generate, fix, and run code in Docker containers; conversation-driven workflows
- **Considerations**: Flexible but requires self-managed deployment
- **Recent**: Microsoft Agent Framework (late 2025) combines Semantic Kernel + AutoGen

### Tier 2: Emerging / Specialized

#### **Google ADK (Agent Development Kit)**
- **What**: Code-first Python framework for multi-agent applications
- **Why relevant**: Deep integration with cloud services, real-world deployment focus
- **Considerations**: Tied to Google Cloud/Vertex AI ecosystem

#### **Flowise**
- **What**: Low-code visual builder for multi-agent systems
- **Why relevant**: Visual approach to agent orchestration—potential inspiration for our UI
- **Builders**: Chatflow (single-agent), Agentflow (multi-agent)
- **Built on**: LangChain and LlamaIndex

### Comparison Matrix

| Framework | Approach | Best For | JS Support | Learning Curve |
|-----------|----------|----------|------------|----------------|
| LangGraph | Graph-based | Complex cyclical workflows | Via JS SDK | Steep |
| CrewAI | Role-based teams | Structured team dynamics | No | Easy |
| Agents SDK | Handoffs | Delegation patterns | Python only | Moderate |
| AutoGen | Conversation-driven | Dynamic dialogue | No | Moderate |

**Recommendation**: Study **CrewAI's Crews+Flows architecture** for our role patterns, and **OpenAI's handoff patterns** for agent delegation. Consider **LangGraph's state management** for inspiration, but implement in JS.

---

## 2. Agent Memory & Shared Context

### **Mem0** (Highly Recommended)
- **What**: Universal memory layer for AI agents
- **Why critical**: Directly addresses our "agents are isolated islands" problem
- **Performance**:
  - +26% accuracy over OpenAI Memory (LOCOMO benchmark)
  - 91% faster responses than full-context
  - 90% lower token usage
- **Memory types**:
  - User memory (cross-conversation)
  - Session memory (within conversation)
  - Agent memory (per agent instance)
- **Architecture**: Automatically extracts, stores, and retrieves relevant information
- **Integrations**: OpenAI, LangGraph, CrewAI, Python, JavaScript
- **Adoption**: Netflix, Lemonade, Rocket Money; 37K+ GitHub stars; $24M raised (Oct 2025)
- **GitHub**: [github.com/mem0ai/mem0](https://github.com/mem0ai/mem0)
- **Why for us**: Could be our shared context layer implementation

### **Graphiti by Zep** (Recommended for Knowledge Graphs)
- **What**: Temporal knowledge graph framework for AI agents
- **Why relevant**: Addresses limitations of vector-only RAG
- **Key innovation**: Understands temporal relationships, tracks entity evolution, maintains coherent identity across sessions
- **Features**: Incremental updates, efficient retrieval, historical queries without full recomputation
- **Comparison to RAG**: "Human memory isn't just documents—it's interconnected experiences, relationships, and temporal understanding"
- **GitHub**: [github.com/getzep/graphiti](https://github.com/getzep/graphiti)

### **Memory Architecture Patterns**

From research, agent memory should include:

1. **Short-term memory**: Current conversation context
2. **Long-term memory**: Persistent knowledge base
3. **Shared memory**: Common space for multi-agent coordination
4. **Episodic memory**: Specific experiences/events
5. **Semantic memory**: General knowledge/facts

**Storage paradigms**:
- Cumulative (append-only history)
- Reflective/Summarized (compressed)
- Structured (tables, triples, graphs)
- Parametric (embedded in model weights)

**Recommendation**: Evaluate **Mem0** as a potential drop-in solution for our shared context layer. If we need more complex relational reasoning, consider **Graphiti** for knowledge graph capabilities.

---

## 3. Anthropic Model Context Protocol (MCP)

### What is MCP?
- Open standard for connecting AI applications to external systems
- Analogy: "USB-C for AI applications"
- Architecture: Client-server model (clients like Claude Desktop connect to MCP servers)

### Core Primitives
1. **Tools**: Functions agents can call (API requests, commands)
2. **Resources**: Data sources (like REST endpoints, but structured)
3. **Prompts**: Predefined templates for optimal tool/resource usage

### Why Relevant
- Protocol-based context that persists across interactions
- No external state management needed
- Embeds tool usage within model's context window
- Adopted as de-facto standard for connecting agents to tools/data

### Adoption
- Thousands of community MCP servers
- SDKs for all major languages
- Pre-built servers: Google Drive, Slack, GitHub, Git, Postgres, Puppeteer
- Adopters: Block, Apollo, Zed, Replit, Codeium, Sourcegraph

**Recommendation**: Consider adopting MCP for tool/resource integration as we scale. Provides standardized way to connect agents to external systems without custom integration code.

---

## 4. Real-Time Collaboration & State Sync

### **Figma's Multiplayer Architecture** (Must Study)
- **Approach**: CRDT-inspired, not traditional OT (operational transforms)
- **Key insight**: "Property-level LWW for objects, character-level CRDTs for text—different problems, different solutions"
- **Architecture**:
  - WebSocket connections to multiplayer service
  - Service is authoritative (validation, ordering, conflict resolution)
  - File state held in-memory, updated as changes arrive
- **Implementation**: Rust for the multiplayer service
- **Eg-walker algorithm**: For code layers—analogous to git rebase, rearranges divergent branches into linear order
- **Blog**: [figma.com/blog/how-figmas-multiplayer-technology-works](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/)

**Applicability**: Our agent state updates need similar conflict resolution. Property-level LWW is appropriate for agent status/progress updates.

### **Liveblocks** (Recommended for JS)
- **What**: Platform for building collaborative applications
- **Why relevant**: Production-ready multiplayer infrastructure for React
- **Features**:
  - Yjs integration for collaborative text
  - Presence (real-time user awareness)
  - Fully hosted WebSocket infrastructure
  - REST API, webhooks, dashboard
- **Users**: Vercel, Hashnode, Resend
- **Docs**: [liveblocks.io](https://liveblocks.io/)

### **Yjs** (Open Source CRDT)
- **What**: CRDT framework for collaborative editing
- **Features**: Multiplayer undo/redo, lazy loading, offline support
- **Integrations**: Most popular text/code editors
- **GitHub**: [github.com/yjs/yjs](https://github.com/yjs/yjs)

### **Supabase Realtime** (Already in Stack)
- **What**: Real-time subscriptions on Postgres changes
- **Presence**: Track/sync shared state between users
- **Events**: sync, join, leave for state changes
- **Our usage**: Already subscribed to agents, events, sessions tables

**Pattern for Us**:
```
Supabase (source of truth)
  → Realtime subscriptions
    → Zustand (local cache/projection)
      → UI Components
```

**Recommendation**: Explore **Liveblocks** for managed multiplayer if Supabase Realtime becomes limiting. Consider **Yjs patterns** for any collaborative editing features.

---

## 5. Event Sourcing & CQRS Patterns

### When to Consider
- CQRS: When read/write models need to scale independently
- Event Sourcing: When you need complete audit trail, time-travel debugging

### Relevance to Human Agency
1. **Agent activity is naturally event-based**: spawn, status_change, progress, complete, fail
2. **We already have an events table**: Could evolve to true event sourcing
3. **Replay capability**: Useful for debugging agent behavior
4. **Different read models**: Mission summary vs. agent detail vs. activity stream

### Key Patterns

**Event Collaboration Pattern**:
> "Events describe an evolving business process—several services collaborate to push that workflow forward. This leads to a log of every state change, held immutably."

**Benefits**:
- Scalability: Read/write paths scale independently
- Traceability: Always retrace how state arrived at current position
- Flexibility: Different read stores for different query patterns (Neo4j, Lucene, etc.)

**Challenges**:
- Eventual consistency (stale reads)
- Complexity (especially with Event Sourcing)
- Learning curve

**Technologies**:
- Kafka Streams
- Amazon Kinesis/EventBridge/MSK
- Axon Framework

**Recommendation**: Don't over-engineer early. Our current events table is a good foundation. If we need true event sourcing later, migrate incrementally. CQRS pattern could help when we have multiple UI views needing different data shapes.

---

## 6. LLM Request Management (Production Patterns)

### Rate Limiting Strategies

**Token Bucket / Leaky Bucket**:
- Control request flow
- Smooth out traffic spikes

**Queue Systems**:
- Redis, Kafka, RabbitMQ
- FIFO processing when rate limit resets
- Backpressure for graceful degradation

### Request Batching
- Combine multiple prompts into single API call
- Good for bulk operations (embeddings, analysis)
- Requires careful error handling per-item

### Our Current Issues
1. No explicit queue—using async/await + setTimeout
2. 2-second fixed delay between iterations (not adaptive)
3. No backpressure handling when spawning children

### Recommended Patterns

**Exponential Backoff**:
```javascript
async function callWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === maxRetries - 1) throw e;
      await sleep(Math.pow(2, i) * 1000);
    }
  }
}
```

**Priority Queue for Agents**:
- Critical > High > Normal > Low > Background
- Dynamically adjust based on user attention

**Continuous Batching** (for self-hosted):
- vLLM, HuggingFace TGI use this
- Batch GPU calculations for efficiency

**Recommendation**: Implement a proper request coordinator with:
1. Priority queue (based on agent priority)
2. Adaptive rate limiting (track OpenRouter limits)
3. Exponential backoff on failures
4. Token budget tracking per session

---

## 7. Observability & Tracing

### **Langfuse** (Recommended - Open Source)
- **What**: Open-source LLM engineering platform
- **Why**: MIT license, self-hostable, 19K+ GitHub stars
- **Features**:
  - Full tracing (multi-turn conversations, agent actions)
  - Prompt versioning with playground
  - Evaluations (LLM-as-judge, user feedback, custom metrics)
  - Custom dashboards (latency, cost, errors)
  - OpenTelemetry support
- **Integrations**: LangChain, LlamaIndex, OpenAI SDK, Vercel AI SDK, 50+ frameworks
- **GitHub**: [github.com/langfuse/langfuse](https://github.com/langfuse/langfuse)

### **LangSmith** (Commercial)
- **What**: LangChain's observability platform
- **Features**: Tracing, debugging, real-time monitoring
- **Strengths**: Deep LangChain/LangGraph integration
- **Key insight**: "Every LLM call, tool invocation, and reasoning step is observable"

### What to Trace
1. Every LLM call (prompt, response, tokens, latency)
2. Tool invocations
3. Agent state transitions
4. Human intervention points
5. Error rates and types
6. Cost per session/agent

**Recommendation**: Start with **Langfuse** (self-hosted or cloud). Add structured logging now, migrate to full tracing when needed. This will be critical for debugging cohesion issues between agents.

---

## 8. Autonomous Agent Implementations (Inspirations)

### **Devin by Cognition** (Commercial)
- **What**: First autonomous AI software engineer
- **Architecture**:
  - Sandboxed VM with browser, editor, shell
  - Planner module (breaks down tasks)
  - Browser module (documentation lookup, testing)
  - Editor + Shell loop (human-like workflow)
- **Devin 2.0 (April 2025)**:
  - Shifted from "fully autonomous" to "agent-native IDE"
  - Multiple parallel Devins, each with cloud IDE
  - User can step in to steer
- **Features**:
  - Auto-indexes repos, creates wikis with architecture diagrams
  - DeepWiki: Free tool for repo documentation
  - Linear/Slack/Teams integrations
- **Key insight**: Balance autonomy with human steering capability

### **OpenHands** (Open Source Alternative)
- **What**: Open-source autonomous AI developer
- **Capabilities**: Modify code, run commands, browse web, call APIs
- **Components**:
  - SDK: Composable Python library for agent logic
  - CLI: Claude Code/Codex-like experience
  - Local GUI: React SPA with REST API
- **Performance**: Solves 50%+ of real GitHub issues in benchmarks; 87% of bug tickets same-day
- **Popularity**: 38.8K GitHub stars, MIT license, $18.8M raised
- **GitHub**: [github.com/OpenHands/OpenHands](https://github.com/OpenHands/OpenHands)

**Inspiration for us**:
- Parallel agent spawning (multiple Devins)
- Balance of autonomy + human steering
- Auto-generated documentation/wikis from agent work

---

## 9. UI/UX Patterns for AI Systems

### Key Pattern Libraries
- **The Shape of AI** ([shapeof.ai](https://www.shapeof.ai)): UX patterns for AI design
- **AI UX Patterns** ([aiuxpatterns.com](https://www.aiuxpatterns.com/)): Exploration of AI design patterns
- **Agentic Design Patterns** ([agentic-design.ai](https://agentic-design.ai/patterns/ui-ux-patterns)): UI/UX for autonomous agents

### Shift Away from Chat

> "When agents can use multiple tools, call other agents, and run in the background, users orchestrate AI work more—there's a lot less chatting. Messaging UI starts feeling dated."
> — Luke Wroblewski

**New paradigm**: Task-oriented UIs with temperature controls, knobs, sliders, buttons, semantic spreadsheets, infinite canvases—AI providing predefined options.

### Key Patterns

**1. Collaborative Canvas**
- Inline AI suggestions (ghost text, tooltips)
- Slash commands for invoking actions
- Multi-modal inputs (typing + drag/drop)
- Real-time co-creation with visible AI feedback
- Easy undo/accept of AI changes

**2. Co-Pilot Pattern**
- AI as collaborative assistant
- User retains control and authorship
- Contextual, data-driven insights
- Speeds up workflows, reduces cognitive load

**3. Progressive Disclosure**
- Users explore data in layers
- Summary views → detailed analysis
- Right information at right time

**4. Trust-Building Patterns**
- Uncertainty becomes manageable
- Errors become learning opportunities
- Transparency in agent reasoning

**5. Agentic UI Patterns**
- Control switching between human and AI
- Collaborative initiative-taking
- Real-time agent activity visualization
- Thinking states and operational status

### Dashboard Best Practices
- Charts over tables for patterns/trends
- Consistency in terminology, layout, interaction
- Anchoring effect: Speed up progress bar near completion
- Embedded workflow modules: Execute decisions from within dashboard

**Recommendation**: Move toward **task-oriented orchestration UI** rather than chat. Our AgentMap is good—add:
1. Inline steering controls (sliders for priority, toggles for constraints)
2. Progressive disclosure (zoom levels)
3. Thinking state visualization
4. Easy undo/rollback

---

## 10. JavaScript-Specific Solutions

### **Vercel AI SDK** (Highly Recommended)
- **What**: TypeScript toolkit for AI applications
- **Why perfect for us**: Already on Vercel, React-based
- **Core**: Unified API for text, objects, tool calls, agents
- **UI**: Framework-agnostic hooks (`useChat`, `useCompletion`, `useObject`)
- **Streaming**: Handles SSE complexity, manages state, error handling
- **Agents**: `ToolLoopAgent` for production—handles full tool execution loop
- **Durability**: `DurableAgent` turns agents into resumable workflows
- **GitHub**: [github.com/vercel/ai](https://github.com/vercel/ai)
- **Latest**: AI SDK 6 (human-in-the-loop, DevTools)

**Recommendation**: Consider migrating our `/api/agent` to use Vercel AI SDK. Would give us:
- Proper streaming (vs. our request/response)
- Built-in hooks for React
- Tool execution loops
- Better observability

### **Zustand + Supabase Pattern**
Our current stack is reasonable. Key patterns to add:

1. **Supabase as Source of Truth**:
   - Client state becomes projection
   - Optimistic updates with rollback

2. **Realtime Subscription Pattern**:
   ```javascript
   // Subscribe to agent changes
   supabase
     .channel('agents')
     .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' },
       (payload) => store.handleRemoteChange(payload))
     .subscribe();
   ```

3. **Persist Middleware**:
   - Zustand persist middleware with custom Supabase storage
   - Sync local changes to DB

---

## 11. Summary: Technology Stack Recommendations

### Keep (Already Good)
- **React + Zustand**: Solid foundation, keep it
- **Supabase**: Good for persistence, realtime, auth
- **Vercel Edge Functions**: Low latency, scales well
- **OpenRouter**: Flexible model access

### Add / Migrate To

| Need | Recommended Solution | Priority | Effort |
|------|---------------------|----------|--------|
| Shared Context | **Mem0** (evaluate) or custom facts registry | High | Medium |
| Streaming Responses | **Vercel AI SDK** hooks | High | Medium |
| Request Queue | Custom with priority + rate limiting | High | Low |
| Agent Handoffs | OpenAI Swarm patterns (implement in JS) | Medium | Medium |
| Observability | **Langfuse** (self-hosted) | Medium | Low |
| Knowledge Graph | **Graphiti** (if complex relations needed) | Low | High |
| Multiplayer Collab | **Liveblocks** (if scaling beyond Supabase) | Low | Medium |

### Study But Don't Adopt Directly
- **LangGraph**: State management patterns, but we're not in Python
- **CrewAI**: Role architecture, Crews+Flows concept
- **Figma multiplayer**: CRDT patterns, conflict resolution
- **Devin 2.0**: Balance of autonomy + steering

### Avoid (For Now)
- Full event sourcing (over-engineering for current stage)
- Heavy CQRS (our reads aren't complex enough yet)
- GraphQL (REST + Realtime is sufficient)

---

## 12. Recommended Next Steps

### Phase 1: Foundation Improvements
1. **Implement request coordinator** with priority queue
2. **Add Vercel AI SDK** for streaming + hooks
3. **Set up Langfuse** for basic tracing
4. **Prototype shared context** (simple facts store, try Mem0)

### Phase 2: Agent Cohesion
1. **Agent messaging bus** (agents can broadcast discoveries)
2. **Context injection** (relevant shared facts in prompts)
3. **Handoff patterns** (explicit delegation between agents)

### Phase 3: Information Surfacing
1. **Multi-level UI** (mission → insights → activity → logs)
2. **Importance classification** (critical/important/normal/background)
3. **Progressive disclosure** controls

### Phase 4: Production Hardening
1. Full observability with traces
2. Conflict resolution for concurrent updates
3. Session persistence + resumption
4. Cross-session memory (Mem0 or similar)

---

## 13. Key Sources & References

### Frameworks
- [CrewAI GitHub](https://github.com/crewAIInc/crewAI)
- [LangGraph Documentation](https://www.langchain.com/langgraph)
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/)
- [OpenHands GitHub](https://github.com/OpenHands/OpenHands)

### Memory & Context
- [Mem0 GitHub](https://github.com/mem0ai/mem0)
- [Graphiti GitHub](https://github.com/getzep/graphiti)
- [Anthropic MCP Introduction](https://www.anthropic.com/news/model-context-protocol)

### Collaboration
- [Figma Multiplayer Blog](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/)
- [Liveblocks Documentation](https://liveblocks.io/docs)
- [Yjs GitHub](https://github.com/yjs/yjs)

### Observability
- [Langfuse GitHub](https://github.com/langfuse/langfuse)
- [LangSmith](https://www.langchain.com/langsmith/observability)

### AI SDK
- [Vercel AI SDK](https://ai-sdk.dev/docs/introduction)
- [Vercel AI SDK GitHub](https://github.com/vercel/ai)

### UI/UX
- [The Shape of AI](https://www.shapeof.ai)
- [AI UX Patterns](https://www.aiuxpatterns.com/)
- [Agentic Design Patterns](https://agentic-design.ai/patterns/ui-ux-patterns)

### Patterns & Architecture
- [DataCamp: CrewAI vs LangGraph vs AutoGen](https://www.datacamp.com/tutorial/crewai-vs-langgraph-vs-autogen)
- [Microsoft CQRS Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs)
- [Martin Fowler on CQRS](https://www.martinfowler.com/bliki/CQRS.html)

---

*Document created: 2026-02-10*
*Research scope: Multi-agent orchestration, shared context, real-time collaboration, production patterns*
*Status: Complete - Ready for team review*
