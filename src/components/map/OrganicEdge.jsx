// Organic edge connecting parent and child agent orbs
// Subtle sinusoidal waviness, animated flow particles
// Directional data flow particles with type-specific colors

import React from 'react';

const FLOW_COLORS = {
  findings: 'hsl(210, 70%, 60%)',
  context: 'hsl(45, 70%, 55%)',
  synthesis: 'hsl(30, 80%, 55%)',
  search_result: 'hsl(150, 70%, 50%)',
};

function OrganicEdge({ source, target, isHighlighted, isActive, zoomK, dataFlows = [] }) {
  const sx = source.x;
  const sy = source.y;
  const tx = target.x;
  const ty = target.y;

  const dx = tx - sx;
  const dy = ty - sy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // At far zoom, render simple straight lines for performance
  const isFarZoom = zoomK < 0.4;

  // Sinusoidal waviness via cubic bezier control points
  const midX = (sx + tx) / 2;
  const midY = (sy + ty) / 2;

  // Perpendicular offset for wave (subtle, scaled by distance)
  const waveAmp = isFarZoom ? 0 : Math.min(dist * 0.06, 20);
  const perpX = -dy / (dist || 1) * waveAmp;
  const perpY = dx / (dist || 1) * waveAmp;

  const cp1x = midX + perpX * 0.5;
  const cp1y = midY + perpY * 0.5;
  const cp2x = midX - perpX * 0.3;
  const cp2y = midY - perpY * 0.3;

  const pathData = isFarZoom
    ? `M ${sx} ${sy} L ${tx} ${ty}`
    : `M ${sx} ${sy} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${tx} ${ty}`;

  // Edge thickness scales with active data transfer count
  const activeFlowCount = dataFlows.length;
  const baseWidth = isActive ? 2.5 : isHighlighted ? 1.5 : 1;
  const strokeWidth = baseWidth + Math.min(activeFlowCount * 0.5, 2);
  const opacity = activeFlowCount > 0 ? 0.7 : isHighlighted ? 0.6 : 0.3;

  const pathId = `edge-${source.id}-${target.id}`;

  return (
    <g>
      {/* Main edge */}
      <path
        id={pathId}
        d={pathData}
        fill="none"
        stroke={isHighlighted ? 'var(--theme-border-active)' : 'var(--theme-border)'}
        strokeWidth={strokeWidth}
        opacity={opacity}
        strokeLinecap="round"
      />

      {/* Animated flow particle along the edge when both agents are active */}
      {isActive && !isFarZoom && activeFlowCount === 0 && (
        <circle r={2.5} fill="var(--theme-accent)" opacity={0.7}>
          <animateMotion
            dur="2.5s"
            repeatCount="indefinite"
            path={pathData}
          />
        </circle>
      )}

      {/* Directional data flow particles */}
      {!isFarZoom && dataFlows.map((flow, i) => {
        const color = FLOW_COLORS[flow.type] || 'var(--theme-accent)';
        // Determine direction: source→target or target→source
        const isReverse = flow.sourceId === target.id;
        const flowPath = isReverse
          ? (isFarZoom
            ? `M ${tx} ${ty} L ${sx} ${sy}`
            : `M ${tx} ${ty} C ${cp2x} ${cp2y}, ${cp1x} ${cp1y}, ${sx} ${sy}`)
          : pathData;

        return (
          <g key={`flow-${flow.id}-${i}`}>
            {/* Glow trail */}
            <circle r={4} fill={color} opacity={0.15}>
              <animateMotion
                dur="1.5s"
                repeatCount="1"
                path={flowPath}
                fill="freeze"
              />
              <animate
                attributeName="opacity"
                values="0.3;0.15;0"
                dur="1.5s"
                fill="freeze"
              />
            </circle>
            {/* Core particle */}
            <circle r={2.5} fill={color} opacity={0.8}>
              <animateMotion
                dur="1.5s"
                repeatCount="1"
                path={flowPath}
                fill="freeze"
              />
              <animate
                attributeName="opacity"
                values="0.9;0.7;0"
                dur="1.5s"
                fill="freeze"
              />
            </circle>
          </g>
        );
      })}
    </g>
  );
}

export default React.memo(OrganicEdge, (prev, next) => {
  return (
    prev.source.x === next.source.x &&
    prev.source.y === next.source.y &&
    prev.target.x === next.target.x &&
    prev.target.y === next.target.y &&
    prev.isHighlighted === next.isHighlighted &&
    prev.isActive === next.isActive &&
    prev.zoomK === next.zoomK &&
    prev.dataFlows === next.dataFlows
  );
});
