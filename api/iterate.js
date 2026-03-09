// Server-side agent iteration endpoint
// Processes up to BATCH_SIZE agents concurrently per invocation.
// Called by api/orchestrate.js (pg_cron) or client-side polling.

import { generateText, tool } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { buildSystemPrompt } from './_config/prompts.js';
import { parseAgentResponse } from './_lib/parseResponse.js';
import { canSpawn, createAgentFromConfig, sanitizeSpawnConfig, DEFAULT_BUDGET } from './_lib/spawnLogic.js';
import { loadMessages, saveMessages, getSiblingFindings, getChildCompletions, checkMissionComplete } from './_lib/agentQueries.js';
import { calculateCost, SEARCH_PRICING, PLATFORM_MARKUP } from './_config/pricing.js';
import { setNodeCorsHeaders } from './_config/cors.js';
import { webSearch } from './search.js';

export const config = {
  runtime: 'nodejs',
  maxDuration: 300,
};

const BATCH_SIZE = 3;

const ORCHESTRATE_SECRET = process.env.ORCHESTRATE_SECRET;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

// Context compression constants
const COMPRESS_WINDOW = 4;
const COMPRESS_EVERY = 3;

// Role-based default max iterations (used when agent.max_iterations is not set)
const DEFAULT_MAX_ITERATIONS = {
  validator: 5,
  synthesizer: 5,
  researcher: 7,
  executor: 7,
  coordinator: 10,
};

// Early completion: force-complete after this many consecutive low-output iterations
const LOW_OUTPUT_THRESHOLD = 50; // chars
const MAX_CONSECUTIVE_LOW_OUTPUT = 2;

/**
 * Compress older messages into a summary via LLM, keeping recent context.
 */
async function compressContext(messages, agentObjective, openrouter) {
  if (messages.length <= COMPRESS_WINDOW + 1) return { messages, usage: null };

  const oldMessages = messages.slice(0, -COMPRESS_WINDOW);
  const recentMessages = messages.slice(-COMPRESS_WINDOW);

  const summaryContent = oldMessages
    .map((m) => `[${m.role}]: ${typeof m.content === 'string' ? m.content.slice(0, 500) : JSON.stringify(m.content).slice(0, 500)}`)
    .join('\n');

  try {
    const { text, usage } = await generateText({
      model: openrouter('moonshotai/kimi-k2'),
      system: 'You are a concise summarizer. Summarize the conversation in 2-3 sentences.',
      messages: [
        {
          role: 'user',
          content: `Summarize the following agent conversation for objective: "${agentObjective}".\nFocus on: key decisions made, important findings, current state, and what needs to happen next.\nBe concise — 2-3 sentences maximum.\n\n${summaryContent}`,
        },
      ],
      maxTokens: 300,
      temperature: 0.3,
    });

    return {
      messages: [
        { role: 'user', content: `Context summary of your work so far:\n${text}\n\nContinue from where you left off.` },
        ...recentMessages,
      ],
      usage,
    };
  } catch {
    return {
      messages: [
        { role: 'user', content: `You have been working on: "${agentObjective}". Continue your work.` },
        ...recentMessages,
      ],
      usage: null,
    };
  }
}

/**
 * Run synthesis: compile all agent outputs into a final report.
 */
