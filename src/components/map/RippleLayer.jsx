// Manages active ripples — subscribes to Zustand events, spawns/removes ripples
// Renders as an SVG group within the transform group

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAgentStore } from '../../stores/agentStore';
import { getEventColor, getRippleConfig } from '../../utils/eventVisuals';
import EventRipple from './EventRipple';

const MAX_ACTIVE_RIPPLES = 20;

export default function RippleLayer({ nodeMap }) {
  const [ripples, setRipples] = useState([]);
  const prevEventsLenRef = useRef(0);
  const rippleIdRef = useRef(0);

  // Subscribe to events from the store
  const events = useAgentStore((s) => s.events);

  // When new events appear, spawn ripples at agent positions
  useEffect(() => {
    const prevLen = prevEventsLenRef.current;
    if (events.length <= prevLen && prevLen !== 0) {
      prevEventsLenRef.current = events.length;
      return;
    }

    // New events are prepended (index 0 = newest)
    const newCount = prevLen === 0 ? Math.min(events.length, 3) : events.length - prevLen;
    prevEventsLenRef.current = events.length;

    if (newCount <= 0) return;

    const newRipples = [];
    for (let i = 0; i < Math.min(newCount, 5); i++) {
      const event = events[i];
      if (!event?.agentId) continue;

      const node = nodeMap?.get(event.agentId);
      if (!node) continue;

      const config = getRippleConfig(event.importance || 'normal');
      if (config.rippleRings === 0) continue;

      newRipples.push({
        id: ++rippleIdRef.current,
        x: node.x,
        y: node.y,
        color: getEventColor(event.type),
        rings: config.rippleRings,
        maxRadius: config.rippleMaxRadius,
        duration: config.rippleDuration,
        createdAt: Date.now(),
      });
    }

    if (newRipples.length > 0) {
      setRipples((prev) => {
        const combined = [...newRipples, ...prev];
        return combined.slice(0, MAX_ACTIVE_RIPPLES);
      });
    }
  }, [events, nodeMap]);

  // Clean up expired ripples periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRipples((prev) =>
        prev.filter((r) => now - r.createdAt < r.duration + 500)
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <g className="ripple-layer">
      {ripples.map((ripple) => (
        <EventRipple key={ripple.id} ripple={ripple} />
      ))}
    </g>
  );
}
