// Luminous orb representing an agent in the force-directed map
// Full SVG rendering — glow, pulse, attention ring, role-tinted gradient

import React, { useMemo } from 'react';
import { getAgentColor } from '../../utils/colorScheme';
import {
  getOrbGradientStops,
  getBrightness,
  getPulseSpeed,
  getAttentionRing,
  getSpotlightOpacity,
} from '../../utils/orbStyles';

function AgentOrb({
  agent,
  isSelected,
  selectedAgentId,
  connectedIds,
  zoomK,
  onSelect,
}) {
  const { id, name, role, status, progress, x, y, _radius: radius = 30 } = agent;

  const color = getAgentColor(role, status);
  const gradientStops = getOrbGradientStops(role, status);
  const brightness = getBrightness(status);
  const pulseSpeed = getPulseSpeed(status);
  const attentionRing = getAttentionRing(agent);
  const spotlightOpacity = getSpotlightOpacity(id, selectedAgentId, connectedIds);

  // Unique IDs for SVG defs scoped to this orb
  const gradientId = `orb-grad-${id}`;
  const glowFilterId = `orb-glow-${id}`;

  // Show name at medium zoom, full detail at close zoom
  const showName = zoomK >= 0.4;
  const showRole = zoomK >= 0.6;
  const showProgress = zoomK >= 0.8;

  const handleClick = (e) => {
    e.stopPropagation();
    onSelect(id);
  };

  return (
    <g
      transform={`translate(${x}, ${y})`}
      opacity={spotlightOpacity}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      {/* SVG defs for this orb */}
      <defs>
        <radialGradient id={gradientId} cx="35%" cy="35%" r="65%">
          {gradientStops.map((stop, i) => (
            <stop key={i} offset={stop.offset} stopColor={stop.color} />
          ))}
        </radialGradient>
        <filter id={glowFilterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={4 * brightness} result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values={`1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${0.5 * brightness} 0`}
          />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer glow */}
      <circle
        r={radius + 8}
        fill="none"
        stroke={color}
        strokeWidth={1}
        opacity={0.15 * brightness}
        filter={`url(#${glowFilterId})`}
      />

      {/* Attention ring (rotating dashes for pendingInput) */}
      {attentionRing && (
        <circle
          r={radius + attentionRing.radiusOffset}
          fill="none"
          stroke={attentionRing.color}
          strokeWidth={attentionRing.width}
          strokeDasharray={attentionRing.dashArray}
          opacity={0.9}
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0"
            to="360"
            dur={attentionRing.animationDuration}
            repeatCount="indefinite"
          />
        </circle>
      )}

      {/* Status pulse ring (breathing animation for working agents) */}
      {pulseSpeed > 0 && (
        <circle
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
        >
          <animate
            attributeName="r"
            values={`${radius};${radius + 6};${radius}`}
            dur={`${pulseSpeed}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.6;0.1;0.6"
            dur={`${pulseSpeed}s`}
            repeatCount="indefinite"
          />
        </circle>
      )}

      {/* Main body */}
      <circle
        r={radius}
        fill={`url(#${gradientId})`}
        stroke={isSelected ? 'var(--theme-accent)' : color}
        strokeWidth={isSelected ? 2 : 0.5}
        opacity={brightness}
      />

      {/* Inner highlight (luminous center) */}
      <circle
        r={radius * 0.35}
        fill="white"
        opacity={0.08 * brightness}
      />

      {/* Progress arc */}
      {showProgress && progress > 0 && progress < 100 && (
        <circle
          r={radius + 3}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeDasharray={`${(2 * Math.PI * (radius + 3) * progress) / 100} ${2 * Math.PI * (radius + 3)}`}
          strokeDashoffset={0}
          transform="rotate(-90)"
          opacity={0.7}
          strokeLinecap="round"
        />
      )}

      {/* Name label */}
      {showName && (
        <text
          y={radius + 16}
          textAnchor="middle"
          fill="var(--theme-text-primary)"
          fontSize={11}
          fontFamily="var(--font-family-sans)"
          opacity={Math.min((zoomK - 0.3) / 0.3, 1)}
          pointerEvents="none"
        >
          {name}
        </text>
      )}

      {/* Role label */}
      {showRole && (
        <text
          y={radius + 28}
          textAnchor="middle"
          fill="var(--theme-text-muted)"
          fontSize={9}
          fontFamily="var(--font-family-sans)"
          textTransform="uppercase"
          opacity={Math.min((zoomK - 0.5) / 0.3, 0.7)}
          pointerEvents="none"
        >
          {role}
        </text>
      )}
    </g>
  );
}

export default React.memo(AgentOrb, (prev, next) => {
  return (
    prev.agent.x === next.agent.x &&
    prev.agent.y === next.agent.y &&
    prev.agent.status === next.agent.status &&
    prev.agent.progress === next.agent.progress &&
    prev.agent.pendingInput === next.agent.pendingInput &&
    prev.agent.pending_input === next.agent.pending_input &&
    prev.isSelected === next.isSelected &&
    prev.selectedAgentId === next.selectedAgentId &&
    prev.zoomK === next.zoomK
  );
});
