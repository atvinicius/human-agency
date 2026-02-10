import { ZoomIn, ZoomOut, Maximize, Pause, Play, RotateCcw, Filter } from 'lucide-react';
import { mapColors } from '../../utils/colorScheme';

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
    background: mapColors.nodeBackground,
    border: `1px solid ${mapColors.nodeBorder}`,
    borderRadius: '6px',
    padding: '8px',
    cursor: 'pointer',
    color: mapColors.textSecondary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  };

  const handleMouseEnter = (e) => {
    e.currentTarget.style.borderColor = mapColors.textMuted;
    e.currentTarget.style.color = mapColors.textPrimary;
  };

  const handleMouseLeave = (e) => {
    e.currentTarget.style.borderColor = mapColors.nodeBorder;
    e.currentTarget.style.color = mapColors.textSecondary;
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
          background: mapColors.nodeBackground,
          border: `1px solid ${mapColors.nodeBorder}`,
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
          background: mapColors.nodeBackground,
          border: `1px solid ${mapColors.nodeBorder}`,
          borderRadius: '8px',
          padding: '4px',
        }}
      >
        <button
          onClick={onTogglePause}
          style={{
            ...buttonStyle,
            background: isPaused ? 'rgba(201, 168, 124, 0.1)' : buttonStyle.background,
            borderColor: isPaused ? '#c9a87c' : buttonStyle.borderColor,
            color: isPaused ? '#c9a87c' : buttonStyle.color,
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
            background: mapColors.nodeBackground,
            border: `1px solid ${mapColors.nodeBorder}`,
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'hsl(150, 70%, 50%)' }} />
            <span style={{ color: mapColors.textSecondary }}>{stats.working}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'hsl(45, 70%, 50%)' }} />
            <span style={{ color: mapColors.textSecondary }}>{stats.waiting}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'hsl(0, 20%, 35%)' }} />
            <span style={{ color: mapColors.textSecondary }}>{stats.completed}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: mapColors.textMuted }}>Total:</span>
            <span style={{ color: mapColors.textPrimary }}>{stats.total}</span>
          </div>
        </div>
      )}
    </div>
  );
}
