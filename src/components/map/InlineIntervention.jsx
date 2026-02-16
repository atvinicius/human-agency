// Inline intervention — renders input controls adjacent to agent orb via SVG foreignObject
// Replaces the sidebar InterventionPanel with spatial, in-context interaction

import { useState } from 'react';
import { Check, MessageSquare, AlertCircle } from 'lucide-react';
import { getAgentColor } from '../../utils/colorScheme';

export default function InlineIntervention({ agent, onRespond, x, y, radius }) {
  const [textInput, setTextInput] = useState('');

  if (!agent || !agent.pendingInput) return null;

  const { pendingInput } = agent;
  const color = getAgentColor(agent.role, 'waiting');

  // Position the panel to the right of the orb
  const panelX = x + (radius || 30) + 20;
  const panelY = y - 100;
  const panelWidth = 280;
  const panelHeight = pendingInput.options ? 60 + pendingInput.options.length * 44 : 220;

  const handleOptionClick = (option) => {
    onRespond(agent.id, { type: pendingInput.type, value: option });
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (textInput.trim()) {
      onRespond(agent.id, { type: 'text', value: textInput });
      setTextInput('');
    }
  };

  return (
    <foreignObject
      x={panelX}
      y={panelY}
      width={panelWidth}
      height={panelHeight + 40}
      style={{ overflow: 'visible' }}
    >
      <div
        style={{
          background: 'var(--theme-surface)',
          border: '1px solid var(--theme-border)',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: 'var(--theme-shadow)',
          maxWidth: `${panelWidth}px`,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <AlertCircle size={16} style={{ color }} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--theme-text-primary)' }}>
              Input Required
            </div>
            <div style={{ fontSize: '11px', color: 'var(--theme-text-muted)' }}>
              {agent.name}
            </div>
          </div>
        </div>

        {/* Title + Message */}
        {pendingInput.title && (
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--theme-text-primary)', marginBottom: '6px' }}>
            {pendingInput.title}
          </div>
        )}
        {pendingInput.message && (
          <p style={{ fontSize: '12px', color: 'var(--theme-text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
            {pendingInput.message}
          </p>
        )}

        {/* Options */}
        {pendingInput.options && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {pendingInput.options.map((option, i) => (
              <button
                key={i}
                onClick={() => handleOptionClick(option)}
                style={{
                  padding: '8px 12px',
                  background: 'transparent',
                  border: '1px solid var(--theme-border)',
                  borderRadius: '6px',
                  color: 'var(--theme-text-primary)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--theme-border)'; }}
              >
                <span>{option}</span>
                <Check size={12} style={{ color: 'var(--theme-text-muted)' }} />
              </button>
            ))}
          </div>
        )}

        {/* Text input */}
        {pendingInput.type === 'text' && (
          <form onSubmit={handleTextSubmit}>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Enter your response..."
              style={{
                width: '100%',
                height: '70px',
                padding: '8px',
                background: 'transparent',
                border: '1px solid var(--theme-border)',
                borderRadius: '6px',
                color: 'var(--theme-text-primary)',
                fontSize: '12px',
                resize: 'none',
                marginBottom: '8px',
              }}
            />
            <button
              type="submit"
              disabled={!textInput.trim()}
              style={{
                width: '100%',
                padding: '8px',
                background: textInput.trim() ? color : 'var(--theme-border)',
                border: 'none',
                borderRadius: '6px',
                color: textInput.trim() ? 'var(--theme-text-inverted)' : 'var(--theme-text-muted)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: textInput.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <MessageSquare size={12} />
              Submit
            </button>
          </form>
        )}
      </div>
    </foreignObject>
  );
}
