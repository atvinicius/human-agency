// Role-based color scheme using HSL
// Hue defines the role, saturation/lightness modified by status

export const roleHues = {
  coordinator: 45,   // Gold - command nodes
  researcher: 210,   // Blue - information gathering
  executor: 150,     // Green - action taking
  validator: 280,    // Purple - verification
  synthesizer: 30,   // Orange - combining outputs
};

export const statusStyles = {
  spawning: { saturation: 50, lightness: 50, opacity: 0.7 },
  working: { saturation: 70, lightness: 50, opacity: 1 },
  waiting: { saturation: 40, lightness: 45, opacity: 0.8 },
  paused: { saturation: 30, lightness: 40, opacity: 0.6 },
  blocked: { saturation: 80, lightness: 45, opacity: 1, hueOverride: 0 }, // Red
  completed: { saturation: 20, lightness: 35, opacity: 0.5 },
  failed: { saturation: 90, lightness: 40, opacity: 1, hueOverride: 0 }, // Intense red
};

export const priorityStyles = {
  critical: { glow: true, glowIntensity: 'high', borderWidth: 3, scale: 1.1 },
  high: { glow: true, glowIntensity: 'low', borderWidth: 2, scale: 1.05 },
  normal: { glow: false, borderWidth: 1, scale: 1 },
  low: { glow: false, borderWidth: 1, scale: 0.95, opacity: 0.8 },
  background: { glow: false, borderWidth: 1, scale: 0.9, opacity: 0.6 },
};

export function getAgentColor(role, status) {
  const hue = statusStyles[status]?.hueOverride ?? roleHues[role] ?? 210;
  const { saturation, lightness } = statusStyles[status] || statusStyles.working;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function getAgentGlow(role, status, priority) {
  const color = getAgentColor(role, status);
  const priorityConfig = priorityStyles[priority] || priorityStyles.normal;

  if (!priorityConfig.glow) return 'none';

  const intensity = priorityConfig.glowIntensity === 'high' ? '0 0 20px' : '0 0 10px';
  return `${intensity} ${color}`;
}

export function getAgentOpacity(status, priority) {
  const statusOpacity = statusStyles[status]?.opacity ?? 1;
  const priorityOpacity = priorityStyles[priority]?.opacity ?? 1;
  return statusOpacity * priorityOpacity;
}

export function getAgentBorderWidth(priority) {
  return priorityStyles[priority]?.borderWidth ?? 1;
}

export function getAgentScale(priority) {
  return priorityStyles[priority]?.scale ?? 1;
}

// CSS variables for theming
export const mapColors = {
  background: '#0a0a0a',
  gridLine: '#1a1a1a',
  nodeBackground: '#141414',
  nodeBorder: '#2a2a2a',
  textPrimary: '#e8e4df',
  textSecondary: '#9a948e',
  textMuted: '#6b6560',
  edgeDefault: '#2a2a2a',
  edgeActive: '#4a4a4a',
};
