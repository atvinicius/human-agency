import { ZoomIn, ZoomOut, Maximize, Pause, Play, RotateCcw } from 'lucide-react';

export default function MapControls({
  onZoomIn,
  onZoomOut,
  onFitView,
  onReset,
  isPaused,
  onTogglePause,
  stats,
}) {
  const buttonStyle = {
    background: 'var(--theme-surface)',
    border: '1px solid var(--theme-border)',
    borderRadius: '6px',
    padding: '8px',
    cursor: 'pointer',
    color: 'var(--theme-text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  };

  const handleMouseEnter = (e) => {
    e.currentTarget.style.borderColor = 'var(--theme-text-muted)';
    e.currentTarget.style.color = 'var(--theme-text-primary)';
  };

  const handleMouseLeave = (e) => {
    e.currentTarget.style.borderColor = 'var(--theme-border)';
    e.currentTarget.style.color = 'var(--theme-text-secondary)';
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        display: 'flex',
        gap: '8px',
        zIndex: 100,
      }}
    >
      {/* Zoom controls */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          background: 'var(--theme-surface)',
          border: '1px solid var(--theme-border)',
          borderRadius: '8px',
          padding: '4px',
        }}
      >
        <button
          onClick={onZoomIn}
          style={buttonStyle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={onZoomOut}
          style={buttonStyle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={onFitView}
          style={buttonStyle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          title="Fit View"
        >
          <Maximize size={16} />
        </button>
      </div>

      {/* Playback controls */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          background: 'var(--theme-surface)',
          border: '1px solid var(--theme-border)',
          borderRadius: '8px',
          padding: '4px',
        }}
      >
        <button
          onClick={onTogglePause}
          style={{
            ...buttonStyle,
            background: isPaused ? 'var(--theme-accent-muted)' : buttonStyle.background,
            borderColor: isPaused ? 'var(--theme-accent)' : buttonStyle.borderColor,
            color: isPaused ? 'var(--theme-accent)' : buttonStyle.color,
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          title={isPaused ? 'Resume All' : 'Pause All'}
        >
          {isPaused ? <Play size={16} /> : <Pause size={16} />}
        </button>
        <button
          onClick={onReset}
          style={buttonStyle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          title="Reset Demo"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'var(--theme-surface)',
            border: '1px solid var(--theme-border)',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'hsl(150, 70%, 50%)' }} />
            <span style={{ color: 'var(--theme-text-secondary)' }}>{stats.working}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'hsl(45, 70%, 50%)' }} />
            <span style={{ color: 'var(--theme-text-secondary)' }}>{stats.waiting}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'hsl(0, 20%, 35%)' }} />
            <span style={{ color: 'var(--theme-text-secondary)' }}>{stats.completed}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: 'var(--theme-text-muted)' }}>Total:</span>
            <span style={{ color: 'var(--theme-text-primary)' }}>{stats.total}</span>
          </div>
        </div>
      )}
    </div>
  );
}
