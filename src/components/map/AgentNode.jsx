import { motion } from 'framer-motion';
import { Pause, Play, Eye, X, AlertCircle, Clock, CheckCircle, Loader } from 'lucide-react';
import {
  getAgentColor,
  getAgentGlow,
  getAgentOpacity,
  getAgentBorderWidth,
  getAgentScale,
  mapColors,
} from '../../utils/colorScheme';

const statusIcons = {
  spawning: Loader,
  working: null,
  waiting: Clock,
  paused: Pause,
  blocked: AlertCircle,
  completed: CheckCircle,
  failed: X,
};

export default function AgentNode({
  agent,
  isSelected,
  onSelect,
  onPause,
  onResume,
  onDive,
}) {
  const {
    id,
    name,
    role,
    status,
    priority,
    progress,
    currentActivity,
    pendingInput,
    isGroup,
    groupCount,
  } = agent;

  const color = getAgentColor(role, status);
  const glow = getAgentGlow(role, status, priority);
  const opacity = getAgentOpacity(status, priority);
  const borderWidth = getAgentBorderWidth(priority);
  const scale = getAgentScale(priority);

  const StatusIcon = statusIcons[status];
  const isPausable = !['completed', 'failed', 'paused'].includes(status);
  const isResumable = status === 'paused';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity,
        scale: isSelected ? scale * 1.05 : scale,
      }}
      whileHover={{ scale: scale * 1.02 }}
      onClick={() => onSelect(id)}
      style={{
        position: 'absolute',
        left: agent.x,
        top: agent.y,
        width: agent.width || 280,
        height: agent.height || 120,
        background: mapColors.nodeBackground,
        border: `${borderWidth}px solid ${isSelected ? color : mapColors.nodeBorder}`,
        borderRadius: '8px',
        boxShadow: isSelected ? glow : 'none',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: `1px solid ${mapColors.nodeBorder}`,
          background: `linear-gradient(90deg, ${color}15, transparent)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Status indicator */}
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: color,
              animation: status === 'working' ? 'pulse 2s infinite' : 'none',
            }}
          />
          <span
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: mapColors.textMuted,
            }}
          >
            {role}
          </span>
          {StatusIcon && (
            <StatusIcon
              size={12}
              style={{ color: mapColors.textMuted }}
            />
          )}
        </div>

        {/* Quick actions */}
        <div
          style={{ display: 'flex', gap: '4px' }}
          onClick={(e) => e.stopPropagation()}
        >
          {isPausable && (
            <button
              onClick={() => onPause(id)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                color: mapColors.textMuted,
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => (e.target.style.color = mapColors.textPrimary)}
              onMouseLeave={(e) => (e.target.style.color = mapColors.textMuted)}
              title="Pause"
            >
              <Pause size={12} />
            </button>
          )}
          {isResumable && (
            <button
              onClick={() => onResume(id)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                color: mapColors.textMuted,
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => (e.target.style.color = mapColors.textPrimary)}
              onMouseLeave={(e) => (e.target.style.color = mapColors.textMuted)}
              title="Resume"
            >
              <Play size={12} />
            </button>
          )}
          <button
            onClick={() => onDive(id)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              color: mapColors.textMuted,
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={(e) => (e.target.style.color = mapColors.textPrimary)}
            onMouseLeave={(e) => (e.target.style.color = mapColors.textMuted)}
            title="Dive In"
          >
            <Eye size={12} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Name */}
        <div
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: mapColors.textPrimary,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {isGroup ? `${groupCount} ${role}s` : name}
        </div>

        {/* Progress bar */}
        <div
          style={{
            height: '4px',
            background: mapColors.nodeBorder,
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
            style={{
              height: '100%',
              background: color,
              borderRadius: '2px',
            }}
          />
        </div>

        {/* Activity */}
        <div
          style={{
            fontSize: '11px',
            color: mapColors.textSecondary,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {pendingInput ? (
            <span style={{ color: '#c9a87c' }}>
              Awaiting input...
            </span>
          ) : (
            currentActivity
          )}
        </div>
      </div>

      {/* Pending input indicator */}
      {pendingInput && (
        <div
          style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            width: '20px',
            height: '20px',
            background: '#c9a87c',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'pulse 1.5s infinite',
          }}
        >
          <AlertCircle size={12} color="#0a0a0a" />
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </motion.div>
  );
}
