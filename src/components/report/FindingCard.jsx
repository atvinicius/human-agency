import { useState } from 'react';
import { ChevronDown, ChevronRight, Brain, Search, ExternalLink } from 'lucide-react';
import { renderMarkdown } from '../../utils/renderMarkdown';

const roleBadgeColors = {
  coordinator: { bg: 'hsla(260, 60%, 55%, 0.15)', text: 'hsl(260, 60%, 65%)' },
  researcher: { bg: 'hsla(210, 70%, 50%, 0.15)', text: 'hsl(210, 70%, 60%)' },
  executor: { bg: 'hsla(30, 80%, 50%, 0.15)', text: 'hsl(30, 80%, 60%)' },
  validator: { bg: 'hsla(150, 60%, 45%, 0.15)', text: 'hsl(150, 60%, 55%)' },
  synthesizer: { bg: 'hsla(340, 65%, 50%, 0.15)', text: 'hsl(340, 65%, 60%)' },
};

export default function FindingCard({ section, parentName }) {
  const [expanded, setExpanded] = useState(false);
  const [showThinking, setShowThinking] = useState(false);

  const badge = roleBadgeColors[section.role] || { bg: 'hsla(0, 0%, 50%, 0.15)', text: 'hsl(0, 0%, 60%)' };
  const hasThinking = section.thinking && section.thinking !== 'Processing...';
  const hasSearches = section.searchQueries && section.searchQueries.length > 0;
  const hasSources = section.sources && section.sources.length > 0;

  // Preview: first 300 chars when collapsed
  const preview = section.content.length > 300 ? section.content.slice(0, 300) + '...' : section.content;

  return (
    <div
      style={{
        background: 'var(--theme-bg)',
        borderRadius: '8px',
        border: '1px solid var(--theme-border)',
        marginBottom: '10px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          padding: '12px 14px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          textAlign: 'left',
        }}
      >
        {expanded ? (
          <ChevronDown size={14} style={{ color: 'var(--theme-text-muted)', flexShrink: 0 }} />
        ) : (
          <ChevronRight size={14} style={{ color: 'var(--theme-text-muted)', flexShrink: 0 }} />
        )}
        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--theme-text-primary)' }}>
          {section.agentName}
        </span>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 600,
            padding: '2px 7px',
            background: badge.bg,
            color: badge.text,
            borderRadius: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
          }}
        >
          {section.role}
        </span>
        {hasThinking && <Brain size={12} style={{ color: 'var(--theme-text-muted)' }} />}
        {hasSearches && <Search size={12} style={{ color: 'var(--theme-text-muted)' }} />}
        {hasSources && (
          <span style={{ fontSize: '10px', color: 'var(--theme-text-muted)', marginLeft: 'auto' }}>
            {section.sources.length} source{section.sources.length !== 1 ? 's' : ''}
          </span>
        )}
      </button>

      {/* Content */}
      <div style={{ padding: '0 14px 12px 14px' }}>
        {/* Parent attribution */}
        {parentName && (
          <div style={{ fontSize: '11px', color: 'var(--theme-text-muted)', marginBottom: '6px' }}>
            Based on: <span style={{ color: 'var(--theme-text-secondary)' }}>{parentName}</span>
          </div>
        )}

        {/* Output content */}
        <div style={{ fontSize: '12px', color: 'var(--theme-text-secondary)', lineHeight: 1.6 }}>
          {expanded ? renderMarkdown(section.content) : renderMarkdown(preview)}
        </div>

        {/* Expanded details */}
        {expanded && (
          <>
            {/* Thinking section */}
            {hasThinking && (
              <div style={{ marginTop: '10px' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowThinking(!showThinking);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 0',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--theme-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <Brain size={12} />
                  Agent Reasoning
                  {showThinking ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                </button>
                {showThinking && (
                  <div
                    style={{
                      background: 'var(--theme-surface)',
                      borderRadius: '6px',
                      padding: '10px 12px',
                      fontSize: '12px',
                      color: 'var(--theme-text-muted)',
                      lineHeight: 1.5,
                      borderLeft: '2px solid var(--theme-border)',
                      marginTop: '4px',
                    }}
                  >
                    {section.thinking}
                  </div>
                )}
              </div>
            )}

            {/* Search queries */}
            {hasSearches && (
              <div style={{ marginTop: '10px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--theme-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Search size={12} />
                  Searches
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {section.searchQueries.map((sq, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        background: 'hsla(210, 70%, 50%, 0.1)',
                        color: 'hsl(210, 70%, 60%)',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      "{sq.query}"
                      {sq.resultCount > 0 && (
                        <span style={{ opacity: 0.7 }}>({sq.resultCount})</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Source URLs */}
            {hasSources && (
              <div style={{ marginTop: '10px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--theme-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <ExternalLink size={12} />
                  Sources
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {section.sources.slice(0, 8).map((url, i) => {
                    const display = url.length > 55 ? url.slice(0, 52) + '...' : url;
                    return (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '11px',
                          color: 'var(--theme-accent)',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          wordBreak: 'break-all',
                        }}
                      >
                        <ExternalLink size={10} style={{ flexShrink: 0 }} />
                        {display}
                      </a>
                    );
                  })}
                  {section.sources.length > 8 && (
                    <span style={{ fontSize: '11px', color: 'var(--theme-text-muted)' }}>
                      +{section.sources.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
