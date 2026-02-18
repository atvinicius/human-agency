import { describe, it, expect } from 'vitest';

// Test the canSpawn logic extracted from orchestrationService
// We test the pure logic directly rather than importing the module
// (which has side effects from Zustand store subscriptions)

const DEFAULT_BUDGET = {
  maxTotalAgents: 25,
  maxDepth: 4,
  maxSpawnsPerAgent: 3,
  softCap: 20,
};

function canSpawn(budget, agents, parentAgentId) {
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
    currentId = parent.parent_id;
    depth++;
    if (depth > budget.maxDepth + 1) break;
  }

  if (depth >= budget.maxDepth) {
    return { allowed: false, remaining: 0, depth, reason: 'Maximum depth reached' };
  }

  // Count existing children of this parent
  const childCount = agents.filter((a) => a.parent_id === parentAgentId).length;
  if (childCount >= budget.maxSpawnsPerAgent) {
    return { allowed: false, remaining: 0, depth, reason: 'Maximum children per agent reached' };
  }

  const remaining = Math.min(
    budget.maxTotalAgents - agents.length,
    budget.maxSpawnsPerAgent - childCount
  );

  return { allowed: true, remaining, depth, reason: null };
}

describe('Spawn limits (canSpawn)', () => {
  it('should allow spawning when under all limits', () => {
    const agents = [
      { id: 'root', parent_id: null },
      { id: 'a1', parent_id: 'root' },
    ];
    const result = canSpawn(DEFAULT_BUDGET, agents, 'root');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2); // maxSpawnsPerAgent (3) - childCount (1)
    expect(result.depth).toBe(1);
  });

  it('should block spawning at max total agents', () => {
    const agents = Array.from({ length: 25 }, (_, i) => ({
      id: `a${i}`,
      parent_id: i === 0 ? null : 'a0',
    }));
    const result = canSpawn(DEFAULT_BUDGET, agents, 'a0');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Maximum agent limit reached');
  });

  it('should block spawning at max depth', () => {
    const agents = [
      { id: 'root', parent_id: null },
      { id: 'l1', parent_id: 'root' },
      { id: 'l2', parent_id: 'l1' },
      { id: 'l3', parent_id: 'l2' },
      { id: 'l4', parent_id: 'l3' },
    ];
    // l4 is at depth 4, trying to spawn from l4 should fail
    const result = canSpawn(DEFAULT_BUDGET, agents, 'l4');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Maximum depth reached');
  });

  it('should block spawning when parent has max children', () => {
    const agents = [
      { id: 'root', parent_id: null },
      { id: 'c1', parent_id: 'root' },
      { id: 'c2', parent_id: 'root' },
      { id: 'c3', parent_id: 'root' },
    ];
    const result = canSpawn(DEFAULT_BUDGET, agents, 'root');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Maximum children per agent reached');
  });

  it('should calculate remaining correctly', () => {
    const agents = [
      { id: 'root', parent_id: null },
      { id: 'c1', parent_id: 'root' },
    ];
    // 1 child of root, maxSpawnsPerAgent=3 → 2 remaining from parent limit
    // 2 total agents, 25 max → 23 remaining from global limit
    // min(23, 2) = 2
    const result = canSpawn(DEFAULT_BUDGET, agents, 'root');
    expect(result.remaining).toBe(2);
  });

  it('should allow spawning from leaf node with no children', () => {
    const agents = [
      { id: 'root', parent_id: null },
      { id: 'leaf', parent_id: 'root' },
    ];
    const result = canSpawn(DEFAULT_BUDGET, agents, 'leaf');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(3); // no children yet
    expect(result.depth).toBe(2);
  });

  it('should respect custom budget values', () => {
    const budget = { ...DEFAULT_BUDGET, maxTotalAgents: 5, maxSpawnsPerAgent: 1 };
    const agents = [
      { id: 'root', parent_id: null },
      { id: 'a1', parent_id: 'root' },
    ];
    const result = canSpawn(budget, agents, 'root');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Maximum children per agent reached');
  });
});
