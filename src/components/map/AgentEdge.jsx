export default function AgentEdge({ edge, isHighlighted }) {
  const { sourceX, sourceY, targetX, targetY } = edge;

  // Calculate control points for a smooth bezier curve
  const midX = (sourceX + targetX) / 2;

  const pathData = `
    M ${sourceX} ${sourceY}
    C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}
  `;

  return (
    <g>
      {/* Shadow/glow for highlighted edges */}
      {isHighlighted && (
        <path
          d={pathData}
          fill="none"
          stroke="var(--theme-border-active)"
          strokeWidth={4}
          strokeOpacity={0.3}
        />
      )}
      {/* Main edge */}
      <path
        d={pathData}
        fill="none"
        stroke={isHighlighted ? 'var(--theme-border-active)' : 'var(--theme-border)'}
        strokeWidth={isHighlighted ? 2 : 1}
        strokeDasharray={isHighlighted ? 'none' : 'none'}
      />
      {/* Arrow head at target */}
      <circle
        cx={targetX}
        cy={targetY}
        r={3}
        fill={isHighlighted ? 'var(--theme-border-active)' : 'var(--theme-border)'}
      />
    </g>
  );
}
