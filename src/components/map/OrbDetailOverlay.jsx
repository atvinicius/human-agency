// Close-zoom detail card — unfolds near the selected orb when zoomed in (k > 1.0)
// Shows name, role, objective, progress, streaming text, action buttons

import { getAgentColor } from '../../utils/colorScheme';

export default function OrbDetailOverlay({ agent, onPause, onResume, onDive, onClose }) {
  if (!agent) return null;

  const { x, y, _radius: radius = 30 } = agent;
  const color = getAgentColor(agent.role, agent.status);

  const panelX = x + radius + 16;
  const panelY = y - 80;

  const isPausable = !['completed', 'failed', 'paused'].includes(agent.status);
  const isResumable = agent.status === 'paused';

  return (
    <foreignObject
      x={panelX}
      y={panelY}
      width={260}
      height={300}
      style={{ overflow: 'visible' }}
    >
      <div
        style={{
          background: 'var(--theme-surface)',
          border: '1px solid var(--theme-border)',
          borderRadius: '10px',
          padding: '14px',
          boxShadow: 'var(--theme-shadow)',
          width: '260px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: color,
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--theme-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {agent.name}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--theme-text-muted)', textTransform: 'capitalize' }}>
              {agent.role} · {agent.status}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--theme-text-muted)',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '2px 6px',
            }}
          >
            ×
          </button>
        </div>

        {/* Objective */}
        {agent.objective && (
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '9px', color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>
              Objective
            </div>
            <div style={{ fontSize: '12px', color: 'var(--theme-text-secondary)', lineHeight: 1.4 }}>
              {agent.objective}
            </div>
          </div>
        )}

        {/* Progress */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '9px', color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Progress
            </span>
            <span style={{ fontSize: '11px', color: 'var(--theme-text-primary)' }}>
              {Math.round(agent.progress)}%
            </span>
          </div>
          <div style={{ height: '4px', background: 'var(--theme-border)', borderRadius: '2px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${agent.progress}%`,
                height: '100%',
                background: color,
                borderRadius: '2px',
                transition: 'width 0.3s',
              }}
            />
          </div>
        </div>

        {/* Current activity */}
        {(agent.currentActivity || agent.current_activity) && (
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '9px', color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>
              Activity
            </div>
            <div style={{ fontSize: '12px', color: 'var(--theme-text-primary)' }}>
              {agent.currentActivity || agent.current_activity}
            </div>
          </div>
        )}

        {/* Streaming text */}
        {agent.context?.streamingText && (
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '9px', color: 'var(--theme-accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>
              Thinking...
            </div>
            <div style={{
              fontSize: '11px',
              color: 'var(--theme-text-secondary)',
              fontStyle: 'italic',
              lineHeight: 1.4,
              maxHeight: '50px',
              overflow: 'hidden',
              background: 'var(--theme-surface-elevated)',
              padding: '6px 8px',
              borderRadius: '4px',
              borderLeft: '2px solid var(--theme-accent)',
            }}>
              {agent.context.streamingText}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {isPausable && (
            <button
              onClick={(e) => { e.stopPropagation(); onPause(agent.id); }}
              style={{
                flex: 1,
                padding: '6px',
                background: 'transparent',
                border: '1px solid var(--theme-border)',
                borderRadius: '4px',
                color: 'var(--theme-text-secondary)',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Pause
            </button>
          )}
          {isResumable && (
            <button
              onClick={(e) => { e.stopPropagation(); onResume(agent.id); }}
              style={{
                flex: 1,
                padding: '6px',
                background: 'var(--theme-accent-muted)',
                border: '1px solid var(--theme-accent-border)',
                borderRadius: '4px',
                color: 'var(--theme-accent)',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Resume
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDive(agent.id); }}
            style={{
              flex: 1,
              padding: '6px',
              background: 'transparent',
              border: '1px solid var(--theme-border)',
              borderRadius: '4px',
              color: 'var(--theme-text-secondary)',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Focus
          </button>
        </div>
      </div>
    </foreignObject>
  );
}
