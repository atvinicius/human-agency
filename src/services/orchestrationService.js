import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAgentStore } from '../stores/agentStore';
import { useAuthStore } from '../stores/authStore';
import { RequestQueue } from './requestQueue';
import { shouldCompress, compressContext } from './contextCompressor';
import { parseDataStream, parseAgentResponse } from './streamParser';

// Shared request queue — 3 concurrent LLM calls, priority-ordered
const requestQueue = new RequestQueue({ concurrency: 3 });

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

// Create agent from config
function createAgentFromConfig(config, sessionId, parentId = null) {
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
  };
}

// Recursively spawn agents from config tree
async function spawnAgentTree(config, sessionId, parentId = null, store) {
  const agent = createAgentFromConfig(config, sessionId, parentId);

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
        store
      );
    }
  }

  return agent;
}

// Agent execution loop
async function executeAgent(agentId, store) {
  const agent = store.getAgentById(agentId);
  if (!agent) return;

  // Transition from spawning to working
  store.updateAgent(agentId, {
    status: 'working',
    current_activity: 'Analyzing objective...',
  });

  // Get conversation history
  let messages = [
    {
      role: 'user',
      content: `Begin working on your objective: ${agent.objective}`,
    },
  ];

  // Execution loop
  let iterations = 0;
  const maxIterations = 10;

  while (iterations < maxIterations) {
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

      // Call AI through priority queue with streaming
      let streamingText = '';
      const { result, usage } = await requestQueue.enqueue(
        agentId,
        currentAgent.priority || 'normal',
        () => callAgentStream(currentAgent, messages, (delta, accumulated) => {
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

      // Handle spawn requests
      if (result.spawn_agents && result.spawn_agents.length > 0) {
        for (const spawnConfig of result.spawn_agents) {
          const childAgent = createAgentFromConfig(spawnConfig, currentAgent.session_id, agentId);
          store.addAgent(childAgent);

          // Start child execution asynchronously
          setTimeout(() => executeAgent(childAgent.id, store), 1000);
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
      console.error(`Agent ${agentId} error:`, error);
      store.updateAgent(agentId, {
        status: 'failed',
        current_activity: `Error: ${error.message}`,
      });
      break;
    }
  }
}

// Main orchestration class
export class OrchestrationService {
  constructor() {
    this.store = useAgentStore.getState();
    this.sessionId = null;
    this.running = false;

    // Subscribe to store changes
    useAgentStore.subscribe((state) => {
      this.store = state;
    });
  }

  async startSession(preset) {
    this.running = true;
    this.sessionId = crypto.randomUUID();

    // Create session in Supabase
    if (isSupabaseConfigured()) {
      const userId = useAuthStore.getState().user?.id;
      await supabase.from('sessions').insert({
        id: this.sessionId,
        name: preset.name,
        preset_id: preset.id,
        objective: preset.initial_objective,
        status: 'active',
        ...(userId && { user_id: userId }),
      });
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
        this.store
      );
    }

    // Start execution for root agent
    const rootAgent = this.store.agents.find((a) => !a.parent_id);
    if (rootAgent) {
      executeAgent(rootAgent.id, this.store);
    }

    return this.sessionId;
  }

  stop() {
    this.running = false;
    requestQueue.cancelAll();
    // Mark session as completed
    if (isSupabaseConfigured() && this.sessionId) {
      supabase.from('sessions').update({ status: 'completed' }).eq('id', this.sessionId);
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
