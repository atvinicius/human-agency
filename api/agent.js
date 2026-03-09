// Vercel Serverless Function for AI Agent Execution
// This runs server-side, keeping API keys secure

import { createClient } from '@supabase/supabase-js';
import { getCorsHeaders } from './_config/cors.js';
import { buildSystemPrompt } from './_config/prompts.js';
import { authenticateRequest, unauthorizedResponse } from './_middleware/auth.js';
import { checkCredits, deductCredits } from './_middleware/credits.js';
import { checkRateLimit, rateLimitResponse } from './_middleware/rateLimit.js';
import { calculateCost } from './_config/pricing.js';
import { sanitizeSpawnConfig } from './_lib/spawnLogic.js';

export const config = {
  runtime: 'edge',
};

// Server-side environment variables (no VITE_ prefix)
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Create server-side Supabase client with service key (bypasses RLS)
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    })
  : null;

// Helper to persist agent updates to database
async function persistAgentUpdate(agentId, updates, sessionId) {
  if (!supabaseAdmin) return;

  try {
    await supabaseAdmin
      .from('agents')
      .update(updates)
      .eq('id', agentId);

    // Log event
    if (updates.current_activity) {
      await supabaseAdmin.from('events').insert({
        session_id: sessionId,
        agent_id: agentId,
        type: 'activity',
        message: updates.current_activity,
      });
    }
  } catch (error) {
    console.error('Error persisting agent update:', error);
  }
}

// Helper to create child agents in database
async function createChildAgent(parentAgent, childConfig, sessionId) {
  if (!supabaseAdmin) return null;

  const safe = sanitizeSpawnConfig(childConfig);
  const childAgent = {
    id: crypto.randomUUID(),
    session_id: sessionId,
    parent_id: parentAgent.id,
    name: safe.name,
    role: safe.role,
    objective: safe.objective,
    status: 'spawning',
    priority: 'normal',
    progress: 0,
    current_activity: 'Initializing...',
    model: parentAgent.model || 'moonshotai/kimi-k2',
  };

  try {
    await supabaseAdmin.from('agents').insert(childAgent);
    await supabaseAdmin.from('events').insert({
      session_id: sessionId,
      agent_id: childAgent.id,
      type: 'spawn',
      message: `${childAgent.name} spawned as ${childAgent.role}`,
    });
    return childAgent;
  } catch (error) {
    console.error('Error creating child agent:', error);
    return null;
  }
}

// Helper to save artifacts
async function saveArtifact(artifact, agentId, sessionId) {
  if (!supabaseAdmin) return;

  try {
    await supabaseAdmin.from('artifacts').insert({
      session_id: sessionId,
      agent_id: agentId,
      type: artifact.type,
      name: artifact.name,
      content: artifact.content,
    });
  } catch (error) {
    console.error('Error saving artifact:', error);
  }
}

export default async function handler(req) {
  // CORS headers for frontend
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
  const authUser = await authenticateRequest(req);
  if (!authUser && ((SUPABASE_URL && SUPABASE_SERVICE_KEY) || OPENROUTER_API_KEY)) {
    return unauthorizedResponse(corsHeaders);
  }

  try {
    // Rate limit per user (or IP for unauthenticated)
    const rateLimitKey = authUser?.id || req.headers.get('x-forwarded-for') || 'anon';
    const rateCheck = checkRateLimit(rateLimitKey, 'agent');
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.retryAfterMs, corsHeaders);
    }

    const body = await req.json();
    const { agent, messages, sessionId } = body;

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

    // Build system prompt using shared prompt builder
    const spawnBudget = agent.context?.spawn_budget || null;
    const systemPrompt = buildSystemPrompt(
      { role: agent.role, objective: agent.objective, context: agent.context || {} },
      spawnBudget,
      false // no search in non-streaming endpoint
    );

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://humanagency.ai',
        'X-Title': 'Human Agency',
      },
      body: JSON.stringify({
        model: agent.model || 'moonshotai/kimi-k2',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenRouter error:', error);
      return new Response(JSON.stringify({ error: 'AI request failed' }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {
        thinking: 'Processing...',
        activity: 'Working on objective',
        progress_delta: 5,
        output: content,
        complete: false,
      };
    }

    // Persist updates to database if configured
    if (supabaseAdmin && sessionId) {
      // Update agent progress
      await persistAgentUpdate(agent.id, {
        current_activity: parsed.activity,
        progress: Math.min(100, (agent.progress || 0) + (parsed.progress_delta || 5)),
        status: parsed.complete ? 'completed' : parsed.needs_input ? 'waiting' : 'working',
        pending_input: parsed.needs_input || null,
        context: {
          ...(agent.context || {}),
          lastThinking: parsed.thinking,
          lastOutput: parsed.output,
        },
      }, sessionId);

      // Create child agents if requested
      const createdChildren = [];
      if (parsed.spawn_agents && parsed.spawn_agents.length > 0) {
        for (const childConfig of parsed.spawn_agents) {
          const child = await createChildAgent(agent, childConfig, sessionId);
          if (child) createdChildren.push(child);
        }
      }
      parsed.created_children = createdChildren;

      // Save artifacts
      if (parsed.artifacts && parsed.artifacts.length > 0) {
        for (const artifact of parsed.artifacts) {
          await saveArtifact(artifact, agent.id, sessionId);
        }
      }
    }

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

    return new Response(JSON.stringify({
      success: true,
      result: parsed,
      usage: data.usage,
      cost,
      balance,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Agent handler error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
