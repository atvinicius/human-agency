// Node.js runtime endpoint for mission planning
// Takes a user's objective and generates an agent tree configuration
// Uses pipeTextStreamToResponse + await usage for reliable billing

import { streamText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { setNodeCorsHeaders } from './_config/cors.js';
import { authenticateRequest } from './_middleware/auth.js';
import { checkCredits, deductCredits } from './_middleware/credits.js';
import { checkRateLimit } from './_middleware/rateLimit.js';

export const config = {
  runtime: 'nodejs',
  maxDuration: 120,
};

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const openrouter = createOpenRouter({
  apiKey: OPENROUTER_API_KEY,
});

const PLANNER_PROMPT = `You are a Mission Planner for Human Agency, an AI orchestration system where one human directs swarms of AI agents.

Given a user's objective, decompose it into a hierarchical team of AI agents.

Available agent roles:
- coordinator: Breaks down objectives, spawns sub-agents, monitors progress, synthesizes results
- researcher: Gathers information, analyzes data, identifies patterns, documents findings
- executor: Takes concrete action, produces tangible outputs (code, documents, plans)
- validator: Reviews outputs for quality, identifies errors, suggests improvements
- synthesizer: Combines outputs from multiple agents into coherent deliverables

You MUST respond with ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "name": "Short mission name (3-5 words)",
  "description": "One-sentence description of the mission",
  "estimated_agents": <number between 5 and 25>,
  "agent_config": {
    "root": {
      "role": "coordinator",
      "name": "Descriptive name for the coordinator",
      "objective": "High-level coordination objective",
      "children": [
        {
          "role": "researcher|executor|validator|synthesizer|coordinator",
          "name": "Descriptive name",
          "objective": "Specific, actionable objective for this agent",
          "children": [...]
        }
      ]
    }
  }
}

Guidelines:
- Start with a coordinator at the root
- You MUST produce between 5 and 15 agents total. No more than 15.
- Each agent should have a specific, actionable objective
- Group related work under sub-coordinators for complex missions
- Include at least one validator
- Include a synthesizer for the final output
- Make names descriptive (e.g., "Market Research Analyst", not "Agent 1")
- Make objectives specific (e.g., "Research competitor pricing models in the SaaS space", not "Do research")
- Maximum tree depth of 3 levels (root coordinator → specialists → sub-specialists)`;

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
  const authUser = await authenticateRequest(req);
  if (!authUser && ((SUPABASE_URL && SUPABASE_SERVICE_KEY) || OPENROUTER_API_KEY)) {
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

    const { objective } = req.body || {};

    if (!objective?.trim()) {
      return res.status(400).json({ error: 'Objective is required' });
    }

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

    const model = openrouter('moonshotai/kimi-k2');

    const result = streamText({
      model,
      system: PLANNER_PROMPT,
      messages: [
        { role: 'user', content: `Plan a mission for this objective: ${objective}` },
      ],
      temperature: 0.7,
      maxTokens: 3000,
      // No onFinish — billing handled synchronously after stream
    });

    result.pipeTextStreamToResponse(res);

    const usage = await result.usage;

    // Note: sessionId is not available here — the session hasn't been created yet at planning time
    if (authUser && usage) {
      try {
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
      } catch (err) {
        console.error('[billing] Plan deduction FAILED — needs reconciliation:', {
          error: err.message, userId: authUser.id,
          modelId: 'moonshotai/kimi-k2',
          promptTokens: usage.promptTokens || 0,
          completionTokens: usage.completionTokens || 0,
          timestamp: new Date().toISOString(),
        });
      }
    } else if (authUser && !usage) {
      console.warn('[billing] No usage data from plan stream — credits not deducted', {
        userId: authUser.id, modelId: 'moonshotai/kimi-k2',
      });
    }
  } catch (error) {
    console.error('Plan mission error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
