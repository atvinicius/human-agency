import { motion } from 'framer-motion';
import { Pause, Play, Eye, X, RotateCcw } from 'lucide-react';
import { getAgentColor } from '../../utils/colorScheme';

export default function QuickActions({
  agent,
  onPause,
  onResume,
  onDive,
  onCancel,
  onRedirect,
}) {
  if (!agent) return null;

  const color = getAgentColor(agent.role, agent.status);
  const isPausable = !['completed', 'failed', 'paused'].includes(agent.status);
  const isResumable = agent.status === 'paused';
  const isCancellable = !['completed', 'failed'].includes(agent.status);

  const buttonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    background: 'transparent',
    border: '1px solid var(--theme-border)',
    borderRadius: '6px',
    color: 'var(--theme-text-secondary)',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
      }}
    >
      {isPausable && (
        <button
          onClick={() => onPause(agent.id)}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--theme-accent)';
            e.currentTarget.style.color = 'var(--theme-accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--theme-border)';
            e.currentTarget.style.color = 'var(--theme-text-secondary)';
          }}
        >
          <Pause size={14} />
          Pause
        </button>
      )}

      {isResumable && (
        <button
          onClick={() => onResume(agent.id)}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'hsl(150, 70%, 50%)';
            e.currentTarget.style.color = 'hsl(150, 70%, 50%)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--theme-border)';
            e.currentTarget.style.color = 'var(--theme-text-secondary)';
          }}
        >
          <Play size={14} />
          Resume
        </button>
      )}

      <button
        onClick={() => onDive(agent.id)}
        style={buttonStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = color;
          e.currentTarget.style.color = color;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--theme-border)';
          e.currentTarget.style.color = 'var(--theme-text-secondary)';
        }}
      >
        <Eye size={14} />
        Dive In
      </button>

      {onRedirect && (
        <button
          onClick={() => onRedirect(agent.id)}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'hsl(210, 70%, 50%)';
            e.currentTarget.style.color = 'hsl(210, 70%, 50%)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--theme-border)';
            e.currentTarget.style.color = 'var(--theme-text-secondary)';
          }}
        >
          <RotateCcw size={14} />
          Redirect
        </button>
      )}

      {isCancellable && onCancel && (
        <button
          onClick={() => onCancel(agent.id)}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'hsl(0, 70%, 50%)';
            e.currentTarget.style.color = 'hsl(0, 70%, 50%)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--theme-border)';
            e.currentTarget.style.color = 'var(--theme-text-secondary)';
          }}
        >
          <X size={14} />
          Cancel
        </button>
      )}
    </motion.div>
  );
}
