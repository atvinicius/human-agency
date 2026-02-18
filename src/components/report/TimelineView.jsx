import { Search, FileText, CheckCircle, AlertCircle, Layers } from 'lucide-react';

const typeConfig = {
  search: { icon: Search, color: 'hsl(210, 70%, 60%)', label: 'Search' },
  output: { icon: FileText, color: 'hsl(30, 70%, 55%)', label: 'Finding' },
  artifact: { icon: Layers, color: 'hsl(260, 60%, 60%)', label: 'Artifact' },
  validation: { icon: CheckCircle, color: 'hsl(150, 60%, 50%)', label: 'Validation' },
};

const roleBadgeColors = {
  coordinator: { bg: 'hsla(260, 60%, 55%, 0.15)', text: 'hsl(260, 60%, 65%)' },
  researcher: { bg: 'hsla(210, 70%, 50%, 0.15)', text: 'hsl(210, 70%, 60%)' },
  executor: { bg: 'hsla(30, 80%, 50%, 0.15)', text: 'hsl(30, 80%, 60%)' },
  validator: { bg: 'hsla(150, 60%, 45%, 0.15)', text: 'hsl(150, 60%, 55%)' },
  synthesizer: { bg: 'hsla(340, 65%, 50%, 0.15)', text: 'hsl(340, 65%, 60%)' },
};

export default function TimelineView({ sections, searchRecords }) {
  // Merge searches and sections into a single chronological list
  const events = [];

  for (const search of searchRecords) {
    events.push({
      type: 'search',
      timestamp: search.timestamp,
      agentName: search.agentName,
      agentId: search.agentId,
      content: `"${search.query}" (${search.resultCount} results)`,
    });
  }

  for (const section of sections) {
    const eventType = section.tags?.includes('validation') ? 'validation' : section.type;
    events.push({
      type: eventType,
      timestamp: section.timestamp,
      agentName: section.agentName,
      agentId: section.agentId,
      role: section.role,
      content: section.content.length > 150 ? section.content.slice(0, 150) + '...' : section.content,
      title: section.title,
    });
  }

  // Sort chronologically
  events.sort((a, b) => a.timestamp - b.timestamp);

  if (events.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--theme-text-muted)', fontSize: '13px' }}>
        Timeline events will appear as agents work.
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Vertical line */}
      <div
        style={{
          position: 'absolute',
          left: '15px',
          top: '8px',
          bottom: '8px',
          width: '1px',
          background: 'var(--theme-border)',
        }}
      />

      {events.map((event, i) => {
        const config = typeConfig[event.type] || typeConfig.output;
        const Icon = config.icon;
        const badge = roleBadgeColors[event.role] || null;

        return (
          <div
            key={`${event.type}-${event.timestamp}-${i}`}
            style={{
              display: 'flex',
              gap: '12px',
              padding: '8px 0',
              position: 'relative',
            }}
          >
            {/* Dot */}
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: `${config.color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                zIndex: 1,
              }}
            >
              <Icon size={13} style={{ color: config.color }} />
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--theme-text-primary)' }}>
                  {event.agentName}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '1px 6px',
                    background: `${config.color}15`,
                    color: config.color,
                    borderRadius: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                  }}
                >
                  {config.label}
                </span>
                {badge && event.role && (
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '1px 6px',
                      background: badge.bg,
                      color: badge.text,
                      borderRadius: '6px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {event.role}
                  </span>
                )}
                <span style={{ fontSize: '10px', color: 'var(--theme-text-muted)', marginLeft: 'auto' }}>
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--theme-text-secondary)',
                  lineHeight: 1.5,
                }}
              >
                {event.title && event.title !== event.agentName && (
                  <span style={{ fontWeight: 500, marginRight: '4px' }}>{event.title}:</span>
                )}
                {event.content}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
