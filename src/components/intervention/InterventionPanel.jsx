import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, MessageSquare, AlertCircle } from 'lucide-react';
import { getAgentColor } from '../../utils/colorScheme';

export default function InterventionPanel({
  agent,
  onRespond,
  onClose,
}) {
  const [textInput, setTextInput] = useState('');

  if (!agent || !agent.pendingInput) return null;

  const { pendingInput } = agent;
  const color = getAgentColor(agent.role, 'waiting');

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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '400px',
          maxWidth: '100vw',
          background: 'var(--theme-surface)',
          borderLeft: '1px solid var(--theme-border)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 200,
          boxShadow: 'var(--theme-shadow)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid var(--theme-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: `${color}20`,
                border: `1px solid ${color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertCircle size={20} style={{ color }} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--theme-text-primary)' }}>
                Human Input Required
              </div>
              <div style={{ fontSize: '12px', color: 'var(--theme-text-muted)' }}>
                {agent.name}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              color: 'var(--theme-text-muted)',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {/* Title */}
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 500,
              color: 'var(--theme-text-primary)',
              marginBottom: '12px',
            }}
          >
            {pendingInput.title}
          </h3>

          {/* Message */}
          <p
            style={{
              fontSize: '14px',
              color: 'var(--theme-text-secondary)',
              lineHeight: 1.6,
              marginBottom: '24px',
            }}
          >
            {pendingInput.message}
          </p>

          {/* Options */}
          {pendingInput.options && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingInput.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleOptionClick(option)}
                  style={{
                    padding: '14px 20px',
                    background: 'transparent',
                    border: '1px solid var(--theme-border)',
                    borderRadius: '8px',
                    color: 'var(--theme-text-primary)',
                    fontSize: '14px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = color;
                    e.currentTarget.style.background = `${color}10`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--theme-border)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span>{option}</span>
                  <Check size={16} style={{ color: 'var(--theme-text-muted)' }} />
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
                  height: '120px',
                  padding: '14px',
                  background: 'transparent',
                  border: '1px solid var(--theme-border)',
                  borderRadius: '8px',
                  color: 'var(--theme-text-primary)',
                  fontSize: '14px',
                  resize: 'none',
                  marginBottom: '16px',
                }}
              />
              <button
                type="submit"
                disabled={!textInput.trim()}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: textInput.trim() ? color : 'var(--theme-border)',
                  border: 'none',
                  borderRadius: '8px',
                  color: textInput.trim() ? 'var(--theme-text-inverted)' : 'var(--theme-text-muted)',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: textInput.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                }}
              >
                <MessageSquare size={16} />
                Submit Response
              </button>
            </form>
          )}
        </div>

        {/* Agent context */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--theme-border)',
            background: 'var(--theme-surface-elevated)',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--theme-text-muted)', marginBottom: '8px' }}>
            Agent Context
          </div>
          <div style={{ fontSize: '13px', color: 'var(--theme-text-secondary)' }}>
            <strong style={{ color: 'var(--theme-text-primary)' }}>{agent.name}</strong>
            {' — '}
            {agent.objective}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--theme-text-muted)',
              marginTop: '8px',
            }}
          >
            Progress: {Math.round(agent.progress)}% • Role: {agent.role}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