async function runSynthesis(supabase, openrouter, session) {
  const { data: agents } = await supabase
    .from('agents')
    .select('id, name, role, objective, completion_output')
    .eq('session_id', session.id)
    .eq('status', 'completed')
    .not('completion_output', 'is', null);

  if (!agents || agents.length === 0) {
    await supabase.from('report_sections').insert({
      session_id: session.id,
      agent_id: null,
      agent_name: 'System',
      content: 'No agent outputs to synthesize.',
      type: 'synthesis',
    });
    await supabase.from('sessions').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', session.id);
    return;
  }

  const allOutputs = agents
    .map((a) => `## ${a.name} (${a.role})\n**Objective:** ${a.objective || 'N/A'}\n\n${a.completion_output}`)
    .join('\n\n---\n\n');

  const { data: searchFindings } = await supabase
    .from('findings')
    .select('agent_name, content')
    .eq('session_id', session.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const sourcesContext = searchFindings && searchFindings.length > 0
    ? `\n\nKey findings from research agents:\n${searchFindings.map((f) => `- ${f.agent_name}: ${f.content.slice(0, 200)}`).join('\n')}`
    : '';

  const objective = session.objective || session.metadata?.preset_config?.initial_objective || 'the mission objective';

  try {
    const { text, usage } = await generateText({
      model: openrouter('moonshotai/kimi-k2'),
      system: `You are a Synthesizer. Combine agent findings into a comprehensive, well-structured markdown report. Include an executive summary, key findings organized by theme, and a conclusion. Cite agent names when referencing their work.`,
      messages: [
        {
          role: 'user',
          content: `Here are the findings from all agents:\n\n${allOutputs.slice(0, 8000)}${sourcesContext}\n\nSynthesize these into a comprehensive, well-structured markdown report for: ${objective}\n\nStructure your report with:\n1. Executive Summary (2-3 paragraphs)\n2. Key Findings (organized by theme, not by agent)\n3. Analysis & Implications\n4. Conclusion & Recommendations\n\nOutput ONLY the markdown report text, no JSON wrapper.`,
        },
      ],
      maxTokens: 4000,
      temperature: 0.7,
    });

    await supabase.from('report_sections').insert({
      session_id: session.id,
      agent_id: null,
      agent_name: 'Final Synthesizer',
      content: text,
      type: 'synthesis',
    });

    if (session.user_id && usage) {
      const cost = calculateCost('moonshotai/kimi-k2', usage.promptTokens || 0, usage.completionTokens || 0);
      if (cost > 0) {
        const { data: deductResult, error: deductError } = await supabase.rpc('deduct_credits', {
          p_user_id: session.user_id,
          p_amount: cost,
          p_model_id: 'moonshotai/kimi-k2',
          p_prompt_tokens: usage.promptTokens || 0,
          p_completion_tokens: usage.completionTokens || 0,
          p_session_id: session.id,
          p_description: 'Synthesis',
        });
        if (deductError) {
          console.error('[billing] Synthesis deduction FAILED:', { error: deductError.message, userId: session.user_id, cost, sessionId: session.id });
        } else if (deductResult && !deductResult.success) {
          console.error('[billing] Synthesis deduction rejected:', deductResult.error);
        }
      }
    }
  } catch (err) {
    console.error('Synthesis LLM call failed:', err);
    await supabase.from('report_sections').insert({
      session_id: session.id,
      agent_id: null,
      agent_name: 'System',
      content: allOutputs,
      type: 'synthesis',
    });
  }

  await supabase.from('sessions').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
  }).eq('id', session.id);
}

/**
 * Process one agent iteration. Extracted from the handler for batch parallelism.
 * Returns a result summary object.
 */
