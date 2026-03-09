# Fix Credits System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all broken credit deduction paths so API calls are reliably billed.

**Architecture:** Seven issues across three layers: (1) streaming endpoints using Edge Runtime where async billing callbacks are silently killed, (2) the `deductCredits` middleware silently swallowing zero-cost and error cases, (3) missing `sessionId` in client-side API calls breaking audit trails. Fix by converting streaming endpoints to Node.js runtime with synchronous post-stream billing, adding diagnostic logging to the middleware, and threading `sessionId` through all client call sites.

**Tech Stack:** Vercel AI SDK v6 (`ai`), `@openrouter/ai-sdk-provider`, Supabase RPC, Node.js runtime

---

## Summary of Issues

| # | Severity | Issue | File(s) |
|---|----------|-------|---------|
| 1 | CRITICAL | `onFinish` credit deduction silently killed in Edge Runtime | `api/agent-stream.js`, `api/plan-mission.js` |
| 2 | CRITICAL | Zero-token usage silently skips deduction (no log) | `api/_middleware/credits.js` |
| 3 | HIGH | `agent.js` doesn't log when `data.usage` is missing | `api/agent.js` |
| 4 | HIGH | Missing `sessionId` in client-side API calls | `src/services/orchestrationService.js` |

---

### Task 1: Add diagnostic logging to `deductCredits` middleware

**Files:**
- Modify: `api/_middleware/credits.js:43-64`

**Step 1: Add logging for zero-cost and null-guard cases**

Replace the `deductCredits` function body with logging at every exit point:

```javascript
export async function deductCredits(userId, modelId, promptTokens, completionTokens, sessionId = null) {
  if (!supabaseAdmin) {
    console.warn('[billing] deductCredits skipped — supabaseAdmin not configured');
    return null;
  }
  if (!userId) {
    console.warn('[billing] deductCredits skipped — no userId');
    return null;
  }

  const cost = calculateCost(modelId, promptTokens, completionTokens);
  if (cost <= 0) {
    console.warn('[billing] deductCredits skipped — zero cost', {
      modelId, promptTokens, completionTokens, userId, sessionId,
    });
    return null;
  }

  const { data, error } = await supabaseAdmin.rpc('deduct_credits', {
    p_user_id: userId,
    p_amount: cost,
    p_model_id: modelId,
    p_prompt_tokens: promptTokens,
    p_completion_tokens: completionTokens,
    p_session_id: sessionId,
  });

  if (error) {
    console.error('[billing] deductCredits RPC error — needs reconciliation:', {
      error: error.message, userId, modelId, cost, promptTokens, completionTokens, sessionId,
      timestamp: new Date().toISOString(),
    });
    return null;
  }

  if (data && !data.success) {
    console.warn('[billing] deductCredits rejected:', data.error, {
      userId, modelId, cost, sessionId,
    });
  }

  return data;
}
```

**Step 2: Run tests**

Run: `npx vitest run src/services/__tests__/pricing.test.js`
Expected: PASS (pricing tests are independent of middleware)

**Step 3: Commit**

```bash
git add api/_middleware/credits.js
git commit -m "fix(billing): add diagnostic logging to deductCredits for zero-cost and error cases"
```

---

### Task 2: Convert `agent-stream.js` from Edge to Node.js runtime

This is the critical fix. The current Edge Runtime kills the async `onFinish` callback before credit deduction completes. Converting to Node.js runtime lets us `await result.usage` synchronously after streaming.

**Files:**
- Modify: `api/agent-stream.js`

**Step 1: Change runtime and handler signature**

Change the config and imports:

```javascript
// Old:
import { getCorsHeaders } from './_config/cors.js';
export const config = { runtime: 'edge' };
export default async function handler(req) {
  const corsHeaders = getCorsHeaders(req);

// New:
import { setNodeCorsHeaders } from './_config/cors.js';
export const config = { runtime: 'nodejs', maxDuration: 120 };
export default async function handler(req, res) {
  setNodeCorsHeaders(res, req);
```

**Step 2: Convert all early-return responses from `new Response(...)` to `res.status().json()`**

Every `return new Response(JSON.stringify({...}), { status: N, headers: {...} })` becomes `return res.status(N).json({...})`.

For the OPTIONS handler: `return res.status(200).end()`.

