// Shared mission utilities — used by PresetSelector and CustomMissionInput

export const roleColors = {
  coordinator: 'hsl(45, 70%, 50%)',
  researcher: 'hsl(210, 70%, 50%)',
  executor: 'hsl(150, 70%, 50%)',
  validator: 'hsl(280, 70%, 50%)',
  synthesizer: 'hsl(30, 70%, 50%)',
};

/**
 * Count agents in a nested config tree.
 */
export function countAgents(config) {
  if (!config) return 0;
  let count = 1;
  if (config.children) {
    for (const child of config.children) {
      count += countAgents(child);
    }
  }
  return count;
}

/**
 * Build a flat summary of the agent tree for preview display.
 * Each item includes { ...config, depth } for indentation.
 */
export function flattenTree(config, depth = 0) {
  if (!config) return [];
  const items = [{ ...config, depth }];
  if (config.children) {
    for (const child of config.children) {
      items.push(...flattenTree(child, depth + 1));
    }
  }
  return items;
}
