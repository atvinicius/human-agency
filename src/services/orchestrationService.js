import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAgentStore } from '../stores/agentStore';
import { useAuthStore } from '../stores/authStore';
import { useCreditStore } from '../stores/creditStore';
import { useMissionReportStore } from '../stores/missionReportStore';
import { RequestQueue } from './requestQueue';
import { shouldCompress, compressContext } from './contextCompressor';
import { parseDataStream, parseAgentResponse } from './streamParser';
import { FindingsRegistry } from './findingsRegistry';

// Shared request queue — 3 concurrent LLM calls, priority-ordered
const requestQueue = new RequestQueue({ concurrency: 3 });

// Mission budget defaults
const DEFAULT_BUDGET = {
  maxTotalAgents: 25,
  maxDepth: 4,
  maxSpawnsPerAgent: 3,
  softCap: 20,
  maxSearchesPerMission: 30,
};

// Build auth headers from current session
function getAuthHeaders() {
  const token = useAuthStore.getState().getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Call AI through Vercel API route — non-streaming fallback
async function callAgent(agent, messages) {
  const response = await fetch('/api/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ agent, messages }),
  });

  if (!response.ok) {
    const error = await response.json();
    const err = new Error(error.error || 'AI request failed');
    err.status = response.status;
    throw err;
  }

  return response.json();
}

// Call AI with streaming — returns parsed result, calls onDelta during stream
async function callAgentStream(agent, messages, onDelta) {
  const response = await fetch('/api/agent-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ agent, messages }),
  });

  if (!response.ok) {
    // Streaming endpoint failed — fall back to non-streaming
    const errorData = await response.json().catch(() => ({}));
    const err = new Error(errorData.error || 'AI stream request failed');
    err.status = response.status;
    throw err;
  }

  // Read the stream with live deltas
  const fullText = await parseDataStream(response, (delta, accumulated) => {
    onDelta?.(delta, accumulated);
  });

  // Parse the accumulated text as structured JSON
  const result = parseAgentResponse(fullText);
  return { result, usage: null };
}

// Check if an agent can spawn children
function canSpawn(orchestrator, parentAgentId, store) {
  const budget = orchestrator.missionBudget;
  const agents = store.agents;

  // Hard cap on total agents
  if (agents.length >= budget.maxTotalAgents) {
    return { allowed: false, remaining: 0, depth: 0, reason: 'Maximum agent limit reached' };
  }

  // Compute depth by walking parent chain
  let depth = 0;
  let currentId = parentAgentId;
  while (currentId) {
    const parent = agents.find((a) => a.id === currentId);
    if (!parent) break;
    currentId = parent.parent_id || parent.parentId;
    depth++;
    if (depth > budget.maxDepth + 1) break; // safety
  }

  if (depth >= budget.maxDepth) {
    return { allowed: false, remaining: 0, depth, reason: 'Maximum depth reached' };
  }

  // Count existing children of this parent
  const childCount = agents.filter(
    (a) => a.parent_id === parentAgentId || a.parentId === parentAgentId
  ).length;

  if (childCount >= budget.maxSpawnsPerAgent) {
    return { allowed: false, remaining: 0, depth, reason: 'Maximum children per agent reached' };
  }

  const remaining = Math.min(
    budget.maxTotalAgents - agents.length,
    budget.maxSpawnsPerAgent - childCount
  );

  return { allowed: true, remaining, depth, reason: null };
}

// Create agent from config
function createAgentFromConfig(config, sessionId, parentId = null, depth = 0) {
  return {
    id: crypto.randomUUID(),
    session_id: sessionId,
    parent_id: parentId,
    name: config.name,
    role: config.role,
    objective: config.objective,
    status: 'spawning',
    priority: config.priority || 'normal',
    progress: 0,
    current_activity: 'Initializing...',
    context: config.context || {},
    model: config.model || 'moonshotai/kimi-k2',
    _depth: depth,
  };
}

// Recursively spawn agents from config tree
async function spawnAgentTree(config, sessionId, parentId = null, store, depth = 0) {
  const agent = createAgentFromConfig(config, sessionId, parentId, depth);

  // Add to store
  store.addAgent(agent);

  // Persist to Supabase if configured
  if (isSupabaseConfigured()) {
    await supabase.from('agents').insert(agent);
    await supabase.from('events').insert({
      session_id: sessionId,
      agent_id: agent.id,
      type: 'spawn',
      message: `${agent.name} spawned as ${agent.role}`,
    });
  }

  // Spawn children after a delay for visual effect
  if (config.children && config.children.length > 0) {
    for (const childConfig of config.children) {
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
      await spawnAgentTree(
        { ...childConfig, objective: childConfig.objective || agent.objective },
        sessionId,
        agent.id,
        store,
        depth + 1
      );
    }
  }

  return agent;
}

