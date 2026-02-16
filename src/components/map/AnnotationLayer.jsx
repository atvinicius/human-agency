// Manages floating annotations — spawns pills near agents for important events
// Respects zoom-level visibility and per-agent/global caps

import { useState, useEffect, useRef } from 'react';
import { useAgentStore } from '../../stores/agentStore';
import { getEventColor, isAnnotationVisibleAtZoom, importanceConfig } from '../../utils/eventVisuals';
import FloatingAnnotation from './FloatingAnnotation';

const MAX_PER_AGENT = 3;
const MAX_GLOBAL = 15;

export default function AnnotationLayer({ nodeMap, zoomK }) {
  const [annotations, setAnnotations] = useState([]);
  const prevEventsLenRef = useRef(0);
  const annotationIdRef = useRef(0);

  const events = useAgentStore((s) => s.events);

  // Spawn annotations for new important events
  useEffect(() => {
    const prevLen = prevEventsLenRef.current;
    if (events.length <= prevLen && prevLen !== 0) {
      prevEventsLenRef.current = events.length;
      return;
    }

    const newCount = prevLen === 0 ? Math.min(events.length, 2) : events.length - prevLen;
    prevEventsLenRef.current = events.length;
    if (newCount <= 0) return;

    const newAnnotations = [];
    for (let i = 0; i < Math.min(newCount, 3); i++) {
      const event = events[i];
      if (!event?.agentId) continue;

      const importance = event.importance || 'normal';
      const config = importanceConfig[importance];
      if (!config?.annotationVisible || config.annotationLifetime <= 0) continue;

      const node = nodeMap?.get(event.agentId);
      if (!node) continue;

      newAnnotations.push({
        id: ++annotationIdRef.current,
        agentId: event.agentId,
        x: node.x,
        y: node.y,
        message: event.message?.slice(0, 40) || event.type,
        color: getEventColor(event.type),
        importance,
        lifetime: config.annotationLifetime,
        createdAt: Date.now(),
        offsetY: -(node._radius || 30) - 20,
      });
    }

    if (newAnnotations.length > 0) {
      setAnnotations((prev) => {
        // Enforce per-agent cap
        const combined = [...newAnnotations, ...prev];
        const agentCounts = {};
        const filtered = combined.filter((a) => {
          agentCounts[a.agentId] = (agentCounts[a.agentId] || 0) + 1;
          return agentCounts[a.agentId] <= MAX_PER_AGENT;
        });
        return filtered.slice(0, MAX_GLOBAL);
      });
    }
  }, [events, nodeMap]);

  // Clean up expired annotations
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setAnnotations((prev) =>
        prev.filter((a) => now - a.createdAt < a.lifetime)
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter by zoom level
  const visible = annotations.filter((a) =>
    isAnnotationVisibleAtZoom(a.importance, zoomK)
  );

  return (
    <g className="annotation-layer">
      {visible.map((annotation) => {
        // Stack vertically if same agent
        const sameAgentAbove = visible.filter(
          (a) => a.agentId === annotation.agentId && a.id < annotation.id
        ).length;

        return (
          <FloatingAnnotation
            key={annotation.id}
            annotation={{
              ...annotation,
              offsetY: annotation.offsetY - sameAgentAbove * 26,
            }}
          />
        );
      })}
    </g>
  );
}
