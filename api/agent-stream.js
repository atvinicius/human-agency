// Streaming Node.js Function for AI Agent Execution
// Uses Vercel AI SDK for Server-Sent Events streaming
// Supports web search tool for researcher/coordinator roles

import { streamText, tool } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';
import { setNodeCorsHeaders } from './_config/cors.js';
import { buildSystemPrompt } from './_config/prompts.js';
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

    // Build system prompt using shared prompt builder
    const spawnBudget = agent.context?.spawn_budget || null;
    const hasSearch = ['researcher', 'coordinator'].includes(agent.role) && process.env.SERPER_API_KEY;
    const systemPrompt = buildSystemPrompt(
      { role: agent.role, objective: agent.objective, context: agent.context || {} },
      spawnBudget,
      !!hasSearch
    );

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
