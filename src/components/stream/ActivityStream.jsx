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
  AlertTriangle,
  Search,
} from 'lucide-react';

const eventIcons = {
  spawn: Sparkles,
  complete: CheckCircle,
  pause: Pause,
  resume: Play,
  input: MessageCircle,
  activity: Activity,
  status: AlertCircle,
  error: X,
  search: Search,
};

const eventColors = {
  spawn: 'var(--theme-accent)',
  complete: 'hsl(150, 70%, 50%)',
  pause: 'hsl(45, 70%, 50%)',
  resume: 'hsl(210, 70%, 50%)',
  input: 'var(--theme-accent)',
  activity: 'var(--theme-text-secondary)',
  status: 'var(--theme-text-secondary)',
  error: 'hsl(0, 70%, 50%)',
  search: 'hsl(210, 70%, 60%)',
};

// Visual treatment per importance level
const importanceStyles = {
  critical: {
    borderLeft: '3px solid hsl(0, 70%, 55%)',
    background: 'hsl(0, 70%, 55%, 0.06)',
    fontWeight: 500,
    opacity: 1,
    fontSize: '12px',
  },
  important: {
    borderLeft: '2px solid var(--theme-accent)',
    background: 'transparent',
    fontWeight: 400,
    opacity: 1,
    fontSize: '12px',
  },
  normal: {
    borderLeft: 'none',
    background: 'transparent',
    fontWeight: 400,
    opacity: 0.85,
    fontSize: '12px',
  },
  debug: {
    borderLeft: 'none',
    background: 'transparent',
    fontWeight: 400,
    opacity: 0.5,
    fontSize: '11px',
  },
};

const filterOptions = [
  { key: 'debug', label: 'All' },
  { key: 'normal', label: 'Normal+' },
  { key: 'important', label: 'Important+' },
  { key: 'critical', label: 'Critical' },
];

function formatTime(date) {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function ActivityStream({ events, onEventClick, eventFilter, onFilterChange, criticalCount }) {
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
        background: 'var(--theme-surface)',
        borderLeft: '1px solid var(--theme-border)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--theme-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={16} style={{ color: 'var(--theme-text-muted)' }} />
          <span
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--theme-text-primary)',
              letterSpacing: '0.02em',
            }}
          >
            Activity Stream
          </span>
          {criticalCount > 0 && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                padding: '2px 6px',
                background: 'hsl(0, 70%, 55%)',
                color: '#fff',
                borderRadius: '8px',
                minWidth: '18px',
                textAlign: 'center',
                animation: 'pulse 1.5s infinite',
              }}
            >
              {criticalCount}
            </span>
          )}
          <span
            style={{
              fontSize: '11px',
              color: 'var(--theme-text-muted)',
              marginLeft: 'auto',
            }}
          >
            {events.length} events
          </span>
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {filterOptions.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onFilterChange?.(key)}
              style={{
                padding: '3px 8px',
                fontSize: '10px',
                fontWeight: eventFilter === key ? 600 : 400,
                background: eventFilter === key ? 'var(--theme-accent)' : 'transparent',
                color: eventFilter === key ? 'var(--theme-accent-text)' : 'var(--theme-text-muted)',
                border: eventFilter === key ? 'none' : '1px solid var(--theme-border)',
                borderRadius: '10px',
                cursor: 'pointer',
                letterSpacing: '0.02em',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
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
            const color = eventColors[event.type] || 'var(--theme-text-secondary)';
            const importance = event.importance || 'normal';
            const style = importanceStyles[importance];

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: style.opacity, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                onClick={() => onEventClick?.(event.agentId)}
                style={{
                  padding: importance === 'debug' ? '8px 16px' : '12px 16px',
                  borderBottom: '1px solid var(--theme-border)',
                  borderLeft: style.borderLeft,
                  background: style.background,
                  cursor: event.agentId ? 'pointer' : 'default',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (event.agentId) {
                    e.currentTarget.style.background = 'var(--theme-surface-elevated)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = style.background;
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
                      width: importance === 'critical' ? '28px' : '24px',
                      height: importance === 'critical' ? '28px' : '24px',
                      borderRadius: '6px',
                      background: importance === 'critical' ? `${color}25` : `${color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {importance === 'critical' ? (
                      <AlertTriangle size={14} style={{ color }} />
                    ) : (
                      <Icon size={12} style={{ color }} />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: style.fontSize,
                        fontWeight: style.fontWeight,
                        color: importance === 'debug' ? 'var(--theme-text-muted)' : 'var(--theme-text-primary)',
                        marginBottom: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {event.agentName && (
                        <span style={{ color: importance === 'debug' ? 'var(--theme-text-muted)' : color, fontWeight: 500 }}>
                          {event.agentName}
                        </span>
                      )}
                      {event.agentName && ' — '}
                      <span style={{ color: importance === 'debug' ? 'var(--theme-text-muted)' : 'var(--theme-text-secondary)' }}>
                        {event.message}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '10px',
                        color: 'var(--theme-text-muted)',
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
              color: 'var(--theme-text-muted)',
              fontSize: '13px',
            }}
          >
            No activity yet
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
