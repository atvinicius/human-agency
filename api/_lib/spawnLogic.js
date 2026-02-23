// Spawn logic — pure functions for checking spawn budget and creating agents
// Shared between orchestrationService.js (client) and iterate.js (server)

/**
 * Valid agent roles — reject anything not in this list.
 */
export const VALID_ROLES = ['coordinator', 'researcher', 'executor', 'validator', 'synthesizer'];

/**
 * Sanitize an LLM-generated spawn config to prevent injection/abuse.
 * Strips HTML tags, enforces length limits, and validates role.
 */
export function sanitizeSpawnConfig(config) {
  const stripHtml = (str) => String(str || '').replace(/<[^>]*>/g, '');

  const role = VALID_ROLES.includes(config.role) ? config.role : 'executor';
  const name = stripHtml(config.name || 'Agent').slice(0, 100);
  const objective = stripHtml(config.objective || '').slice(0, 500);

  return {
    ...config,
    role,
    name,
    objective,
  };
}

/**
 * Default mission budget constants.
 */
export const DEFAULT_BUDGET = {
  maxTotalAgents: 25,
  maxDepth: 4,
  maxSpawnsPerAgent: 3,
  softCap: 20,
  maxSearchesPerMission: 30,
};

/**
 * Check if a parent agent is allowed to spawn children.
 *
 * @param {Array} agents - All agents in the session
 * @param {string} parentAgentId - The agent requesting to spawn
 * @param {object} budget - Mission budget (maxTotalAgents, maxDepth, maxSpawnsPerAgent, softCap)
 * @returns {{ allowed: boolean, remaining: number, depth: number, reason: string|null }}
 */
export function canSpawn(agents, parentAgentId, budget) {
  const b = budget || DEFAULT_BUDGET;

  // Hard cap on total agents
  if (agents.length >= b.maxTotalAgents) {
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
    if (depth > b.maxDepth + 1) break; // safety
  }

  if (depth >= b.maxDepth) {
    return { allowed: false, remaining: 0, depth, reason: 'Maximum depth reached' };
  }

  // Count existing children of this parent
  const childCount = agents.filter(
    (a) => a.parent_id === parentAgentId || a.parentId === parentAgentId
  ).length;

  if (childCount >= b.maxSpawnsPerAgent) {
    return { allowed: false, remaining: 0, depth, reason: 'Maximum children per agent reached' };
  }

  const remaining = Math.min(
    b.maxTotalAgents - agents.length,
    b.maxSpawnsPerAgent - childCount
  );

  return { allowed: true, remaining, depth, reason: null };
}

/**
 * Build an agent record from a spawn config.
 *
 * @param {object} config - { role, name, objective, priority?, model?, context? }
 * @param {string} sessionId
 * @param {string|null} parentId
 * @param {number} depth
 * @returns {object} Agent record ready for DB insert
 */
export function createAgentFromConfig(config, sessionId, parentId = null, depth = 0) {
  const safe = sanitizeSpawnConfig(config);
  return {
    id: crypto.randomUUID(),
    session_id: sessionId,
    parent_id: parentId,
    name: safe.name,
    role: safe.role,
    objective: safe.objective,
    status: 'spawning',
    priority: config.priority || 'normal',
    progress: 0,
    current_activity: 'Initializing...',
    context: config.context || {},
    model: config.model || 'moonshotai/kimi-k2',
    depth,
    iteration: 0,
  };
}
