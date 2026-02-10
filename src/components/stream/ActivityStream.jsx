import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  CheckCircle,
  Pause,
  Play,
  MessageCircle,
  Activity,
  AlertCircle,
  X,
} from 'lucide-react';
import { mapColors } from '../../utils/colorScheme';

const eventIcons = {
  spawn: Sparkles,
  complete: CheckCircle,
  pause: Pause,
  resume: Play,
  input: MessageCircle,
  activity: Activity,
  status: AlertCircle,
  error: X,
};

const eventColors = {
  spawn: '#c9a87c',
  complete: 'hsl(150, 70%, 50%)',
  pause: 'hsl(45, 70%, 50%)',
  resume: 'hsl(210, 70%, 50%)',
  input: '#c9a87c',
  activity: mapColors.textSecondary,
  status: mapColors.textSecondary,
  error: 'hsl(0, 70%, 50%)',
};

function formatTime(date) {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function ActivityStream({ events, onEventClick }) {
  const containerRef = useRef(null);

  // Auto-scroll to top when new events arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [events.length]);

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: mapColors.nodeBackground,
        borderLeft: `1px solid ${mapColors.nodeBorder}`,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: `1px solid ${mapColors.nodeBorder}`,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Activity size={16} style={{ color: mapColors.textMuted }} />
        <span
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: mapColors.textPrimary,
            letterSpacing: '0.02em',
          }}
        >
          Activity Stream
        </span>
        <span
          style={{
            fontSize: '11px',
            color: mapColors.textMuted,
            marginLeft: 'auto',
          }}
        >
          {events.length} events
        </span>
      </div>

      {/* Event list */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        <AnimatePresence>
          {events.map((event) => {
            const Icon = eventIcons[event.type] || Activity;
            const color = eventColors[event.type] || mapColors.textSecondary;

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                onClick={() => onEventClick?.(event.agentId)}
                style={{
                  padding: '12px 16px',
                  borderBottom: `1px solid ${mapColors.nodeBorder}`,
                  cursor: event.agentId ? 'pointer' : 'default',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (event.agentId) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      background: `${color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={12} style={{ color }} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '12px',
                        color: mapColors.textPrimary,
                        marginBottom: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {event.agentName && (
                        <span style={{ color, fontWeight: 500 }}>
                          {event.agentName}
                        </span>
                      )}
                      {event.agentName && ' — '}
                      <span style={{ color: mapColors.textSecondary }}>
                        {event.message}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '10px',
                        color: mapColors.textMuted,
                      }}
                    >
                      {formatTime(event.timestamp)}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {events.length === 0 && (
          <div
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: mapColors.textMuted,
              fontSize: '13px',
            }}
          >
            No activity yet
          </div>
        )}
      </div>
    </div>
  );
}
