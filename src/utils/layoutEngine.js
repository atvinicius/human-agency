// Tree positioning algorithm for agent map
// Positions nodes left-to-right based on hierarchy depth

import { hierarchy, tree } from 'd3-hierarchy';

const NODE_WIDTH = 280;
const NODE_HEIGHT = 120;
const HORIZONTAL_SPACING = 100;
const VERTICAL_SPACING = 40;

export function buildAgentTree(agents) {
  // Find root agents (no parentId)
  const roots = agents.filter(a => !a.parentId);

  if (roots.length === 0) return [];

  // Build hierarchy data structure
  const agentMap = new Map(agents.map(a => [a.id, a]));

  function buildNode(agent) {
    const children = agents
      .filter(a => a.parentId === agent.id)
      .map(buildNode);

    return {
      ...agent,
      children: children.length > 0 ? children : undefined,
    };
  }

  // For multiple roots, create a virtual root
  const virtualRoot = {
    id: '__virtual_root__',
    children: roots.map(buildNode),
  };

  return virtualRoot;
}

export function calculateLayout(agents) {
  if (agents.length === 0) return { nodes: [], edges: [] };

  const treeData = buildAgentTree(agents);

  // Create d3 hierarchy
  const root = hierarchy(treeData);

  // Calculate tree layout
  const treeLayout = tree()
    .nodeSize([NODE_HEIGHT + VERTICAL_SPACING, NODE_WIDTH + HORIZONTAL_SPACING])
    .separation((a, b) => a.parent === b.parent ? 1 : 1.2);

  treeLayout(root);

  // Extract positioned nodes (skip virtual root)
  const nodes = [];
  const edges = [];

  root.descendants().forEach(node => {
    if (node.data.id === '__virtual_root__') return;

    // d3-tree puts depth in x and breadth in y, we swap for left-to-right
    nodes.push({
      ...node.data,
      x: node.y + 100, // depth becomes x position, offset for padding
      y: node.x + 400, // breadth becomes y position, center vertically
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });

    // Create edge to parent
    if (node.parent && node.parent.data.id !== '__virtual_root__') {
      edges.push({
        id: `${node.parent.data.id}-${node.data.id}`,
        sourceId: node.parent.data.id,
        targetId: node.data.id,
        sourceX: node.parent.y + 100 + NODE_WIDTH,
        sourceY: node.parent.x + 400 + NODE_HEIGHT / 2,
        targetX: node.y + 100,
        targetY: node.x + 400 + NODE_HEIGHT / 2,
      });
    }
  });

  return { nodes, edges };
}

// Group siblings with same role when >5
export function groupSiblings(nodes, maxVisible = 5) {
  const grouped = [];
  const siblingGroups = new Map();

  // Group by parentId + role
  nodes.forEach(node => {
    const key = `${node.parentId || 'root'}-${node.role}`;
    if (!siblingGroups.has(key)) {
      siblingGroups.set(key, []);
    }
    siblingGroups.get(key).push(node);
  });

  // Process each group
  siblingGroups.forEach((siblings, key) => {
    if (siblings.length <= maxVisible) {
      grouped.push(...siblings);
    } else {
      // Create collapsed group node
      const avgProgress = siblings.reduce((sum, n) => sum + n.progress, 0) / siblings.length;
      const representative = siblings[0];

      grouped.push({
        ...representative,
        id: `group-${key}`,
        isGroup: true,
        groupCount: siblings.length,
        groupedNodes: siblings,
        progress: avgProgress,
        name: `${siblings.length} ${representative.role}s`,
        currentActivity: `${siblings.filter(n => n.status === 'working').length} active`,
      });
    }
  });

  return grouped;
}

// Calculate map bounds for pan/zoom limits
export function calculateBounds(nodes, padding = 100) {
  if (nodes.length === 0) {
    return { minX: 0, maxX: 800, minY: 0, maxY: 600 };
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  nodes.forEach(node => {
    minX = Math.min(minX, node.x);
    maxX = Math.max(maxX, node.x + node.width);
    minY = Math.min(minY, node.y);
    maxY = Math.max(maxY, node.y + node.height);
  });

  return {
    minX: minX - padding,
    maxX: maxX + padding,
    minY: minY - padding,
    maxY: maxY + padding,
  };
}
