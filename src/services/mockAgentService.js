import { faker } from '@faker-js/faker';

const roles = ['coordinator', 'researcher', 'executor', 'validator', 'synthesizer'];
const priorities = ['critical', 'high', 'normal', 'low', 'background'];

const roleActivities = {
  coordinator: [
    'Orchestrating sub-agents',
    'Distributing workload',
    'Monitoring progress',
    'Synthesizing reports',
    'Coordinating handoffs',
  ],
  researcher: [
    'Searching documentation',
    'Analyzing codebase',
    'Gathering requirements',
    'Reading API specs',
    'Cross-referencing sources',
  ],
  executor: [
    'Writing code',
    'Running tests',
    'Building artifact',
    'Deploying changes',
    'Executing migration',
  ],
  validator: [
    'Reviewing changes',
    'Running validation suite',
    'Checking compliance',
    'Verifying outputs',
    'Testing edge cases',
  ],
  synthesizer: [
    'Combining results',
    'Generating summary',
    'Creating documentation',
    'Merging outputs',
    'Finalizing report',
  ],
};

const agentNamePrefixes = {
  coordinator: ['Lead', 'Chief', 'Director', 'Captain'],
  researcher: ['Scout', 'Analyst', 'Detective', 'Explorer'],
  executor: ['Builder', 'Worker', 'Maker', 'Crafter'],
  validator: ['Checker', 'Auditor', 'Reviewer', 'Guard'],
  synthesizer: ['Weaver', 'Merger', 'Combiner', 'Integrator'],
};

let agentIdCounter = 0;

function generateAgentName(role) {
  const prefixes = agentNamePrefixes[role] || agentNamePrefixes.executor;
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = faker.word.adjective();
  return `${prefix}-${suffix}`;
}

function getRandomActivity(role) {
  const activities = roleActivities[role] || roleActivities.executor;
  return activities[Math.floor(Math.random() * activities.length)];
}

export function createAgent(overrides = {}) {
  const id = `agent-${++agentIdCounter}`;
  const role = overrides.role || roles[Math.floor(Math.random() * roles.length)];

  return {
    id,
    parentId: null,
    childIds: [],
    role,
    status: 'spawning',
    priority: 'normal',
    progress: 0,
    name: generateAgentName(role),
    objective: faker.hacker.phrase(),
    currentActivity: 'Initializing...',
    ...overrides,
  };
}

export function createAgentTree(depth = 3, maxChildren = 4) {
  const agents = [];

  // Create root coordinator
  const root = createAgent({
    role: 'coordinator',
    priority: 'critical',
    objective: 'Coordinate full system analysis and implementation',
  });
  agents.push(root);

  // Recursively create children
  function addChildren(parent, currentDepth) {
    if (currentDepth >= depth) return;

    const numChildren = Math.floor(Math.random() * maxChildren) + 1;

    for (let i = 0; i < numChildren; i++) {
      // Role depends on depth
      let role;
      if (currentDepth === 0) {
        role = Math.random() > 0.5 ? 'researcher' : 'executor';
      } else if (currentDepth === 1) {
        role = ['executor', 'validator', 'synthesizer'][Math.floor(Math.random() * 3)];
      } else {
        role = 'executor';
      }

      const child = createAgent({
        parentId: parent.id,
        role,
        priority: priorities[Math.min(currentDepth + 1, priorities.length - 1)],
      });

      parent.childIds.push(child.id);
      agents.push(child);

      if (Math.random() > 0.3 && currentDepth < depth - 1) {
        addChildren(child, currentDepth + 1);
      }
    }
  }

  addChildren(root, 0);
  return agents;
}

export class MockAgentSimulator {
  constructor(store) {
    this.store = store;
    this.intervals = new Map();
    this.running = false;
  }

  start() {
    if (this.running) return;
    this.running = true;

    // Initialize with a tree
    const initialAgents = createAgentTree(3, 3);
    initialAgents.forEach((agent) => this.store.addAgent(agent));

    // Start simulation loops
    this.startAgentProgress();
    this.startSpawning();
    this.startInputRequests();
  }

  // Start with a preset configuration
  startWithPreset(preset) {
    if (this.running) return;
    this.running = true;

    // Spawn agents from preset config
    if (preset.agent_config?.root) {
      this.spawnFromConfig(preset.agent_config.root, null, preset.initial_objective);
    }

    // Start simulation loops
    this.startAgentProgress();
    this.startSpawning();
    this.startInputRequests();
  }