// Agent execution loop
async function executeAgent(agentId, store, orchestrator) {
  const agent = store.getAgentById(agentId);
  if (!agent) return;

  // Transition from spawning to working
  store.updateAgent(agentId, {
    status: 'working',
    current_activity: 'Analyzing objective...',
  });

  // Build initial context with parent info
  const parentAgent = agent.parent_id
    ? store.getAgentById(agent.parent_id)
    : null;

  // Get conversation history
  let messages = [
    {
      role: 'user',
      content: `Begin working on your objective: ${agent.objective}`,
    },
  ];

  // Track last completion check timestamp for incremental updates
  let lastCompletionCheck = Date.now();

  // Execution loop
  let iterations = 0;
  const maxIterations = 10;

  while (iterations < maxIterations) {
    // Check if orchestrator was stopped
    if (!orchestrator.running) break;

    iterations++;

    const currentAgent = store.getAgentById(agentId);
    if (!currentAgent) break;
    if (currentAgent.status === 'paused') {
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }
    if (currentAgent.status === 'completed' || currentAgent.status === 'failed') break;
    if (currentAgent.status === 'waiting') {
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }

    try {
      // Compress context every 3 iterations to reduce token usage
      if (shouldCompress(iterations, messages.length)) {
        messages = await compressContext(messages, currentAgent.objective, (agent, msgs) =>
          requestQueue.enqueue(agentId, 'background', () => callAgent(agent, msgs))
        );
      }

      // === Collaboration: inject child completions ===
      if (orchestrator.findingsRegistry) {
        const childIds = store.agents
          .filter((a) => a.parent_id === agentId || a.parentId === agentId)
          .map((a) => a.id);

        const newCompletions = orchestrator.findingsRegistry.getNewCompletionsSince(
          childIds, lastCompletionCheck
        );

        if (newCompletions.length > 0) {
          const completionSummaries = newCompletions.map((c) => {
            const childAgent = store.getAgentById(c.agentId);
            const name = childAgent?.name || 'Agent';
            const output = c.output.length > 300 ? c.output.slice(0, 300) + '...' : c.output;
            return `${name}: ${output}`;
          }).join('\n\n');

          messages.push({
            role: 'user',
            content: `Child agent(s) completed with findings:\n${completionSummaries}\n\nIncorporate these findings into your work.`,
          });
          lastCompletionCheck = Date.now();
        }

        // Sibling awareness every 3rd iteration
        if (iterations % 3 === 0 && (currentAgent.parent_id || currentAgent.parentId)) {
          const siblingFindings = orchestrator.findingsRegistry.getSiblingFindings(
            agentId,
            currentAgent.parent_id || currentAgent.parentId,
            store.agents
          );
          if (siblingFindings.length > 0) {
            messages.push({
              role: 'user',
              content: `Team update — your sibling agents have found:\n${siblingFindings.join('\n')}\nAvoid duplicating this work.`,
            });
          }
        }
      }

      // Build spawn budget for context injection
      const spawnCheck = canSpawn(orchestrator, agentId, store);
      const agentWithBudget = {
        ...currentAgent,
        context: {
          ...currentAgent.context,
          spawn_budget: {
            remaining: spawnCheck.remaining,
            depth: spawnCheck.depth,
            maxDepth: orchestrator.missionBudget.maxDepth,
            nearLimit: store.agents.length >= orchestrator.missionBudget.softCap,
          },
        },
      };

      // Call AI through priority queue with streaming
      let streamingText = '';
      const { result, usage } = await requestQueue.enqueue(
        agentId,
        currentAgent.priority || 'normal',
        () => callAgentStream(agentWithBudget, messages, (delta, accumulated) => {
          // Live UI updates as stream arrives
          streamingText = accumulated;
          // Throttle UI updates to every ~100 chars
          if (accumulated.length % 100 < delta.length) {
            store.updateAgent(agentId, {
              current_activity: 'Thinking...',
              context: {
                ...store.getAgentById(agentId)?.context,
                streamingText: accumulated.slice(-200), // Show last 200 chars
              },
            });
          }
        })
      );

      // Refresh credit balance after each agent call
      useCreditStore.getState().fetchBalance();

      // Clear streaming text and apply final result
      store.updateAgent(agentId, {
        current_activity: result.activity || 'Processing...',
        progress: Math.min(100, currentAgent.progress + (result.progress_delta || 5)),
        context: {
          ...currentAgent.context,
          lastThinking: result.thinking,
          lastOutput: result.output,
          streamingText: null,
        },
      });

      // Add assistant response to history
      messages.push({
        role: 'assistant',
        content: JSON.stringify(result),
      });

      // === Register findings ===
      if (orchestrator.findingsRegistry && result.output && String(result.output).length > 50) {
        orchestrator.findingsRegistry.addFinding(
          agentId, currentAgent.name, currentAgent.role, result.output
        );
      }

      // === Feed into mission report ===
      if (result.output && String(result.output).length > 50) {
        const outputStr = typeof result.output === 'string' ? result.output : JSON.stringify(result.output);
        useMissionReportStore.getState().addSection({
          agentId,
          agentName: currentAgent.name,
          role: currentAgent.role,
          content: outputStr,
        });
      }

      // Register artifacts in report
      if (result.artifacts && result.artifacts.length > 0) {
        for (const artifact of result.artifacts) {
          useMissionReportStore.getState().addSection({
            agentId,
            agentName: currentAgent.name,
            role: currentAgent.role,
            title: artifact.name,
            content: artifact.content,
            type: 'artifact',
          });
        }
      }

      // === Handle search events ===
      if (result.searches && result.searches.length > 0) {
        for (const search of result.searches) {
          store.addEvent({
            type: 'search',
            agentId,
            agentName: currentAgent.name,
            message: `Searched: "${search.query}" (${search.resultCount || 0} results)`,
          });
          // Data transfer for search visualization
          store.addDataTransfer({
            sourceId: 'external',
            targetId: agentId,
            type: 'search_result',
          });
        }
        // Track mission-level search count
        orchestrator.searchCount = (orchestrator.searchCount || 0) + result.searches.length;
      }

      // Handle spawn requests
      if (result.spawn_agents && result.spawn_agents.length > 0) {
        const spawnResult = canSpawn(orchestrator, agentId, store);
        if (spawnResult.allowed) {
          // Clamp to remaining capacity
          const agentsToSpawn = result.spawn_agents.slice(0, spawnResult.remaining);

          for (const spawnConfig of agentsToSpawn) {
            const childAgent = createAgentFromConfig(
              spawnConfig,
              currentAgent.session_id,
              agentId,
              (currentAgent._depth || 0) + 1
            );

            // Inject parent context into child
            childAgent.context = {
              ...childAgent.context,
              parent_objective: currentAgent.objective,
              parent_findings: String(result.output || '').slice(0, 500),
              spawn_budget: {
                remaining: Math.max(0, spawnResult.remaining - agentsToSpawn.indexOf(spawnConfig) - 1),
                depth: spawnResult.depth + 1,
                maxDepth: orchestrator.missionBudget.maxDepth,
              },
            };

            store.addAgent(childAgent);

            // Data transfer: context sharing
            store.addDataTransfer({
              sourceId: agentId,
              targetId: childAgent.id,
              type: 'context',
            });

            // Start child execution asynchronously, tracking the timeout
            const timeoutId = setTimeout(() => {
              orchestrator.childTimeouts.delete(timeoutId);
              executeAgent(childAgent.id, store, orchestrator);
            }, 1000);
            orchestrator.childTimeouts.add(timeoutId);
          }
        } else {
          // Can't spawn — tell agent to do work itself
          messages.push({
            role: 'user',
            content: `Cannot spawn additional agents: ${spawnResult.reason}. Complete your objective with your own analysis instead.`,
          });
        }
      }

      // Handle input requests
      if (result.needs_input) {
        store.updateAgent(agentId, {
          status: 'waiting',
          pending_input: result.needs_input,
        });

        // Wait for human response
        while (store.getAgentById(agentId)?.status === 'waiting') {
          await new Promise((r) => setTimeout(r, 500));
        }

        // Continue with human response
        const updatedAgent = store.getAgentById(agentId);
        if (updatedAgent?.context?.humanResponse) {
          messages.push({
            role: 'user',
            content: `Human response: ${JSON.stringify(updatedAgent.context.humanResponse)}`,
          });
        }
      }

      // Check completion
      if (result.complete) {
        store.updateAgent(agentId, {
          status: 'completed',
          progress: 100,
          current_activity: 'Objective complete',
        });

        // Register completion in findings registry
        if (orchestrator.findingsRegistry) {
          orchestrator.findingsRegistry.registerCompletion(agentId, result.output || '');
        }

        // Data transfer: findings flow up to parent
        if (currentAgent.parent_id) {
          store.addDataTransfer({
            sourceId: agentId,
            targetId: currentAgent.parent_id,
            type: 'findings',
          });
        }

        // Check if mission is complete
        orchestrator._checkMissionComplete();
        break;
      }

      // Add continuation prompt
      messages.push({
        role: 'user',
        content: 'Continue working. What is your next step?',
      });

      // Brief delay between iterations for UI legibility
      await new Promise((r) => setTimeout(r, 500));

    } catch (error) {
      if (error.message === 'Cancelled') break;

      // Handle insufficient credits (402)
      if (error.status === 402) {
        store.updateAgent(agentId, {
          status: 'paused',
          current_activity: 'Insufficient credits — add credits to continue',
        });
        useCreditStore.getState().fetchBalance();
        break;
      }

      console.error(`Agent ${agentId} error:`, error);
      store.updateAgent(agentId, {
        status: 'failed',
        current_activity: `Error: ${error.message}`,
      });

      // Check mission complete even on failure
      orchestrator._checkMissionComplete();
      break;
    }
  }

  // If we hit max iterations, mark as completed
  if (iterations >= maxIterations) {
    const finalAgent = store.getAgentById(agentId);
    if (finalAgent && finalAgent.status === 'working') {
      store.updateAgent(agentId, {
        status: 'completed',
        progress: 100,
        current_activity: 'Max iterations reached',
      });
      if (orchestrator.findingsRegistry) {
        orchestrator.findingsRegistry.registerCompletion(agentId, finalAgent.context?.lastOutput || '');
      }
      orchestrator._checkMissionComplete();
    }
  }
}