For the body parsing: change `await req.json()` to `req.body` (Node.js runtime uses parsed body).

**Step 3: Replace `onFinish` + `toTextStreamResponse` with `pipeTextStreamToResponse` + `await result.usage`**

Remove the entire `onFinish` callback from `streamText()`. After starting the stream, await usage and deduct synchronously:

```javascript
    const result = streamText({
      model,
      system: systemPrompt,
      messages,
      tools: agentTools,
      maxSteps: hasSearch ? 3 : 1,
      temperature: 0.7,
      maxTokens: 2000,
      // No onFinish — we handle billing after the stream
    });

    // Pipe stream to Node.js response (non-blocking)
    result.pipeTextStreamToResponse(res);

    // Wait for generation to complete, then deduct credits reliably
    const usage = await result.usage;

    if (authUser && usage) {
      const modelId = agent.model || 'moonshotai/kimi-k2';
      const deductResult = await deductCredits(
        authUser.id, modelId,
        usage.promptTokens || 0,
        usage.completionTokens || 0,
        sessionId || null
      );
      if (deductResult && !deductResult.success) {
        console.error('[billing] Stream deduction rejected:', deductResult.error, {
          userId: authUser.id, modelId,
          tokens: { prompt: usage.promptTokens, completion: usage.completionTokens },
        });
      }

      // Deduct search costs separately
      if (searchCount > 0) {
        try {
          await deductSearchCosts(authUser.id, searchCount, sessionId || null);
        } catch (searchErr) {
          console.error('[billing] Search deduction FAILED:', {
            error: searchErr.message, userId: authUser.id, searchCount,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } else if (authUser && !usage) {
      console.warn('[billing] No usage data from stream — credits not deducted', {
        userId: authUser.id, modelId: agent.model || 'moonshotai/kimi-k2',
        sessionId: sessionId || null,
      });
    }
```

**Step 4: Verify the complete rewritten file compiles**

The full handler should follow this structure:
1. `setNodeCorsHeaders(res, req)` at top
2. OPTIONS → `res.status(200).end()`
3. Auth checks → `res.status(4xx).json({...})`
4. Credit check → `res.status(402).json({...})`
5. `streamText()` without `onFinish`
6. `result.pipeTextStreamToResponse(res)`
7. `await result.usage` → `deductCredits()`
8. Catch block → `res.status(500).json({...})`

**Step 5: Commit**

```bash
git add api/agent-stream.js
git commit -m "fix(billing): convert agent-stream to Node.js runtime for reliable credit deduction

Edge Runtime killed async onFinish callbacks before credit deduction
could complete. Now uses pipeTextStreamToResponse + await result.usage
for synchronous post-stream billing."
```

---

### Task 3: Convert `plan-mission.js` from Edge to Node.js runtime

Same pattern as Task 2 but simpler (no search tools).

**Files:**
- Modify: `api/plan-mission.js`

**Step 1: Change runtime, imports, and handler signature**

```javascript
// Old:
import { getCorsHeaders } from './_config/cors.js';
export const config = { runtime: 'edge' };
export default async function handler(req) {
  const corsHeaders = getCorsHeaders(req);

// New:
import { setNodeCorsHeaders } from './_config/cors.js';
export const config = { runtime: 'nodejs', maxDuration: 120 };
export default async function handler(req, res) {
  setNodeCorsHeaders(res, req);
```

**Step 2: Convert all early-return responses to `res.status().json()`**

Same pattern as Task 2. Change `await req.json()` to `req.body`.

**Step 3: Replace `onFinish` + `toTextStreamResponse` with `pipeTextStreamToResponse` + `await result.usage`**

```javascript
    const result = streamText({
      model,
      system: PLANNER_PROMPT,
      messages: [
        { role: 'user', content: `Plan a mission for this objective: ${objective}` },
      ],
      temperature: 0.7,
      maxTokens: 3000,
      // No onFinish — billing handled after stream
    });

    result.pipeTextStreamToResponse(res);

    const usage = await result.usage;

    if (authUser && usage) {
      const deductResult = await deductCredits(
        authUser.id, 'moonshotai/kimi-k2',
        usage.promptTokens || 0,
        usage.completionTokens || 0
      );
      if (deductResult && !deductResult.success) {
        console.error('[billing] Plan deduction rejected:', deductResult.error, {
          userId: authUser.id,
          tokens: { prompt: usage.promptTokens, completion: usage.completionTokens },
        });
      }
    } else if (authUser && !usage) {
      console.warn('[billing] No usage data from plan stream — credits not deducted', {
        userId: authUser.id,
      });
    }
```