  // Recursively spawn agents from config
  spawnFromConfig(config, parentId = null, fallbackObjective = '') {
    const agent = createAgent({
      parentId,
      role: config.role,
      name: config.name,
      objective: config.objective || fallbackObjective,
      priority: config.priority || (parentId ? 'normal' : 'critical'),
    });

    this.store.addAgent(agent);

    // Spawn children with delay for visual effect
    if (config.children && config.children.length > 0) {
      config.children.forEach((childConfig, index) => {
        setTimeout(() => {
          if (this.running) {
            const childAgent = this.spawnFromConfig(
              childConfig,
              agent.id,
              childConfig.objective || config.objective || fallbackObjective
            );
            // Update parent's childIds
            this.store.updateAgent(agent.id, {
              childIds: [...(this.store.getAgentById?.(agent.id)?.childIds || []), childAgent.id],
            });
          }
        }, 800 + index * 400 + Math.random() * 300);
      });
    }

    return agent;
  }

  stop() {
    this.running = false;
    this.intervals.forEach((interval) => clearInterval(interval));
    this.intervals.clear();
  }

  startAgentProgress() {
    const interval = setInterval(() => {
      if (!this.running || this.store.isPaused) return;

      const agents = this.store.agents;

      agents.forEach((agent) => {
        if (agent.status === 'paused' || agent.status === 'completed' || agent.status === 'failed' || agent.status === 'waiting') {
          return;
        }

        // Transition from spawning to working
        if (agent.status === 'spawning' && agent.progress > 5) {
          this.store.updateAgent(agent.id, {
            status: 'working',
            currentActivity: getRandomActivity(agent.role),
          });
          return;
        }

        // Progress update
        const progressDelta = Math.random() * 3 + 0.5;
        const newProgress = Math.min(agent.progress + progressDelta, 100);

        const updates = { progress: newProgress };

        // Random activity change
        if (Math.random() > 0.85) {
          updates.currentActivity = getRandomActivity(agent.role);
        }

        // Complete when progress reaches 100
        if (newProgress >= 100) {
          updates.status = 'completed';
          updates.currentActivity = 'Finished';
        }

        // Random failures (rare)
        if (Math.random() > 0.995 && agent.status === 'working') {
          updates.status = 'failed';
          updates.currentActivity = 'Error: ' + faker.hacker.phrase();
        }

        this.store.updateAgent(agent.id, updates);
      });
    }, 200);

    this.intervals.set('progress', interval);
  }

  startSpawning() {
    const interval = setInterval(() => {
      if (!this.running || this.store.isPaused) return;

      const agents = this.store.agents;
      const workingAgents = agents.filter(
        (a) => a.status === 'working' && a.progress > 20 && a.progress < 80
      );

      // Occasionally spawn new child agents
      if (workingAgents.length > 0 && Math.random() > 0.7) {
        const parent = workingAgents[Math.floor(Math.random() * workingAgents.length)];

        // Limit children
        if (parent.childIds.length < 4) {
          const childRole = parent.role === 'coordinator'
            ? ['researcher', 'executor'][Math.floor(Math.random() * 2)]
            : ['executor', 'validator'][Math.floor(Math.random() * 2)];

          const child = createAgent({
            parentId: parent.id,
            role: childRole,
            priority: 'normal',
          });

          this.store.updateAgent(parent.id, {
            childIds: [...parent.childIds, child.id],
          });

          this.store.addAgent(child);
        }
      }
    }, 3000);

    this.intervals.set('spawning', interval);
  }

  startInputRequests() {
    const interval = setInterval(() => {
      if (!this.running || this.store.isPaused) return;

      const agents = this.store.agents;
      const workingAgents = agents.filter(
        (a) => a.status === 'working' && !a.pendingInput && a.progress > 30
      );

      // Occasionally request human input
      if (workingAgents.length > 0 && Math.random() > 0.9) {
        const agent = workingAgents[Math.floor(Math.random() * workingAgents.length)];

        const inputTypes = [
          {
            type: 'approval',
            title: 'Approval Required',
            message: `${agent.name} needs approval to proceed with: ${faker.hacker.phrase()}`,
            options: ['Approve', 'Reject', 'Modify'],
          },
          {
            type: 'choice',
            title: 'Decision Required',
            message: `${agent.name} needs you to choose an approach:`,
            options: [faker.hacker.verb(), faker.hacker.verb(), faker.hacker.verb()],
          },
          {
            type: 'text',
            title: 'Input Required',
            message: `${agent.name} needs additional information: ${faker.hacker.phrase()}`,
          },
        ];

        const request = inputTypes[Math.floor(Math.random() * inputTypes.length)];
        this.store.requestInput(agent.id, request);
      }
    }, 5000);

    this.intervals.set('input', interval);
  }
}
