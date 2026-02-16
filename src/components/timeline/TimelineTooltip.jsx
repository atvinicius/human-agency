// Tooltip for PulseBar columns — shows event breakdown on hover

export default function TimelineTooltip({ bucket, x, y }) {
  if (!bucket) return null;

  const nonZeroCounts = Object.entries(bucket.counts)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        bottom: y,
        transform: 'translateX(-50%)',
        background: 'var(--theme-surface)',
        border: '1px solid var(--theme-border)',
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '11px',
        color: 'var(--theme-text-secondary)',
        pointerEvents: 'none',
        zIndex: 200,
        whiteSpace: 'nowrap',
        minWidth: '100px',
      }}
    >
      <div style={{ fontWeight: 500, color: 'var(--theme-text-primary)', marginBottom: '4px' }}>
        {bucket.total} event{bucket.total !== 1 ? 's' : ''}
      </div>
      {nonZeroCounts.map(([type, count]) => (
        <div key={type} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <span style={{ textTransform: 'capitalize' }}>{type}</span>
          <span style={{ color: 'var(--theme-text-muted)' }}>{count}</span>
        </div>
      ))}
    </div>
  );
}
