// Server-side agent iteration endpoint
// Processes ONE iteration for ONE agent, fully server-side.
// Called by api/orchestrate.js (which is triggered by pg_cron).

import { generateText, tool } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { buildSystemPrompt } from './_config/prompts.js';
import { parseAgentResponse } from './_lib/parseResponse.js';
import { canSpawn, createAgentFromConfig, DEFAULT_BUDGET } from './_lib/spawnLogic.js';
import { loadMessages, saveMessages, getSiblingFindings, getChildCompletions, checkMissionComplete } from './_lib/agentQueries.js';
import { calculateCost } from './_config/pricing.js';
import { webSearch } from './search.js';

export const config = {
  runtime: 'nodejs',
  maxDuration: 300,
};

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

// Context compression constants (mirrors contextCompressor.js)
const COMPRESS_WINDOW = 4;
const COMPRESS_EVERY = 3;

/**
 * Compress older messages into a summary via LLM, keeping recent context.
 */
async function compressContext(messages, agentObjective, openrouter) {
  if (messages.length <= COMPRESS_WINDOW + 1) return messages;

  const oldMessages = messages.slice(0, -COMPRESS_WINDOW);
  const recentMessages = messages.slice(-COMPRESS_WINDOW);

  const summaryContent = oldMessages
    .map((m) => `[${m.role}]: ${typeof m.content === 'string' ? m.content.slice(0, 500) : JSON.stringify(m.content).slice(0, 500)}`)
    .join('\n');

  try {
    const { text } = await generateText({
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

    return [
      { role: 'user', content: `Context summary of your work so far:\n${text}\n\nContinue from where you left off.` },
      ...recentMessages,
    ];
  } catch {
    // Truncation fallback
    return [
      { role: 'user', content: `You have been working on: "${agentObjective}". Continue your work.` },
      ...recentMessages,
    ];
  }
}

/**
 * Run synthesis: compile all agent outputs into a final report.
 */
async function runSynthesis(supabase, openrouter, session) {
  // Get all completed agent outputs including objectives
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

  // Include agent objectives alongside their outputs for richer synthesis
  const allOutputs = agents
    .map((a) => `## ${a.name} (${a.role})\n**Objective:** ${a.objective || 'N/A'}\n\n${a.completion_output}`)
    .join('\n\n---\n\n');

  // Gather search-related findings for source attribution
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

    // Deduct credits for synthesis
    if (session.user_id && usage) {
      const cost = calculateCost('moonshotai/kimi-k2', usage.promptTokens || 0, usage.completionTokens || 0);
      if (cost > 0) {
        await supabase.rpc('deduct_credits', {
          p_user_id: session.user_id,
          p_amount: cost,
          p_model_id: 'moonshotai/kimi-k2',
          p_prompt_tokens: usage.promptTokens || 0,
          p_completion_tokens: usage.completionTokens || 0,
          p_session_id: session.id,
          p_description: 'Synthesis',
        });
      }
    }
  } catch (err) {
    console.error('Synthesis LLM call failed:', err);
    // Fallback: use concatenated outputs
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

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Orchestrate-Secret');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth: shared secret (from pg_cron or orchestrate.js)
  const secret = req.headers['x-orchestrate-secret'];
  if (!ORCHESTRATE_SECRET || secret !== ORCHESTRATE_SECRET) {
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

    // Handle synthesis mode
    if (mode === 'synthesize' || session.status === 'synthesizing') {
      await runSynthesis(supabase, openrouter, session);
      return res.status(200).json({ action: 'synthesized' });
    }

    // Activate any spawning agents first
    await supabase.rpc('activate_spawning_agents', { p_session_id: sessionId });

    // Claim one working agent
    const { data: agent } = await supabase.rpc('claim_agent_for_iteration', { p_session_id: sessionId });

    if (!agent) {
      return res.status(200).json({ action: 'no_agent_available' });
    }

    // Credit check
    if (session.user_id) {
      const { data: credits } = await supabase
        .from('user_credits')
        .select('balance')
        .eq('user_id', session.user_id)
        .single();

      if (credits && credits.balance < 0.01) {
        // Pause all working agents
        await supabase.from('agents')
          .update({ status: 'paused', current_activity: 'Insufficient credits — add credits to continue' })
          .eq('session_id', sessionId)
          .eq('status', 'working');
        return res.status(200).json({ action: 'insufficient_credits' });
      }
    }

    // Load message history
    let messages = await loadMessages(supabase, agent.id);

    // Bootstrap messages if empty (first iteration)
    if (messages.length === 0) {
      messages = [{ role: 'user', content: `Begin working on your objective: ${agent.objective}` }];
      await saveMessages(supabase, agent.id, messages);
    }

    const iteration = (agent.iteration || 0) + 1;
    const newMessages = []; // Messages to append this iteration

    // === Context compression ===
    if (iteration > 1 && iteration % COMPRESS_EVERY === 0 && messages.length > COMPRESS_WINDOW + 1) {
      messages = await compressContext(messages, agent.objective, openrouter);
      // Save compressed messages (replace all)
      await supabase.from('agent_messages').delete().eq('agent_id', agent.id);
      await saveMessages(supabase, agent.id, messages);
    }

    // === Child completion injection ===
    const { data: children } = await supabase
      .from('agents')
      .select('id')
      .eq('session_id', sessionId)
      .eq('parent_id', agent.id);

    if (children && children.length > 0) {
      const childIds = children.map((c) => c.id);
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

    // === Sibling awareness every 3rd iteration ===
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

    // === Build spawn budget ===
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

    // Build agent context for prompt
    const agentForPrompt = {
      role: agent.role,
      objective: agent.objective,
      context: {
        ...(agent.context || {}),
        spawn_budget: spawnBudget,
      },
    };

    const hasSearchKey = !!process.env.SERPER_API_KEY;
    const systemPrompt = buildSystemPrompt(agentForPrompt, spawnBudget, hasSearchKey);

    // === Build search tool ===
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

    // === Call LLM ===
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

    // Parse response
    const result = parseAgentResponse(text);

    // === Save new messages ===
    const assistantMsg = { role: 'assistant', content: text };
    newMessages.push(assistantMsg);

    // === Update search count ===
    if (searchCount > 0) {
      await supabase.from('sessions')
        .update({ search_count: sessionSearchCount + searchCount })
        .eq('id', sessionId);
    }

    // === Deduct credits ===
    if (session.user_id && usage) {
      const modelId = agent.model || 'moonshotai/kimi-k2';
      const cost = calculateCost(modelId, usage.promptTokens || 0, usage.completionTokens || 0);
      if (cost > 0) {
        await supabase.rpc('deduct_credits', {
          p_user_id: session.user_id,
          p_amount: cost,
          p_model_id: modelId,
          p_prompt_tokens: usage.promptTokens || 0,
          p_completion_tokens: usage.completionTokens || 0,
          p_session_id: sessionId,
          p_description: `Agent: ${agent.name}`,
        });
      }
    }

    // === Register finding ===
    if (result.output && String(result.output).length > 50) {
      const outputStr = typeof result.output === 'string' ? result.output : JSON.stringify(result.output);
      await supabase.from('findings').insert({
        session_id: sessionId,
        agent_id: agent.id,
        agent_name: agent.name,
        agent_role: agent.role,
        content: outputStr.slice(0, 5000),
      });

      // Write report section
      await supabase.from('report_sections').insert({
        session_id: sessionId,
        agent_id: agent.id,
        agent_name: agent.name,
        role: agent.role,
        content: outputStr,
        type: 'output',
      });
    }

    // === Register artifacts ===
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

    // === Write events ===
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

    // === Handle spawn requests ===
    if (result.spawn_agents && result.spawn_agents.length > 0 && spawnCheck.allowed) {
      const agentsToSpawn = result.spawn_agents.slice(0, spawnCheck.remaining);
      const spawned = [];

      for (const spawnConfig of agentsToSpawn) {
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
        // Spawn events
        const spawnEvents = spawned.map((s) => ({
          session_id: sessionId,
          agent_id: s.id,
          type: 'spawn',
          message: `${s.name} spawned as ${s.role}`,
        }));
        await supabase.from('events').insert(spawnEvents);
      }
    } else if (result.spawn_agents && result.spawn_agents.length > 0 && !spawnCheck.allowed) {
      // Can't spawn — add a continuation message
      const noSpawnMsg = {
        role: 'user',
        content: `Cannot spawn additional agents: ${spawnCheck.reason}. Complete your objective with your own analysis instead.`,
      };
      newMessages.push(noSpawnMsg);
    }

    // === Handle completion ===
    let isComplete = result.complete || iteration >= 10;
    const completionOutput = result.output
      ? (typeof result.output === 'string' ? result.output : JSON.stringify(result.output))
      : '';

    // === Handle needs_input ===
    if (result.needs_input && !isComplete) {
      await supabase.from('agents').update({
        status: 'waiting',
        pending_input: result.needs_input,
        current_activity: `Waiting for input: ${result.needs_input.title || 'Human input needed'}`,
        iteration,
        last_completion_check: new Date().toISOString(),
      }).eq('id', agent.id);

      await saveMessages(supabase, agent.id, newMessages);
      return res.status(200).json({ action: 'waiting_for_input', agentId: agent.id });
    }

    if (isComplete) {
      // Add continuation message if not in newMessages yet
      if (!result.complete && iteration >= 10) {
        newMessages.push({ role: 'user', content: 'Max iterations reached. Finalize your work.' });
      }

      await supabase.from('agents').update({
        status: 'completed',
        progress: 100,
        current_activity: 'Objective complete',
        completion_output: completionOutput.slice(0, 10000),
        iteration,
        last_completion_check: new Date().toISOString(),
      }).eq('id', agent.id);

      // Completion event
      await supabase.from('events').insert({
        session_id: sessionId,
        agent_id: agent.id,
        type: 'complete',
        message: `${agent.name} completed`,
      });

      // Check if mission is complete
      const missionDone = await checkMissionComplete(supabase, sessionId);
      if (missionDone) {
        await supabase.from('sessions').update({ status: 'synthesizing' }).eq('id', sessionId);
      }
    } else {
      // Continue working
      const continueMsg = { role: 'user', content: 'Continue working. What is your next step?' };
      newMessages.push(continueMsg);

      await supabase.from('agents').update({
        status: 'working',
        current_activity: result.activity || 'Processing...',
        progress: Math.min(95, (agent.progress || 0) + (result.progress_delta || 5)),
        iteration,
        last_completion_check: new Date().toISOString(),
        context: {
          ...(agent.context || {}),
          lastThinking: result.thinking,
          lastOutput: typeof result.output === 'string' ? result.output?.slice(0, 500) : JSON.stringify(result.output)?.slice(0, 500),
        },
      }).eq('id', agent.id);
    }

    // Save all new messages
    await saveMessages(supabase, agent.id, newMessages);

    return res.status(200).json({
      action: isComplete ? 'completed' : 'iterated',
      agentId: agent.id,
      agentName: agent.name,
      iteration,
    });

  } catch (error) {
    console.error('Iterate error:', error);
    return res.status(500).json({ error: error.message });
  }
}