async function processOneAgent(agent, supabase, openrouter, session) {
  const sessionId = session.id;
  const iteration = (agent.iteration || 0) + 1;
  const maxIterations = agent.max_iterations || DEFAULT_MAX_ITERATIONS[agent.role] || 10;
  const newMessages = [];

  // --- Load message history ---
  let messages = await loadMessages(supabase, agent.id);

  if (messages.length === 0) {
    messages = [{ role: 'user', content: `Begin working on your objective: ${agent.objective}` }];
    await saveMessages(supabase, agent.id, messages);
  }

  // --- Context compression ---
  if (iteration > 1 && iteration % COMPRESS_EVERY === 0 && messages.length > COMPRESS_WINDOW + 1) {
    const compressed = await compressContext(messages, agent.objective, openrouter);
    messages = compressed.messages;
    await supabase.from('agent_messages').delete().eq('agent_id', agent.id);
    await saveMessages(supabase, agent.id, messages);

    if (session.user_id && compressed.usage) {
      const compressCost = calculateCost('moonshotai/kimi-k2', compressed.usage.promptTokens || 0, compressed.usage.completionTokens || 0);
      if (compressCost > 0) {
        await supabase.rpc('deduct_credits', {
          p_user_id: session.user_id,
          p_amount: compressCost,
          p_model_id: 'moonshotai/kimi-k2',
          p_prompt_tokens: compressed.usage.promptTokens || 0,
          p_completion_tokens: compressed.usage.completionTokens || 0,
          p_session_id: sessionId,
          p_description: `Context compression: ${agent.name}`,
        });
      }
    }
  }

  // --- Child completion injection ---
  const { data: children } = await supabase
    .from('agents')
    .select('id, status')
    .eq('session_id', sessionId)
    .eq('parent_id', agent.id);

  const hasChildren = children && children.length > 0;
  let childrenCompleted = false;

  if (hasChildren) {
    const childIds = children.map((c) => c.id);
    childrenCompleted = children.every((c) => ['completed', 'failed'].includes(c.status));

    const completions = await getChildCompletions(
      supabase, sessionId, childIds, agent.last_completion_check
    );

    if (completions.length > 0) {
      const summaries = completions.map((c) => {
        const output = c.output.length > 300 ? c.output.slice(0, 300) + '...' : c.output;
        return `${c.name}: ${output}`;
      }).join('\n\n');

      const completionMsg = {
        role: 'user',
        content: `Child agent(s) completed with findings:\n${summaries}\n\nIncorporate these findings into your work.`,
      };
      messages.push(completionMsg);
      newMessages.push(completionMsg);
    }
  }

  // --- Sibling awareness every 3rd iteration ---
  if (iteration % 3 === 0 && agent.parent_id) {
    const siblingFindings = await getSiblingFindings(
      supabase, sessionId, agent.id, agent.parent_id
    );
    if (siblingFindings.length > 0) {
      const siblingMsg = {
        role: 'user',
        content: `Team update — your sibling agents have found:\n${siblingFindings.join('\n')}\nAvoid duplicating this work.`,
      };
      messages.push(siblingMsg);
      newMessages.push(siblingMsg);
    }
  }

  // --- Build spawn budget ---
  const { data: allAgents } = await supabase
    .from('agents')
    .select('id, parent_id, status')
    .eq('session_id', sessionId);

  const spawnCheck = canSpawn(allAgents || [], agent.id, DEFAULT_BUDGET);
  const spawnBudget = {
    remaining: spawnCheck.remaining,
    depth: agent.depth || 0,
    maxDepth: DEFAULT_BUDGET.maxDepth,
    nearLimit: (allAgents || []).length >= DEFAULT_BUDGET.softCap,
  };

  // --- Build system prompt with position context ---
  const agentForPrompt = {
    role: agent.role,
    objective: agent.objective,
    context: agent.context || {},
  };

  const hasSearchKey = !!process.env.SERPER_API_KEY;
  const positionContext = {
    hasChildren,
    childrenCompleted,
    isLeaf: !hasChildren,
    iteration,
    maxIterations,
  };
  const systemPrompt = buildSystemPrompt(agentForPrompt, spawnBudget, hasSearchKey, positionContext);

  // --- Build search tool ---
  const isSearchEligible = ['researcher', 'coordinator'].includes(agent.role) && hasSearchKey;
  let searchCount = 0;
  const sessionSearchCount = session.search_count || 0;
  const agentTools = isSearchEligible ? {
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
        if (sessionSearchCount + searchCount > DEFAULT_BUDGET.maxSearchesPerMission) {
          return { error: 'Mission search budget exhausted.' };
        }
        try {
          return await webSearch(query);
        } catch (err) {
          return { error: `Search failed: ${err.message}`, results: [] };
        }
      },
    }),
  } : {};

  // --- Call LLM ---
  const model = openrouter(agent.model || 'moonshotai/kimi-k2');
  const { text, usage } = await generateText({
    model,
    system: systemPrompt,
    messages,
    tools: agentTools,
    maxSteps: isSearchEligible ? 3 : 1,
    temperature: 0.7,
    maxTokens: 2000,
  });

  const result = parseAgentResponse(text);

  const assistantMsg = { role: 'assistant', content: text };
  newMessages.push(assistantMsg);

  // --- Update search count atomically and deduct search credits ---
  if (searchCount > 0) {
    await supabase.rpc('increment_search_count', {
      p_session_id: sessionId,
      p_increment: searchCount,
    });

    if (session.user_id) {
      const searchCost = Math.round(searchCount * SEARCH_PRICING.cost_per_search * PLATFORM_MARKUP * 10000) / 10000;
      if (searchCost > 0) {
        await supabase.rpc('deduct_credits', {
          p_user_id: session.user_id,
          p_amount: searchCost,
          p_model_id: null,
          p_prompt_tokens: null,
          p_completion_tokens: null,
          p_session_id: sessionId,
          p_description: `${searchCount} web search(es)`,
        });
      }
    }
  }

  // --- Deduct LLM credits ---
  if (session.user_id && usage) {
    const modelId = agent.model || 'moonshotai/kimi-k2';
    const cost = calculateCost(modelId, usage.promptTokens || 0, usage.completionTokens || 0);
    if (cost > 0) {
      const { data: deductResult, error: deductError } = await supabase.rpc('deduct_credits', {
        p_user_id: session.user_id,
        p_amount: cost,
        p_model_id: modelId,
        p_prompt_tokens: usage.promptTokens || 0,
        p_completion_tokens: usage.completionTokens || 0,
        p_session_id: sessionId,
        p_description: `Agent: ${agent.name}`,
      });
      if (deductError) {
        console.error('[billing] Agent deduction FAILED:', { error: deductError.message, userId: session.user_id, agentName: agent.name, cost, sessionId });
      } else if (deductResult && !deductResult.success) {
        console.error('[billing] Agent deduction rejected:', deductResult.error);
      }
    }
  }

  // --- Register finding ---
  if (result.output && String(result.output).length > 50) {
    const outputStr = typeof result.output === 'string' ? result.output : JSON.stringify(result.output);
    await supabase.from('findings').insert({
      session_id: sessionId,
      agent_id: agent.id,
      agent_name: agent.name,
      agent_role: agent.role,
      content: outputStr.slice(0, 5000),
    });
    await supabase.from('report_sections').insert({
      session_id: sessionId,
      agent_id: agent.id,
      agent_name: agent.name,
      role: agent.role,
      content: outputStr,
      type: 'output',
    });
  }

  // --- Register artifacts ---
  if (result.artifacts && result.artifacts.length > 0) {
    for (const artifact of result.artifacts) {
      await supabase.from('report_sections').insert({
        session_id: sessionId,
        agent_id: agent.id,
        agent_name: agent.name,
        role: agent.role,
        title: artifact.name,
        content: artifact.content,
        type: 'artifact',
      });
    }
  }

  // --- Write events ---
  const events = [];
  if (result.activity) {
    events.push({
      session_id: sessionId,
      agent_id: agent.id,
      type: 'activity',
      message: `${agent.name}: ${result.activity}`,
    });
  }
  if (result.searches && result.searches.length > 0) {
    for (const search of result.searches) {
      events.push({
        session_id: sessionId,
        agent_id: agent.id,
        type: 'search',
        message: `${agent.name} searched: "${search.query}" (${search.resultCount || 0} results)`,
      });
    }
  }
  if (events.length > 0) {
    await supabase.from('events').insert(events);
  }

  // --- Handle spawn requests ---
  if (result.spawn_agents && result.spawn_agents.length > 0 && spawnCheck.allowed) {
    const agentsToSpawn = result.spawn_agents.slice(0, spawnCheck.remaining);
    const spawned = [];

    for (const rawConfig of agentsToSpawn) {
      const spawnConfig = sanitizeSpawnConfig(rawConfig);
      const childAgent = createAgentFromConfig(
        spawnConfig, sessionId, agent.id, (agent.depth || 0) + 1
      );
      childAgent.context = {
        ...childAgent.context,
        parent_objective: agent.objective,
        parent_findings: String(result.output || '').slice(0, 500),
      };
      spawned.push(childAgent);
    }

    if (spawned.length > 0) {
      await supabase.from('agents').insert(spawned);
      const spawnEvents = spawned.map((s) => ({
        session_id: sessionId,
        agent_id: s.id,
        type: 'spawn',
        message: `${s.name} spawned as ${s.role}`,
      }));
      await supabase.from('events').insert(spawnEvents);
    }
  } else if (result.spawn_agents && result.spawn_agents.length > 0 && !spawnCheck.allowed) {
    const noSpawnMsg = {
      role: 'user',
      content: `Cannot spawn additional agents: ${spawnCheck.reason}. Complete your objective with your own analysis instead.`,
    };
    newMessages.push(noSpawnMsg);
  }

  // --- Early completion detection ---
  const outputLen = result.output ? String(result.output).length : 0;
  let consecutiveLow = agent.consecutive_low_output || 0;
  if (outputLen < LOW_OUTPUT_THRESHOLD) {
    consecutiveLow++;
  } else {
    consecutiveLow = 0;
  }

  const earlyComplete = consecutiveLow >= MAX_CONSECUTIVE_LOW_OUTPUT;
  let isComplete = result.complete || iteration >= maxIterations || earlyComplete;

  const completionOutput = result.output
    ? (typeof result.output === 'string' ? result.output : JSON.stringify(result.output))
    : '';

  // --- Handle needs_input ---
  if (result.needs_input && !isComplete) {
    await supabase.from('agents').update({
      status: 'waiting',
      pending_input: result.needs_input,
      current_activity: `Waiting for input: ${result.needs_input.title || 'Human input needed'}`,
      iteration,
      consecutive_low_output: consecutiveLow,
      last_completion_check: new Date().toISOString(),
    }).eq('id', agent.id);

    await saveMessages(supabase, agent.id, newMessages);
    return { action: 'waiting_for_input', agentId: agent.id, agentName: agent.name, iteration };
  }

  if (isComplete) {
    if (!result.complete && iteration >= maxIterations) {
      newMessages.push({ role: 'user', content: 'Max iterations reached. Finalize your work.' });
    } else if (earlyComplete && !result.complete) {
      newMessages.push({ role: 'user', content: 'No new substantial output detected. Finalizing.' });
    }

    await supabase.from('agents').update({
      status: 'completed',
      progress: 100,
      current_activity: earlyComplete && !result.complete ? 'Early completion (plateau detected)' : 'Objective complete',
      completion_output: completionOutput.slice(0, 10000),
      iteration,
      consecutive_low_output: consecutiveLow,
      last_completion_check: new Date().toISOString(),
    }).eq('id', agent.id);

    await supabase.from('events').insert({
      session_id: sessionId,
      agent_id: agent.id,
      type: 'complete',
      message: `${agent.name} completed${earlyComplete && !result.complete ? ' (plateau)' : ''}`,
    });

    const missionDone = await checkMissionComplete(supabase, sessionId);
    if (missionDone) {
      await supabase.from('sessions').update({ status: 'synthesizing' }).eq('id', sessionId);
    }
  } else {
    const continueMsg = { role: 'user', content: 'Continue working. What is your next step?' };
    newMessages.push(continueMsg);

    await supabase.from('agents').update({
      status: 'working',
      current_activity: result.activity || 'Processing...',
      progress: Math.min(95, (agent.progress || 0) + (result.progress_delta || 5)),
      iteration,
      consecutive_low_output: consecutiveLow,
      last_completion_check: new Date().toISOString(),
      context: {
        ...(agent.context || {}),
        lastThinking: result.thinking,
        lastOutput: typeof result.output === 'string' ? result.output?.slice(0, 500) : JSON.stringify(result.output)?.slice(0, 500),
      },
    }).eq('id', agent.id);
  }

  await saveMessages(supabase, agent.id, newMessages);

  return {
    action: isComplete ? 'completed' : 'iterated',
    agentId: agent.id,
    agentName: agent.name,
    iteration,
  };
}

