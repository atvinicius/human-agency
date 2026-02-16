// Ambient background layer — soft radial gradient glows behind active agent clusters
// Color tinted by dominant role hue, brightness proportional to activity density

import { useMemo } from 'react';
import { roleHues } from '../../utils/colorScheme';

export default function AmbientLayer({ agents }) {
  const clusters = useMemo(() => {
    // Group working agents by role
    const roleGroups = {};
    for (const agent of agents) {
      if (agent.status !== 'working' && agent.status !== 'spawning') continue;
      if (!agent.x || !agent.y) continue;

      const role = agent.role || 'researcher';
      if (!roleGroups[role]) roleGroups[role] = [];
      roleGroups[role].push(agent);
    }

    // Compute centroid and glow for each role cluster
    return Object.entries(roleGroups)
      .filter(([, group]) => group.length > 0)
      .map(([role, group]) => {
        const cx = group.reduce((s, a) => s + a.x, 0) / group.length;
        const cy = group.reduce((s, a) => s + a.y, 0) / group.length;
        const hue = roleHues[role] ?? 210;
        const intensity = Math.min(group.length / 8, 1); // saturate at 8 agents
        const radius = 150 + group.length * 30;

        return { cx, cy, hue, intensity, radius, role };
      });
  }, [agents]);

  if (clusters.length === 0) return null;

  return (
    <g className="ambient-layer" style={{ pointerEvents: 'none' }}>
      {clusters.map((cluster) => (
        <circle
          key={cluster.role}
          cx={cluster.cx}
          cy={cluster.cy}
          r={cluster.radius}
          fill={`hsla(${cluster.hue}, 50%, 40%, ${0.04 * cluster.intensity})`}
          style={{ filter: 'blur(40px)' }}
        />
      ))}
    </g>
  );
}