// Main orchestration class
export class OrchestrationService {
  constructor() {
    this.store = useAgentStore.getState();
    this.sessionId = null;
    this.running = false;
    this.currentPreset = null;
    this.startTime = null;
    this.childTimeouts = new Set();
    this.findingsRegistry = null;
    this.missionBudget = { ...DEFAULT_BUDGET };
    this.searchCount = 0;
    this._synthesisTriggered = false;

    // Subscribe to store changes
    useAgentStore.subscribe((state) => {
      this.store = state;
    });
  }

  getStatus() {
    return {
      running: this.running,
      sessionId: this.sessionId,
      preset: this.currentPreset,
      startTime: this.startTime,
    };
  }

  async startSession(preset) {
    this.running = true;
    this.currentPreset = preset;
    this.startTime = Date.now();
    this.sessionId = crypto.randomUUID();
    this.findingsRegistry = new FindingsRegistry();
    this.missionBudget = { ...DEFAULT_BUDGET };
    this.searchCount = 0;
    this._synthesisTriggered = false;

    // Reset report store
    useMissionReportStore.getState().reset();

    // Create session in Supabase
    if (isSupabaseConfigured()) {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) {
        console.warn('Session created without user_id — auth may not have resolved yet. The subscribe fallback will patch it.');
      }
      try {
        await supabase.from('sessions').insert({
          id: this.sessionId,
          name: preset.name,
          preset_id: preset.id,
          objective: preset.initial_objective,
          status: 'active',
          metadata: { preset_config: preset },
          user_id: userId || null,
        });
      } catch (err) {
        console.error('Failed to create session in Supabase:', err);
      }

      // If userId wasn't available at creation, set it once auth resolves
      if (!userId) {
        const sessionId = this.sessionId;
        const unsub = useAuthStore.subscribe((state) => {
          if (state.user?.id && sessionId) {
            supabase.from('sessions')
              .update({ user_id: state.user.id })
              .eq('id', sessionId)
              .is('user_id', null)
              .then(() => unsub());
          }
        });
        // Clean up if auth never resolves within 30s
        setTimeout(() => unsub(), 30_000);
      }
    }