**Step 4: Commit**

```bash
git add api/plan-mission.js
git commit -m "fix(billing): convert plan-mission to Node.js runtime for reliable credit deduction"
```

---

### Task 4: Add logging to `agent.js` for missing usage and failed deductions

**Files:**
- Modify: `api/agent.js:306-321`

**Step 1: Add logging around the deduction block**

Replace lines 306-321:

```javascript
    // Deduct credits based on token usage
    let cost = null;
    let balance = null;
    if (authUser && data.usage) {
      const modelId = agent.model || 'moonshotai/kimi-k2';
      cost = calculateCost(modelId, data.usage.prompt_tokens || 0, data.usage.completion_tokens || 0);
      const deductResult = await deductCredits(
        authUser.id, modelId,
        data.usage.prompt_tokens || 0,
        data.usage.completion_tokens || 0,
        sessionId
      );
      if (deductResult?.success) {
        balance = deductResult.balance;
      } else if (deductResult && !deductResult.success) {
        console.error('[billing] Agent deduction rejected:', deductResult.error, {
          userId: authUser.id, modelId, cost, sessionId,
        });
      }
    } else if (authUser && !data.usage) {
      console.warn('[billing] OpenRouter returned no usage data — credits not deducted', {
        userId: authUser.id,
        modelId: agent.model || 'moonshotai/kimi-k2',
        sessionId,
        responseKeys: Object.keys(data || {}),
      });
    }
```

**Step 2: Commit**

```bash
git add api/agent.js
git commit -m "fix(billing): log missing usage data and failed deductions in agent.js"
```

---

### Task 5: Pass `sessionId` in client-side API calls

**Files:**
- Modify: `src/services/orchestrationService.js:30-35` (callAgent)
- Modify: `src/services/orchestrationService.js:48-52` (callAgentStream)
- Modify: `src/services/orchestrationService.js:228-230` (callAgent call site)
- Modify: `src/services/orchestrationService.js:291-308` (callAgentStream call site)
- Modify: `src/services/orchestrationService.js:962-966` (synthesis call site)

**Step 1: Add `sessionId` parameter to `callAgent` and `callAgentStream`**

```javascript
// callAgent — add sessionId parameter
async function callAgent(agent, messages, sessionId = null) {
  const response = await fetch('/api/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ agent, messages, sessionId }),
  });
  // ... rest unchanged
}

// callAgentStream — add sessionId parameter
async function callAgentStream(agent, messages, onDelta, sessionId = null) {
  const response = await fetch('/api/agent-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ agent, messages, sessionId }),
  });
  // ... rest unchanged
}
```

**Step 2: Pass `orchestrator.sessionId` at all call sites**

At the `callAgent` call site (~line 229, context compression):
```javascript
requestQueue.enqueue(agentId, 'background', () => callAgent(agent, msgs, orchestrator.sessionId))
```

At the `callAgentStream` call site (~line 294):
```javascript
() => callAgentStream(agentWithBudget, messages, (delta, accumulated) => {
  // ... delta handling unchanged
}, orchestrator.sessionId)
```

At the synthesis call site (~line 962-965):
```javascript
body: JSON.stringify({ agent: synthAgent, messages: synthMessages, sessionId: this.sessionId }),
```

**Step 3: Commit**

```bash
git add src/services/orchestrationService.js
git commit -m "fix(billing): pass sessionId in all client-side API calls for audit trail"
```

---

### Task 6: Final integration commit

**Step 1: Run all existing tests**

Run: `npx vitest run`
Expected: All pass.

**Step 2: Manual smoke test checklist**

- [ ] Start a mission → plan-mission.js should stream AND deduct credits
- [ ] Agent iteration → iterate.js credits deducted (already worked)
- [ ] Check `credit_transactions` table has entries with session_id populated
- [ ] Check Vercel function logs for any `[billing]` warnings

**Step 3: Final commit if any test fixes needed**
