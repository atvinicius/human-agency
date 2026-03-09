# Orchestration Surgical Strike — Design

## Goal
Improve agent orchestration throughput, output quality, and cost efficiency with 3 targeted changes. No architectural rewrites.

## Changes

### 1. Batch Iteration
- `iterate.js` claims and processes up to 3 agents concurrently per invocation via `Promise.allSettled`
- New `claim_agents_batch` RPC returns N agents with `FOR UPDATE SKIP LOCKED`
- `orchestrate.js` unchanged — just gets more work per call
- Each agent still independent: own LLM call, DB writes, spawn logic
- One agent failing doesn't affect others

### 2. Better Prompts
- **Position-aware instructions**: leaf vs parent vs near-limit agents get different guidance
- **Structured spawn configs**: acceptance criteria, deliverable format, complexity-based iteration limits
- **Pruned context injection**: only inject relevant context fields, not full JSON dump

### 3. Early Completion Detection
- If agent produces no meaningful output (<50 chars) for 2 consecutive iterations, force complete
- Complexity-based iteration caps: simple=5, moderate=7, complex=10
- Role-based defaults: validator/synthesizer=simple, researcher=moderate, coordinator=complex

## Files Changed
- `api/iterate.js` — batch claiming, parallel processing, early completion
- `api/orchestrate.js` — minor: handle batch results
- `api/_config/prompts.js` — position-aware prompts, pruned context
- `api/_lib/spawnLogic.js` — structured spawn with complexity, iteration limits
- `supabase/migrations/006_batch_iteration.sql` — `claim_agents_batch` RPC
- `src/services/orchestrationService.js` — client-side: handle batch results from iterate

## Not Changing
- Database schema for agents/sessions (no new tables)
- Frontend visualization
- Credit system
- Auth/security layer
