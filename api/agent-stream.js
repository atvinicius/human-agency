// Streaming Node.js Function for AI Agent Execution
// Uses Vercel AI SDK for Server-Sent Events streaming
// Supports web search tool for researcher/coordinator roles

import { streamText, tool } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';
import { setNodeCorsHeaders } from './_config/cors.js';
import { authenticateRequest } from './_middleware/auth.js';
import { checkCredits, deductCredits, deductSearchCosts } from './_middleware/credits.js';
import { checkRateLimit } from './_middleware/rateLimit.js';
import { webSearch } from './search.js';

export const config = {
  runtime: 'nodejs',
  maxDuration: 120,
};

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const openrouter = createOpenRouter({
  apiKey: OPENROUTER_API_KEY,
});

// System prompts for different agent roles
const ROLE_PROMPTS = {
  coordinator: `You are a Coordinator agent in an AI orchestration system. Your role is to:
- Break down complex objectives into manageable sub-tasks
- Decide what types of specialist agents to spawn (researcher, executor, validator, synthesizer)
- Monitor progress and adjust strategy as needed
- Synthesize results from sub-agents into coherent outcomes

Always think step-by-step about how to decompose the work. Be specific about what each sub-agent should do.`,

  researcher: `You are a Researcher agent in an AI orchestration system. Your role is to:
- Gather information and analyze data relevant to your objective
- Identify patterns, insights, and key findings
- Document sources and confidence levels
- Provide structured findings to other agents

Be thorough but focused. Prioritize actionable insights over exhaustive coverage.`,

  executor: `You are an Executor agent in an AI orchestration system. Your role is to:
- Take concrete action to accomplish your objective
- Produce tangible outputs (code, documents, plans, etc.)
- Follow best practices for your domain
- Report progress and blockers clearly

Focus on quality execution. Ask for clarification if requirements are ambiguous.`,

  validator: `You are a Validator agent in an AI orchestration system. Your role is to:
- Review outputs from other agents for quality and correctness
- Identify errors, inconsistencies, or gaps
- Suggest improvements and flag risks
- Verify that work meets the original requirements

Be critical but constructive. Prioritize issues by severity.`,

  synthesizer: `You are a Synthesizer agent in an AI orchestration system. Your role is to:
- Combine outputs from multiple agents into coherent deliverables
- Resolve conflicts between different sources
- Create summaries and executive-level overviews
- Ensure consistency in format and voice

Focus on clarity and actionability. Make complex information accessible.`,
};

export default async function handler(req, res) {
  setNodeCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'OpenRouter API key not configured' });
  }

  // Authenticate request — require auth when running with billing enabled
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const authConfigured = !!(SUPABASE_URL && SUPABASE_SERVICE_KEY);
  const authUser = await authenticateRequest(req);

  // Fail-fast: if billing infra is partially configured, refuse to serve unauthenticated.
  // This prevents silently giving away free API calls when env vars are misconfigured.
  if (!authUser && (authConfigured || OPENROUTER_API_KEY)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Rate limit per user (or IP for unauthenticated)
    const rateLimitKey = authUser?.id || req.headers['x-forwarded-for'] || 'anon';
    const rateCheck = checkRateLimit(rateLimitKey, 'agent');
    if (!rateCheck.allowed) {
      const retryAfterSec = Math.ceil(rateCheck.retryAfterMs / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: retryAfterSec,
      });
    }

    const { agent, messages, sessionId } = req.body || {};

    // Credit check before making LLM call
    if (authUser) {
      const creditCheck = await checkCredits(authUser.id);
      if (creditCheck && !creditCheck.allowed) {
        return res.status(402).json({
          error: 'Insufficient credits',
          balance: creditCheck.balance,
        });
      }
    }

    // Build spawn constraints section for system prompt
    const spawnBudget = agent.context?.spawn_budget;
    let spawnConstraints = '';
    if (spawnBudget) {
      spawnConstraints = `\n\nSpawning constraints:
- Remaining agent slots: ${spawnBudget.remaining}
- Current depth: ${spawnBudget.depth} / ${spawnBudget.maxDepth}${spawnBudget.nearLimit ? '\n- Agent budget is running low. Focus on completing your work rather than spawning.' : ''}
- Prefer doing work yourself over delegating when possible.`;
    }

    // Build search tool instruction for eligible roles
    const hasSearch = ['researcher', 'coordinator'].includes(agent.role) && process.env.SERPER_API_KEY;
    let searchInstruction = '';
    if (hasSearch) {
      searchInstruction = `\n\nYou have access to a webSearch tool for current information.
Search for facts, data, and recent developments relevant to your objective.
After gathering information, produce your JSON response.
If you used web search, include a "searches" array in your JSON: [{"query": "...", "resultCount": N}]`;
    }

    const systemPrompt = `${ROLE_PROMPTS[agent.role] || ROLE_PROMPTS.executor}

Current Objective: ${agent.objective}

Context:
${JSON.stringify(agent.context || {}, null, 2)}${spawnConstraints}${searchInstruction}

Respond with a JSON object containing:
- "thinking": Your reasoning process (string)
- "activity": What you're currently doing (short string for UI display)
- "progress_delta": How much progress this represents (0-20)
- "output": Your actual work output (string or object)
- "sources": Array of sources referenced (optional), each with {url, title, relevant_quote} — include URLs from search results you relied on
- "confidence": Self-assessed confidence in your output: "high", "medium", or "low" (optional)
- "search_context": Array of search context (optional), each with {query, key_results: [{title, url}]} — link your searches to their key results
- "spawn_agents": Array of agents to spawn (optional), each with {role, name, objective}
- "needs_input": If you need human input, {type: "approval"|"choice"|"text", title, message, options?}
- "complete": Boolean, true if objective is fully accomplished
- "artifacts": Array of outputs to save (optional), each with {type, name, content}`;

    const model = openrouter(agent.model || 'moonshotai/kimi-k2');

    // Build tools — only researchers and coordinators get search
    let searchCount = 0;
    const agentTools = hasSearch
      ? {
          webSearch: tool({
            description: 'Search the web for current information relevant to your research objective.',
            parameters: z.object({
              query: z.string().describe('Search query — be specific and targeted'),
            }),
            execute: async ({ query }) => {
              searchCount++;
              if (searchCount > 5) {
                return { error: 'Search limit reached for this call. Produce your findings now.' };
              }
              try {
                return await webSearch(query);
              } catch (err) {
                return { error: `Search failed: ${err.message}`, results: [] };
              }
            },
          }),
        }
      : {};

    const result = streamText({
      model,
      system: systemPrompt,
      messages,
      tools: agentTools,
      maxSteps: hasSearch ? 3 : 1,
      temperature: 0.7,
      maxTokens: 2000,
      // No onFinish — billing handled synchronously after stream
    });

    // Pipe stream to Node.js response (non-blocking)
    result.pipeTextStreamToResponse(res);

    // Wait for generation to complete, then deduct credits reliably
    const usage = await result.usage;

    if (authUser && usage) {
      const modelId = agent.model || 'moonshotai/kimi-k2';
      try {
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
      } catch (err) {
        console.error('[billing] Stream deduction FAILED — needs reconciliation:', {
          error: err.message, userId: authUser.id, modelId,
          promptTokens: usage.promptTokens || 0,
          completionTokens: usage.completionTokens || 0,
          sessionId: sessionId || null,
          timestamp: new Date().toISOString(),
        });
      }

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
  } catch (error) {
    console.error('Agent stream error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
