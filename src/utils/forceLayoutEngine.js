// Force-directed layout engine for the Living Map
// Replaces rigid tree positioning with organic, physics-simulated space

import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceX,
  forceY,
} from 'd3-force';

const BASE_LINK_DISTANCE = 120;
const REPULSION_STRENGTH = -300;
const COLLISION_PADDING = 10;
const ROLE_CLUSTER_STRENGTH = 0.03;
const ATTENTION_GRAVITY = 0.08;
const COMPLETED_DRIFT = 0.04;
const ALPHA_TARGET = 0.05;
const ALPHA_DECAY = 0.01;
const VELOCITY_DECAY = 0.4;

// Role cluster centers — same-role agents gravitate toward shared regions
const ROLE_ANGLES = {
  coordinator: 0,
  researcher: (Math.PI * 2) / 5,
  executor: (Math.PI * 4) / 5,
  validator: (Math.PI * 6) / 5,
  synthesizer: (Math.PI * 8) / 5,
};

const CLUSTER_RADIUS = 150;

function getRoleClusterTarget(role) {
  const angle = ROLE_ANGLES[role] ?? 0;
  return {
    x: Math.cos(angle) * CLUSTER_RADIUS,
    y: Math.sin(angle) * CLUSTER_RADIUS,
  };
}

// Custom force: gently attract same-role agents toward a shared region
function forceRoleCluster(nodes) {
  let strength = ROLE_CLUSTER_STRENGTH;

  function force(alpha) {
    for (const node of nodes) {
      if (!node.role) continue;
      const target = getRoleClusterTarget(node.role);
      node.vx += (target.x - node.x) * strength * alpha;
      node.vy += (target.y - node.y) * strength * alpha;
    }
  }

  force.strength = function (s) {
    if (s === undefined) return strength;
    strength = s;
    return force;
  };

  return force;
}

// Custom force: pull pending-input agents toward center, drift completed outward
function forceAttentionGravity(nodes, centerX, centerY) {
  function force(alpha) {
    for (const node of nodes) {
      const hasPendingInput = node.pendingInput || node.pending_input;
      const isCompleted = node.status === 'completed';
      const isFailed = node.status === 'failed';

      if (hasPendingInput) {
        // Pull toward center
        node.vx += (centerX - node.x) * ATTENTION_GRAVITY * alpha;
        node.vy += (centerY - node.y) * ATTENTION_GRAVITY * alpha;
      } else if (isCompleted || isFailed) {
        // Drift outward
        const dx = node.x - centerX;
        const dy = node.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        node.vx += (dx / dist) * COMPLETED_DRIFT * alpha * 50;
        node.vy += (dy / dist) * COMPLETED_DRIFT * alpha * 50;
      }
    }
  }

  return force;
}

/**
 * Create a force simulation for agent nodes.
 * Returns the simulation instance — caller owns the lifecycle.
 */
export function createForceSimulation(width, height) {
  const centerX = width / 2;
  const centerY = height / 2;

  const simulation = forceSimulation([])
    .force('center', forceCenter(centerX, centerY).strength(0.05))
    .force('charge', forceManyBody().strength(REPULSION_STRENGTH))
    .force('collide', forceCollide().radius((d) => (d._radius || 30) + COLLISION_PADDING))
    .force('link', forceLink([]).id((d) => d.id).distance(BASE_LINK_DISTANCE).strength(0.7))
    .force('x', forceX(centerX).strength(0.02))
    .force('y', forceY(centerY).strength(0.02))
    .alphaTarget(ALPHA_TARGET)
    .alphaDecay(ALPHA_DECAY)
    .velocityDecay(VELOCITY_DECAY);

  return simulation;
}

/**
 * Sync simulation nodes/links with the latest agent array.
 * Preserves existing node positions; new nodes spawn near their parent.
 */
export function syncSimulation(simulation, agents, prevNodeMap) {
  const nodeMap = new Map();
  const links = [];

  // Build nodes — preserve positions for existing agents
  const nodes = agents.map((agent) => {
    const parentId = agent.parentId || agent.parent_id;
    const existing = prevNodeMap?.get(agent.id);

    if (existing) {
      // Preserve physics state, update data
      Object.assign(existing, {
        ...agent,
        _radius: computeOrbRadius(agent),
      });
      nodeMap.set(agent.id, existing);
      return existing;
    }

    // New node — spawn near parent or at center + random offset
    const parent = parentId ? prevNodeMap?.get(parentId) : null;
    const baseX = parent ? parent.x : (simulation.force('center')?.x?.() ?? 400);
    const baseY = parent ? parent.y : (simulation.force('center')?.y?.() ?? 300);

    const node = {
      ...agent,
      x: baseX + (Math.random() - 0.5) * 60,
      y: baseY + (Math.random() - 0.5) * 60,
      _radius: computeOrbRadius(agent),
    };
    nodeMap.set(agent.id, node);
    return node;
  });

  // Build links from parent-child relationships
  for (const agent of agents) {
    const parentId = agent.parentId || agent.parent_id;
    if (parentId && nodeMap.has(parentId)) {
      links.push({
        source: parentId,
        target: agent.id,
      });
    }
  }

  // Update simulation
  simulation.nodes(nodes);
  simulation.force('link').links(links);

  // Update custom forces
  simulation.force('roleCluster', forceRoleCluster(nodes));

  const cx = simulation.force('center')?.x?.() ?? 400;
  const cy = simulation.force('center')?.y?.() ?? 300;
  simulation.force('attention', forceAttentionGravity(nodes, cx, cy));

  // Update collision radii
  simulation.force('collide').radius((d) => (d._radius || 30) + COLLISION_PADDING);

  // Reheat slightly so new nodes settle
  simulation.alpha(Math.max(simulation.alpha(), 0.3));

  return nodeMap;
}

/**
 * Compute the display radius for an agent orb.
 * Size encodes importance/activity (20-60px range).
 */
export function computeOrbRadius(agent) {
  let base = 28;

  // Role-based sizing: coordinators are larger
  if (agent.role === 'coordinator') base = 36;
  if (agent.role === 'synthesizer') base = 32;

  // Status multiplier
  const statusMultipliers = {
    spawning: 0.9,
    working: 1.1,
    waiting: 1.0,
    paused: 0.85,
    blocked: 1.0,
    completed: 0.75,
    failed: 0.8,
  };
  const mult = statusMultipliers[agent.status] || 1;

  // Pending input boost
  const inputBoost = (agent.pendingInput || agent.pending_input) ? 8 : 0;

  // Priority boost
  const priorityBoost = agent.priority === 'critical' ? 6 : agent.priority === 'high' ? 3 : 0;

  const radius = base * mult + inputBoost + priorityBoost;
  return Math.min(Math.max(radius, 20), 60);
}

/**
 * Extract link data from the simulation for rendering edges.
 */
export function getSimulationLinks(simulation) {
  const linkForce = simulation.force('link');
  if (!linkForce) return [];
  return linkForce.links().map((link) => ({
    source: typeof link.source === 'object' ? link.source : { id: link.source },
    target: typeof link.target === 'object' ? link.target : { id: link.target },
  }));
}
