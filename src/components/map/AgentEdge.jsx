import { mapColors } from '../../utils/colorScheme';

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
          stroke={mapColors.edgeActive}
          strokeWidth={4}
          strokeOpacity={0.3}
        />
      )}
      {/* Main edge */}
      <path
        d={pathData}
        fill="none"
        stroke={isHighlighted ? mapColors.edgeActive : mapColors.edgeDefault}
        strokeWidth={isHighlighted ? 2 : 1}
        strokeDasharray={isHighlighted ? 'none' : 'none'}
      />
      {/* Arrow head at target */}
      <circle
        cx={targetX}
        cy={targetY}
        r={3}
        fill={isHighlighted ? mapColors.edgeActive : mapColors.edgeDefault}
      />
    </g>
  );
}