export default async function handler(req, res) {
  setNodeCorsHeaders(res, req);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth: accept EITHER the orchestrate secret OR a user Bearer token
  const secret = req.headers['x-orchestrate-secret'];
  const authHeader = req.headers['authorization'];
  let authUserId = null;

  if (ORCHESTRATE_SECRET && secret === ORCHESTRATE_SECRET) {
    // Server secret — trusted
  } else if (authHeader?.startsWith('Bearer ') && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    const token = authHeader.slice(7);
    const supabaseForAuth = getSupabaseAdmin();
    if (supabaseForAuth && token) {
      const { data: { user }, error: authError } = await supabaseForAuth.auth.getUser(token);
      if (authError || !user) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      authUserId = user.id;
    } else {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  } else {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'OpenRouter API key not configured' });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const openrouter = createOpenRouter({ apiKey: OPENROUTER_API_KEY });

  try {
    const { sessionId, mode } = req.body || {};
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    // Load session
    const { data: session } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Session ownership check
    if (authUserId) {
      if (!session.user_id) {
        await supabase.from('sessions')
          .update({ user_id: authUserId })
          .eq('id', sessionId)
          .is('user_id', null);
        session.user_id = authUserId;
      }
      if (session.user_id !== authUserId) {
        return res.status(403).json({ error: 'Session does not belong to this user' });
      }
    }

    // === Mission duration cap: 30 minutes ===
    const MISSION_DURATION_CAP_MS = 30 * 60 * 1000;
    const elapsed = Date.now() - new Date(session.started_at || session.created_at).getTime();
    if (elapsed > MISSION_DURATION_CAP_MS && session.status === 'active') {
      console.log(`[iterate] Mission ${sessionId} exceeded 30min cap (${Math.round(elapsed / 60000)}min) — force-completing`);

      await supabase.from('agents')
        .update({
          status: 'completed',
          completion_output: 'Mission time limit reached (30 minutes)',
          current_activity: 'Time limit reached',
          progress: 100,
        })
        .eq('session_id', sessionId)
        .in('status', ['working', 'spawning']);

      await supabase.from('sessions').update({ status: 'synthesizing' }).eq('id', sessionId);
      session.status = 'synthesizing';
    }

    // Handle synthesis mode
    if (mode === 'synthesize' || session.status === 'synthesizing') {
      await runSynthesis(supabase, openrouter, session);
      return res.status(200).json({ action: 'synthesized' });
    }

    // Activate any spawning agents first
    await supabase.rpc('activate_spawning_agents', { p_session_id: sessionId });

    // Credit check before claiming agents
    if (session.user_id) {
      const { data: credits } = await supabase
        .from('user_credits')
        .select('balance')
        .eq('user_id', session.user_id)
        .single();

      if (credits && credits.balance < 0.01) {
        await supabase.from('agents')
          .update({ status: 'paused', current_activity: 'Insufficient credits — add credits to continue' })
          .eq('session_id', sessionId)
          .eq('status', 'working');
        return res.status(200).json({ action: 'insufficient_credits' });
      }
    }

    // === Batch claim: up to BATCH_SIZE agents at once ===
    const { data: claimedAgents, error: claimError } = await supabase.rpc('claim_agents_batch', {
      p_session_id: sessionId,
      p_limit: BATCH_SIZE,
    });

    if (claimError) {
      // Migration 006 may not have been applied yet — fall back to single claim
      console.warn('[iterate] claim_agents_batch failed (migration 006 missing?), falling back to single claim:', claimError.message);
      const { data: singleAgent } = await supabase.rpc('claim_agent_for_iteration', { p_session_id: sessionId });
      if (!singleAgent) {
        return res.status(200).json({ action: 'no_agent_available' });
      }
      const result = await processOneAgent(singleAgent, supabase, openrouter, session);
      return res.status(200).json(result);
    }

    const agents = Array.isArray(claimedAgents) ? claimedAgents : [];
    if (agents.length === 0) {
      return res.status(200).json({ action: 'no_agent_available' });
    }

    // === Process all claimed agents concurrently ===
    const settled = await Promise.allSettled(
      agents.map((agent) => processOneAgent(agent, supabase, openrouter, session))
    );

    const results = settled.map((outcome, i) => {
      if (outcome.status === 'fulfilled') {
        return outcome.value;
      }
      console.error(`[iterate] Agent ${agents[i]?.name || agents[i]?.id} failed:`, outcome.reason);
      return { action: 'error', agentId: agents[i]?.id, error: outcome.reason?.message || 'Unknown error' };
    });

    // Return batch results (first result's action for backward compat, plus full array)
    const primary = results[0] || { action: 'no_agent_available' };
    return res.status(200).json({
      ...primary,
      batch: results.length > 1 ? results : undefined,
      batchSize: results.length,
    });

  } catch (error) {
    console.error('Iterate error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
