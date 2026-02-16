// PulseBar — heartbeat timeline at the bottom of the map
// Full-width, 48px, shows event density over the last 5 minutes

import { useState, useRef, useCallback } from 'react';
import { useAgentStore } from '../../stores/agentStore';
import useTimelineBuckets from '../../hooks/useTimelineBuckets';
import TimelineTooltip from './TimelineTooltip';
import { eventTypeColors } from '../../utils/eventVisuals';

const BAR_HEIGHT = 48;
const TYPE_COLORS_ORDERED = ['error', 'input', 'spawn', 'complete', 'status', 'activity', 'pause', 'resume'];

export default function PulseBar() {
  const events = useAgentStore((s) => s.events);
  const eventFilter = useAgentStore((s) => s.eventFilter);
  const setEventFilter = useAgentStore((s) => s.setEventFilter);
  const { buckets, maxCount } = useTimelineBuckets(events);

  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: BAR_HEIGHT + 8 });
  const barRef = useRef(null);

  const handleMouseMove = useCallback((e, index) => {
    if (barRef.current) {
      const rect = barRef.current.getBoundingClientRect();
      setTooltipPos({ x: e.clientX - rect.left, y: BAR_HEIGHT + 8 });
    }
    setHoveredIndex(index);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  const filters = ['normal', 'important', 'critical'];

  return (
    <div
      ref={barRef}
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: `${BAR_HEIGHT}px`,
        background: 'var(--theme-surface)',
        borderTop: '1px solid var(--theme-border)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'stretch',
        zIndex: 100,
        opacity: 0.95,
      }}
    >
      {/* Filter controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '0 12px',
          borderRight: '1px solid var(--theme-border)',
          flexShrink: 0,
        }}
      >
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setEventFilter(f)}
            style={{
              padding: '3px 8px',
              fontSize: '10px',
              borderRadius: '4px',
              border: '1px solid',
              borderColor: eventFilter === f ? 'var(--theme-accent)' : 'var(--theme-border)',
              background: eventFilter === f ? 'var(--theme-accent-muted)' : 'transparent',
              color: eventFilter === f ? 'var(--theme-accent)' : 'var(--theme-text-muted)',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {f}+
          </button>
        ))}
      </div>

      {/* Timeline columns */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'flex-end',
          padding: '4px 4px',
          gap: '1px',
          position: 'relative',
        }}
        onMouseLeave={handleMouseLeave}
      >
        {buckets.map((bucket, i) => {
          const height = bucket.total > 0
            ? Math.max(4, (bucket.total / maxCount) * (BAR_HEIGHT - 12))
            : 0;

          return (
            <div
              key={i}
              onMouseMove={(e) => handleMouseMove(e, i)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                height: '100%',
                cursor: bucket.total > 0 ? 'pointer' : 'default',
                opacity: hoveredIndex === i ? 1 : 0.7,
              }}
            >
              {bucket.total > 0 && (
                <div
                  style={{
                    height: `${height}px`,
                    borderRadius: '2px 2px 0 0',
                    background: getColumnGradient(bucket.counts),
                    transition: 'height 0.3s ease',
                  }}
                />
              )}
            </div>
          );
        })}

        {/* Current time marker */}
        <div
          style={{
            position: 'absolute',
            right: '4px',
            top: '2px',
            bottom: '2px',
            width: '2px',
            background: 'var(--theme-accent)',
            borderRadius: '1px',
            opacity: 0.6,
          }}
        />
      </div>

      {/* Tooltip */}
      {hoveredIndex !== null && buckets[hoveredIndex]?.total > 0 && (
        <TimelineTooltip
          bucket={buckets[hoveredIndex]}
          x={tooltipPos.x}
          y={tooltipPos.y}
        />
      )}
    </div>
  );
}

function getColumnGradient(counts) {
  const segments = TYPE_COLORS_ORDERED
    .filter((type) => counts[type] > 0)
    .map((type) => eventTypeColors[type] || 'hsl(210, 30%, 50%)');

  if (segments.length === 0) return 'var(--theme-border)';
  if (segments.length === 1) return segments[0];

  const step = 100 / segments.length;
  const stops = segments.map((color, i) =>
    `${color} ${i * step}%, ${color} ${(i + 1) * step}%`
  ).join(', ');

  return `linear-gradient(to top, ${stops})`;
}
