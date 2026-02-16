// Single event ripple — concentric circles emanating from an agent's position
// Color = event type, size/rings = importance level

import React from 'react';

export default function EventRipple({ ripple }) {
  const { x, y, color, rings, maxRadius, duration, id } = ripple;

  return (
    <g>
      {Array.from({ length: rings }, (_, i) => {
        const delay = (i / rings) * (duration / 3);
        const ringRadius = maxRadius * ((i + 1) / rings);

        return (
          <circle
            key={`${id}-${i}`}
            cx={x}
            cy={y}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
          >
            <animate
              attributeName="r"
              from="0"
              to={ringRadius}
              dur={`${duration}ms`}
              begin={`${delay}ms`}
              repeatCount="1"
              fill="freeze"
            />
            <animate
              attributeName="opacity"
              from="0.6"
              to="0"
              dur={`${duration}ms`}
              begin={`${delay}ms`}
              repeatCount="1"
              fill="freeze"
            />
          </circle>
        );
      })}
    </g>
  );
}
