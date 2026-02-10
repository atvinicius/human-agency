// Vercel Serverless Function for AI Agent Execution
// This runs server-side, keeping API keys secure

import { createClient } from '@supabase/supabase-js';

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

  const childAgent = {
    id: crypto.randomUUID(),
    session_id: sessionId,
    parent_id: parentAgent.id,
    name: childConfig.name,
    role: childConfig.role,
    objective: childConfig.objective,
    status: 'spawning',
    priority: 'normal',
    progress: 0,
    current_activity: 'Initializing...',
    model: parentAgent.model || 'anthropic/claude-3.5-sonnet',
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
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

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

  try {
    const body = await req.json();
    const { agent, messages, sessionId } = body;

    // Build system prompt based on role
    const systemPrompt = `${ROLE_PROMPTS[agent.role] || ROLE_PROMPTS.executor}

Current Objective: ${agent.objective}

Context:
${JSON.stringify(agent.context || {}, null, 2)}

Respond with a JSON object containing:
- "thinking": Your reasoning process (string)
- "activity": What you're currently doing (short string for UI display)
- "progress_delta": How much progress this represents (0-20)
- "output": Your actual work output (string or object)
- "spawn_agents": Array of agents to spawn (optional), each with {role, name, objective}
- "needs_input": If you need human input, {type: "approval"|"choice"|"text", title, message, options?}
- "complete": Boolean, true if objective is fully accomplished
- "artifacts": Array of outputs to save (optional), each with {type, name, content}`;

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://humanagency.ai',
        'X-Title': 'Human Agency',
      },
      body: JSON.stringify({
        model: agent.model || 'anthropic/claude-3.5-sonnet',
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
      return new Response(JSON.stringify({ error: 'AI request failed', details: error }), {
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

    return new Response(JSON.stringify({
      success: true,
      result: parsed,
      usage: data.usage,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Agent handler error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
