// Floating annotation pill — appears near an agent for important events
// Fades in, drifts slightly outward, fades out

import React from 'react';

export default function FloatingAnnotation({ annotation }) {
  const { x, y, message, color, offsetY, lifetime } = annotation;

  return (
    <foreignObject
      x={x - 80}
      y={y + offsetY}
      width={160}
      height={28}
      style={{ overflow: 'visible', pointerEvents: 'none' }}
    >
      <div
        style={{
          display: 'inline-block',
          maxWidth: '160px',
          padding: '3px 10px',
          background: 'var(--theme-surface)',
          border: `1px solid ${color}40`,
          borderRadius: '12px',
          fontSize: '10px',
          color: 'var(--theme-text-secondary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          textAlign: 'center',
          animation: `annotationFade ${lifetime}ms ease-out forwards`,
          backdropFilter: 'blur(4px)',
        }}
      >
        {message}
      </div>
    </foreignObject>
  );
}
