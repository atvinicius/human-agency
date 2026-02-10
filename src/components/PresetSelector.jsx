import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Clock, Users, Sparkles, ChevronRight, X } from 'lucide-react';
import { getPresets } from '../services/presetService';

const categoryColors = {
  development: 'hsl(150, 70%, 50%)',
  research: 'hsl(210, 70%, 50%)',
  content: 'hsl(30, 70%, 50%)',
  business: 'hsl(280, 70%, 50%)',
};

export default function PresetSelector({ onSelect, onClose }) {
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [hoveredPreset, setHoveredPreset] = useState(null);

  useEffect(() => {
    async function loadPresets() {
      const data = await getPresets();
      setPresets(data);
      setLoading(false);
    }
    loadPresets();
  }, []);

  const categories = [...new Set(presets.map((p) => p.category))];
  const filteredPresets = selectedCategory
    ? presets.filter((p) => p.category === selectedCategory)
    : presets;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'var(--theme-overlay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 400,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--theme-surface)',
          border: '1px solid var(--theme-border)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '900px',
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 32px',
            borderBottom: '1px solid var(--theme-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2
              className="font-serif"
              style={{
                fontSize: '24px',
                color: 'var(--theme-text-primary)',
                marginBottom: '8px',
              }}
            >
              Choose Your Mission
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--theme-text-secondary)' }}>
              Select a scenario to see the orchestration layer in action
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              color: 'var(--theme-text-muted)',
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Category filter */}
        <div
          style={{
            padding: '16px 32px',
            borderBottom: '1px solid var(--theme-border)',
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={() => setSelectedCategory(null)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              background: !selectedCategory ? 'var(--theme-accent-muted)' : 'transparent',
              color: !selectedCategory ? 'var(--theme-accent)' : 'var(--theme-text-secondary)',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                background: selectedCategory === cat ? `${categoryColors[cat]}20` : 'transparent',
                color: selectedCategory === cat ? categoryColors[cat] : 'var(--theme-text-secondary)',
                fontSize: '13px',
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.2s',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Preset grid */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 32px',
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--theme-text-muted)' }}>
              Loading presets...
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px',
              }}
            >
              <AnimatePresence mode="popLayout">
                {filteredPresets.map((preset) => (
                  <motion.div
                    key={preset.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onMouseEnter={() => setHoveredPreset(preset.id)}
                    onMouseLeave={() => setHoveredPreset(null)}
                    onClick={() => onSelect(preset)}
                    style={{
                      background: hoveredPreset === preset.id
                        ? 'var(--theme-surface-elevated)'
                        : 'var(--theme-surface)',
                      border: `1px solid ${
                        hoveredPreset === preset.id
                          ? categoryColors[preset.category]
                          : 'var(--theme-border)'
                      }`,
                      borderRadius: '12px',
                      padding: '20px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {/* Icon and category */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '12px',
                      }}
                    >
                      <span style={{ fontSize: '32px' }}>{preset.icon}</span>
                      <span
                        style={{
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: categoryColors[preset.category],
                          padding: '4px 8px',
                          background: `${categoryColors[preset.category]}15`,
                          borderRadius: '4px',
                        }}
                      >
                        {preset.category}
                      </span>
                    </div>

                    {/* Name */}
                    <h3
                      style={{
                        fontSize: '16px',
                        fontWeight: 500,
                        color: 'var(--theme-text-primary)',
                        marginBottom: '8px',
                      }}
                    >
                      {preset.name}
                    </h3>

                    {/* Description */}
                    <p
                      style={{
                        fontSize: '13px',
                        color: 'var(--theme-text-secondary)',
                        lineHeight: 1.5,
                        marginBottom: '16px',
                      }}
                    >
                      {preset.description}
                    </p>

                    {/* Stats */}
                    <div
                      style={{
                        display: 'flex',
                        gap: '16px',
                        marginBottom: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={14} style={{ color: 'var(--theme-text-muted)' }} />
                        <span style={{ fontSize: '12px', color: 'var(--theme-text-secondary)' }}>
                          ~{preset.estimated_agents} agents
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} style={{ color: 'var(--theme-text-muted)' }} />
                        <span style={{ fontSize: '12px', color: 'var(--theme-text-secondary)' }}>
                          {preset.estimated_duration}
                        </span>
                      </div>
                    </div>

                    {/* Showcase points */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {preset.showcase_points?.slice(0, 2).map((point, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: '11px',
                            color: 'var(--theme-text-muted)',
                            padding: '4px 8px',
                            background: 'var(--theme-surface-elevated)',
                            borderRadius: '4px',
                          }}
                        >
                          {point}
                        </span>
                      ))}
                    </div>

                    {/* Launch button (shows on hover) */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{
                        opacity: hoveredPreset === preset.id ? 1 : 0,
                        y: hoveredPreset === preset.id ? 0 : 10,
                      }}
                      style={{
                        marginTop: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '10px',
                        background: categoryColors[preset.category],
                        borderRadius: '6px',
                        color: 'var(--theme-text-inverted)',
                        fontSize: '13px',
                        fontWeight: 500,
                      }}
                    >
                      <Play size={14} />
                      Launch Mission
                      <ChevronRight size={14} />
                    </motion.div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 32px',
            borderTop: '1px solid var(--theme-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Sparkles size={14} style={{ color: 'var(--theme-accent)' }} />
          <span style={{ fontSize: '12px', color: 'var(--theme-text-muted)' }}>
            Each scenario demonstrates real AI agents working in parallel
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
