import { ExternalLink } from 'lucide-react';

const roleBadgeColors = {
  coordinator: { bg: 'hsla(260, 60%, 55%, 0.15)', text: 'hsl(260, 60%, 65%)' },
  researcher: { bg: 'hsla(210, 70%, 50%, 0.15)', text: 'hsl(210, 70%, 60%)' },
  executor: { bg: 'hsla(30, 80%, 50%, 0.15)', text: 'hsl(30, 80%, 60%)' },
  validator: { bg: 'hsla(150, 60%, 45%, 0.15)', text: 'hsl(150, 60%, 55%)' },
  synthesizer: { bg: 'hsla(340, 65%, 50%, 0.15)', text: 'hsl(340, 65%, 60%)' },
};

function getDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

export default function SourceList({ sourceMap }) {
  const entries = Object.values(sourceMap);

  if (entries.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--theme-text-muted)', fontSize: '13px' }}>
        No sources detected yet. Sources are extracted from agent outputs as URLs.
      </div>
    );
  }

  // Sort by most cited first
  const sorted = [...entries].sort((a, b) => b.citedBy.length - a.citedBy.length);

  return (
    <div>
      <div style={{ fontSize: '11px', color: 'var(--theme-text-muted)', marginBottom: '12px' }}>
        {entries.length} unique source{entries.length !== 1 ? 's' : ''} found across all agent outputs
      </div>
      {sorted.map((source) => {
        const domain = getDomain(source.url);
        const displayUrl = source.url.length > 60 ? source.url.slice(0, 57) + '...' : source.url;

        return (
          <div
            key={source.url}
            style={{
              background: 'var(--theme-bg)',
              borderRadius: '8px',
              padding: '10px 12px',
              marginBottom: '8px',
              border: '1px solid var(--theme-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <ExternalLink size={13} style={{ color: 'var(--theme-accent)', marginTop: '2px', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '12px',
                    color: 'var(--theme-accent)',
                    textDecoration: 'none',
                    wordBreak: 'break-all',
                    display: 'block',
                  }}
                >
                  {displayUrl}
                </a>
                <div style={{ fontSize: '11px', color: 'var(--theme-text-muted)', marginTop: '2px' }}>
                  {domain}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                  {source.citedBy.map((agent, i) => {
                    const badge = roleBadgeColors[agent.role] || { bg: 'hsla(0,0%,50%,0.15)', text: 'hsl(0,0%,60%)' };
                    return (
                      <span
                        key={i}
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          background: badge.bg,
                          color: badge.text,
                          borderRadius: '6px',
                        }}
                      >
                        {agent.agentName}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
