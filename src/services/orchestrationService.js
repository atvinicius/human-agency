import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAgentStore } from '../stores/agentStore';

// Call AI through Vercel API route (keeps key server-side)
async function callAgent(agent, messages) {
  const response = await fetch('/api/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent, messages }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'AI request failed');
  }

  return response.json();
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
  const messages = [
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
      // Call AI
      const { result, usage } = await callAgent(currentAgent, messages);

      // Update activity
      store.updateAgent(agentId, {
        current_activity: result.activity || 'Processing...',
        progress: Math.min(100, currentAgent.progress + (result.progress_delta || 5)),
        context: {
          ...currentAgent.context,
          lastThinking: result.thinking,
          lastOutput: result.output,
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

      // Small delay between iterations
      await new Promise((r) => setTimeout(r, 2000));

    } catch (error) {
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
      await supabase.from('sessions').insert({
        id: this.sessionId,
        name: preset.name,
        preset_id: preset.id,
        objective: preset.initial_objective,
        status: 'active',
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
