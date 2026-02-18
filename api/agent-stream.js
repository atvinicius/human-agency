// Streaming Edge Function for AI Agent Execution
// Uses Vercel AI SDK for Server-Sent Events streaming
// Supports web search tool for researcher/coordinator roles

import { streamText, tool } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';
import { getCorsHeaders } from './_config/cors.js';
import { authenticateRequest, unauthorizedResponse } from './_middleware/auth.js';
import { checkCredits, deductCredits, deductSearchCosts } from './_middleware/credits.js';
import { checkRateLimit, rateLimitResponse } from './_middleware/rateLimit.js';
import { webSearch } from './search.js';

export const config = {
  runtime: 'edge',
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

export default async function handler(req) {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!OPENROUTER_API_KEY) {
    return new Response(JSON.stringify({ error: 'OpenRouter API key not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Authenticate request — require auth when running with billing enabled
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const authConfigured = !!(SUPABASE_URL && SUPABASE_SERVICE_KEY);
  const authUser = await authenticateRequest(req);

  // Fail-fast: if billing infra is partially configured, refuse to serve unauthenticated.
  // This prevents silently giving away free API calls when env vars are misconfigured.
  if (!authUser && (authConfigured || OPENROUTER_API_KEY)) {
    return unauthorizedResponse(corsHeaders);
  }

  try {
    // Rate limit per user (or IP for unauthenticated)
    const rateLimitKey = authUser?.id || req.headers.get('x-forwarded-for') || 'anon';
    const rateCheck = checkRateLimit(rateLimitKey, 'agent');
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.retryAfterMs, corsHeaders);
    }

    const { agent, messages, sessionId } = await req.json();

    // Credit check before making LLM call
    if (authUser) {
      const creditCheck = await checkCredits(authUser.id);
      if (creditCheck && !creditCheck.allowed) {
        return new Response(JSON.stringify({
          error: 'Insufficient credits',
          balance: creditCheck.balance,
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
      onFinish: async ({ usage }) => {
        // Deduct credits after stream completes
        if (authUser && usage) {
          const modelId = agent.model || 'moonshotai/kimi-k2';
          try {
            const result = await deductCredits(
              authUser.id, modelId,
              usage.promptTokens || 0,
              usage.completionTokens || 0,
              sessionId || null
            );
            if (result && !result.success) {
              console.error('[billing] Deduction rejected:', result.error, {
                userId: authUser.id, modelId,
                tokens: { prompt: usage.promptTokens, completion: usage.completionTokens },
              });
            }
          } catch (err) {
            // Critical: tokens were consumed but credits not deducted.
            // Log enough context for manual reconciliation.
            console.error('[billing] Deduction FAILED — needs reconciliation:', {
              error: err.message,
              userId: authUser.id,
              modelId,
              promptTokens: usage.promptTokens || 0,
              completionTokens: usage.completionTokens || 0,
              sessionId: sessionId || null,
              timestamp: new Date().toISOString(),
            });
          }

          // Deduct search costs separately (if any searches were performed)
          if (searchCount > 0) {
            try {
              await deductSearchCosts(authUser.id, searchCount, sessionId || null);
            } catch (searchErr) {
              console.error('[billing] Search deduction FAILED:', {
                error: searchErr.message,
                userId: authUser.id,
                searchCount,
                timestamp: new Date().toISOString(),
              });
            }
          }
        }
      },
    });

    return result.toTextStreamResponse({
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('Agent stream error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
