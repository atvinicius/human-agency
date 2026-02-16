// Orb visual calculations — sizing, glow, pulse, gradients
// Used by AgentOrb and AmbientLayer

import { roleHues, statusStyles } from './colorScheme';

/**
 * Get the HSL components for an agent's role + status.
 */
export function getOrbHSL(role, status) {
  const hue = statusStyles[status]?.hueOverride ?? roleHues[role] ?? 210;
  const { saturation, lightness } = statusStyles[status] || statusStyles.working;
  return { h: hue, s: saturation, l: lightness };
}

/**
 * Get the glow color (brighter version of the orb color) as an HSL string.
 */
export function getGlowColor(role, status, alpha = 0.6) {
  const { h, s, l } = getOrbHSL(role, status);
  return `hsla(${h}, ${s + 10}%, ${Math.min(l + 15, 80)}%, ${alpha})`;
}

/**
 * Brightness factor based on activity level.
 * Working = bright, completed = dim, etc.
 */
export function getBrightness(status) {
  const map = {
    spawning: 0.7,
    working: 1.0,
    waiting: 0.75,
    paused: 0.4,
    blocked: 0.9,
    completed: 0.3,
    failed: 0.5,
  };
  return map[status] ?? 0.6;
}

/**
 * Pulse speed in seconds (breathing animation).
 * Working agents pulse faster, idle ones slower.
 */
export function getPulseSpeed(status) {
  const map = {
    spawning: 1.5,
    working: 2.0,
    waiting: 3.0,
    paused: 0, // no pulse
    blocked: 1.2,
    completed: 0, // no pulse
    failed: 0,
  };
  return map[status] ?? 0;
}

/**
 * SVG radial gradient stops for the orb body.
 */
export function getOrbGradientStops(role, status) {
  const { h, s, l } = getOrbHSL(role, status);
  const brightness = getBrightness(status);

  return [
    { offset: '0%', color: `hsl(${h}, ${s}%, ${Math.min(l + 25 * brightness, 85)}%)` },
    { offset: '40%', color: `hsl(${h}, ${s}%, ${l + 5 * brightness}%)` },
    { offset: '100%', color: `hsl(${h}, ${Math.max(s - 10, 10)}%, ${Math.max(l - 10, 10)}%)` },
  ];
}

/**
 * Attention ring config for agents needing human input.
 */
export function getAttentionRing(agent) {
  const hasPending = agent.pendingInput || agent.pending_input;
  if (!hasPending) return null;

  return {
    dashArray: '6 4',
    animationDuration: '3s',
    color: 'var(--theme-accent)',
    width: 2,
    radiusOffset: 6,
  };
}

/**
 * Compute opacity for focus/dim spotlight effect.
 * When an agent is selected, connected agents stay visible, others dim.
 */
export function getSpotlightOpacity(agentId, selectedId, connectedIds) {
  if (!selectedId) return 1;
  if (agentId === selectedId) return 1;
  if (connectedIds?.has(agentId)) return 0.8;
  return 0.2;
}