    // Spawn initial agent tree
    if (preset.agent_config?.root) {
      await spawnAgentTree(
        {
          ...preset.agent_config.root,
          objective: preset.agent_config.root.objective || preset.initial_objective,
        },
        this.sessionId,
        null,
        this.store,
        0
      );
    }

    // Start execution for root agent
    const rootAgent = this.store.agents.find((a) => !a.parent_id);
    if (rootAgent) {
      executeAgent(rootAgent.id, this.store, this);
    }

    return this.sessionId;
  }

  _checkMissionComplete() {
    if (this._synthesisTriggered) return;

    const agents = this.store.agents;
    if (agents.length === 0) return;

    const allDone = agents.every((a) =>
      ['completed', 'failed'].includes(a.status)
    );

    if (allDone) {
      this._triggerSynthesis();
    }
  }

  async _triggerSynthesis() {
    if (this._synthesisTriggered) return;
    this._synthesisTriggered = true;

    useMissionReportStore.getState().setStatus('synthesizing');

    // Emit synthesis data transfers from completed agents
    const completedAgents = this.store.agents.filter((a) => a.status === 'completed');
    const synthesizerAgent = this.store.agents.find((a) => a.role === 'synthesizer');
    if (synthesizerAgent) {
      for (const agent of completedAgents) {
        if (agent.id !== synthesizerAgent.id) {
          this.store.addDataTransfer({
            sourceId: agent.id,
            targetId: synthesizerAgent.id,
            type: 'synthesis',
          });
        }
      }
    }

    // Gather all completions
    const allOutputs = completedAgents
      .map((a) => {
        const completion = this.findingsRegistry?.completions[a.id];
        return completion
          ? `## ${a.name} (${a.role})\n${completion.output}`
          : null;
      })
      .filter(Boolean)
      .join('\n\n---\n\n');

    if (!allOutputs) {
      useMissionReportStore.getState().setSynthesis('No agent outputs to synthesize.');
      return;
    }

    // Try LLM synthesis call
    try {
      const synthAgent = {
        role: 'synthesizer',
        name: 'Final Synthesizer',
        objective: `Synthesize all agent findings into a comprehensive, well-structured markdown report for: ${this.currentPreset?.initial_objective || 'the mission objective'}`,
        model: 'moonshotai/kimi-k2',
        context: {},
      };

      const synthMessages = [
        {
          role: 'user',
          content: `Here are the findings from all agents:\n\n${allOutputs.slice(0, 8000)}\n\nSynthesize these into a comprehensive, well-structured markdown report. Include key findings, analysis, and conclusions. Output ONLY the markdown report text, no JSON wrapper.`,
        },
      ];

      const response = await fetch('/api/agent-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ agent: synthAgent, messages: synthMessages }),
      });

      if (response.ok) {
        const fullText = await parseDataStream(response, () => {});
        // Use the raw text if it doesn't look like JSON
        const synthesisText = fullText.trim().startsWith('{')
          ? (parseAgentResponse(fullText).output || fullText)
          : fullText;
        useMissionReportStore.getState().setSynthesis(synthesisText);
      } else {
        // Fallback: concatenated output
        useMissionReportStore.getState().setSynthesis(allOutputs);
      }
    } catch (err) {
      console.error('Synthesis failed, using fallback:', err);
      useMissionReportStore.getState().setSynthesis(allOutputs);
    }
  }

  async stop() {
    this.running = false;
    this.currentPreset = null;
    this.startTime = null;
    requestQueue.cancelAll();

    // Clear all pending child agent timeouts
    for (const timeoutId of this.childTimeouts) {
      clearTimeout(timeoutId);
    }
    this.childTimeouts.clear();

    // Reset findings registry
    if (this.findingsRegistry) {
      this.findingsRegistry.reset();
    }

    // Mark session as completed
    if (isSupabaseConfigured() && this.sessionId) {
      try {
        await supabase.from('sessions').update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        }).eq('id', this.sessionId);
      } catch (err) {
        console.error('Failed to update session status in Supabase:', err);
      }
    }
  }

  respondToInput(agentId, response) {
    this.store.updateAgent(agentId, {
      status: 'working',
      pending_input: null,
      context: {
        ...this.store.getAgentById(agentId)?.context,
        humanResponse: response,
      },
    });
    this.store.respondToInput(agentId, response);
  }
}

// Singleton instance
let orchestrationInstance = null;

export function getOrchestrationService() {
  if (!orchestrationInstance) {
    orchestrationInstance = new OrchestrationService();
  }
  return orchestrationInstance;
}
