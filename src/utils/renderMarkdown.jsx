// Lightweight markdown renderer — covers headers, bold, italic, lists, inline code, code blocks
// No external dependencies

export function renderMarkdown(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let inCodeBlock = false;
  let codeBlockLines = [];
  let codeBlockLang = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block toggle
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${i}`}
            style={{
              background: 'var(--theme-bg)',
              border: '1px solid var(--theme-border)',
              borderRadius: '6px',
              padding: '12px 16px',
              fontSize: '12px',
              fontFamily: 'monospace',
              overflowX: 'auto',
              margin: '8px 0',
              color: 'var(--theme-text-primary)',
            }}
          >
            <code>{codeBlockLines.join('\n')}</code>
          </pre>
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeBlockLang = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={`br-${i}`} style={{ height: '8px' }} />);
      continue;
    }

    // Headers
    const headerMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const sizes = { 1: '18px', 2: '16px', 3: '14px', 4: '13px' };
      elements.push(
        <div
          key={`h-${i}`}
          style={{
            fontSize: sizes[level],
            fontWeight: 600,
            color: 'var(--theme-text-primary)',
            margin: `${level === 1 ? 16 : 12}px 0 6px 0`,
          }}
        >
          {renderInline(headerMatch[2])}
        </div>
      );
      continue;
    }

    // Unordered list
    if (line.match(/^\s*[-*]\s+/)) {
      const content = line.replace(/^\s*[-*]\s+/, '');
      const indent = line.match(/^(\s*)/)[1].length;
      elements.push(
        <div
          key={`li-${i}`}
          style={{
            display: 'flex',
            gap: '8px',
            paddingLeft: `${indent * 4 + 4}px`,
            margin: '3px 0',
            fontSize: '13px',
            color: 'var(--theme-text-secondary)',
            lineHeight: 1.6,
          }}
        >
          <span style={{ color: 'var(--theme-text-muted)', flexShrink: 0 }}>&#x2022;</span>
          <span>{renderInline(content)}</span>
        </div>
      );
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^\s*(\d+)\.\s+(.+)/);
    if (olMatch) {
      elements.push(
        <div
          key={`ol-${i}`}
          style={{
            display: 'flex',
            gap: '8px',
            paddingLeft: '4px',
            margin: '3px 0',
            fontSize: '13px',
            color: 'var(--theme-text-secondary)',
            lineHeight: 1.6,
          }}
        >
          <span style={{ color: 'var(--theme-text-muted)', flexShrink: 0, minWidth: '16px' }}>
            {olMatch[1]}.
          </span>
          <span>{renderInline(olMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p
        key={`p-${i}`}
        style={{
          fontSize: '13px',
          color: 'var(--theme-text-secondary)',
          lineHeight: 1.6,
          margin: '4px 0',
        }}
      >
        {renderInline(line)}
      </p>
    );
  }

  return elements;
}

function renderInline(text) {
  if (!text) return text;

  // Split on inline patterns and render
  const parts = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Italic: *text*
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
    // Inline code: `text`
    const codeMatch = remaining.match(/`([^`]+)`/);

    // Find earliest match
    const matches = [
      boldMatch && { type: 'bold', match: boldMatch },
      italicMatch && { type: 'italic', match: italicMatch },
      codeMatch && { type: 'code', match: codeMatch },
    ].filter(Boolean);

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    const earliest = matches.reduce((a, b) =>
      a.match.index < b.match.index ? a : b
    );

    // Text before match
    if (earliest.match.index > 0) {
      parts.push(remaining.slice(0, earliest.match.index));
    }

    // Matched content
    if (earliest.type === 'bold') {
      parts.push(
        <strong key={`b-${key++}`} style={{ fontWeight: 600, color: 'var(--theme-text-primary)' }}>
          {earliest.match[1]}
        </strong>
      );
    } else if (earliest.type === 'italic') {
      parts.push(
        <em key={`i-${key++}`} style={{ fontStyle: 'italic' }}>
          {earliest.match[1]}
        </em>
      );
    } else if (earliest.type === 'code') {
      parts.push(
        <code
          key={`c-${key++}`}
          style={{
            background: 'var(--theme-bg)',
            padding: '1px 5px',
            borderRadius: '3px',
            fontSize: '12px',
            fontFamily: 'monospace',
            color: 'var(--theme-accent)',
          }}
        >
          {earliest.match[1]}
        </code>
      );
    }

    remaining = remaining.slice(earliest.match.index + earliest.match[0].length);
  }

  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts;
}
