import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Clock, Users, Sparkles, ChevronRight, X, ArrowLeft, Edit3 } from 'lucide-react';
import { getPresets } from '../services/presetService';
import { flattenTree, countAgents, roleColors } from '../utils/missionUtils';
import CustomMissionInput from './CustomMissionInput';

const categoryColors = {
  research: 'hsl(210, 70%, 50%)',
  analysis: 'hsl(280, 70%, 50%)',
  content: 'hsl(30, 70%, 50%)',
  strategy: 'hsl(150, 70%, 50%)',
  custom: 'hsl(45, 70%, 50%)',
};

export default function PresetSelector({ onSelect, onClose }) {
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [hoveredPreset, setHoveredPreset] = useState(null);

  // Mission Briefing state
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [editedObjective, setEditedObjective] = useState('');

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

  const handlePresetClick = (preset) => {
    setSelectedPreset(preset);
    setEditedObjective(preset.initial_objective);
  };

  const handleBackToBrowser = () => {
    setSelectedPreset(null);
    setEditedObjective('');
  };

  const handleLaunch = () => {
    if (!selectedPreset) return;

    const modified = {
      ...selectedPreset,
      initial_objective: editedObjective.trim() || selectedPreset.initial_objective,
    };
    onSelect(modified);
  };

  // Mission Briefing view
  if (selectedPreset) {
    const agents = flattenTree(selectedPreset.agent_config?.root);
    const agentCount = countAgents(selectedPreset.agent_config?.root);
    const catColor = categoryColors[selectedPreset.category] || 'var(--theme-accent)';

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
            maxWidth: '700px',
            maxHeight: '85vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Briefing header */}
          <div
            style={{
              padding: '24px 32px',
              borderBottom: '1px solid var(--theme-border)',
              background: `linear-gradient(135deg, ${catColor}08, transparent)`,
            }}
          >
            <button
              onClick={handleBackToBrowser}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
                border: 'none',
                color: 'var(--theme-text-muted)',
                fontSize: '13px',
                cursor: 'pointer',
                padding: 0,
                marginBottom: '16px',
              }}
            >
              <ArrowLeft size={14} />
              Back to templates
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '36px' }}>{selectedPreset.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <h2
                    className="font-serif"
                    style={{ fontSize: '22px', color: 'var(--theme-text-primary)', margin: 0 }}
                  >
                    {selectedPreset.name}
                  </h2>
                  <span
                    style={{
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: catColor,
                      padding: '3px 8px',
                      background: `${catColor}15`,
                      borderRadius: '4px',
                    }}
                  >
                    {selectedPreset.category}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--theme-text-secondary)', margin: 0 }}>
                  {selectedPreset.description}
                </p>
              </div>
            </div>
          </div>

          {/* Briefing content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
            {/* Editable objective */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Edit3 size={14} style={{ color: 'var(--theme-accent)' }} />
                <label style={{ fontSize: '12px', color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Mission Objective
                </label>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--theme-text-secondary)', marginBottom: '8px', lineHeight: 1.5 }}>
                Fine-tune the objective below to match your specific needs, or launch with the default.
              </p>
              <textarea
                value={editedObjective}
                onChange={(e) => setEditedObjective(e.target.value)}
                style={{
                  width: '100%',
                  height: '80px',
                  padding: '12px 14px',
                  background: 'var(--theme-bg)',
                  border: '1px solid var(--theme-border)',
                  borderRadius: '8px',
                  color: 'var(--theme-text-primary)',
                  fontSize: '14px',
                  lineHeight: 1.5,
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'var(--font-family-sans)',
                }}
              />
            </div>

            {/* Agent team preview */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Agent Team
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Users size={12} style={{ color: 'var(--theme-text-muted)' }} />
                    <span style={{ fontSize: '12px', color: 'var(--theme-text-secondary)' }}>
                      {agentCount} agents
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} style={{ color: 'var(--theme-text-muted)' }} />
                    <span style={{ fontSize: '12px', color: 'var(--theme-text-secondary)' }}>
                      {selectedPreset.estimated_duration}
                    </span>
                  </div>
                </div>
              </div>
              <div
                style={{
                  background: 'var(--theme-bg)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  maxHeight: '220px',
                  overflowY: 'auto',
                }}
              >
                {agents.map((agent, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '5px 0',
                      paddingLeft: `${agent.depth * 20}px`,
                    }}
                  >
                    <div
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: roleColors[agent.role] || 'var(--theme-text-muted)',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{
                      fontSize: '11px',
                      color: roleColors[agent.role],
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      letterSpacing: '0.03em',
                      width: '85px',
                      flexShrink: 0,
                    }}>
                      {agent.role}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--theme-text-primary)', fontWeight: 500 }}>
                      {agent.name}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--theme-text-muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}>
                      — {agent.objective}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Briefing footer */}
          <div
            style={{
              padding: '16px 32px',
              borderTop: '1px solid var(--theme-border)',
              display: 'flex',
              gap: '12px',
            }}
          >
            <button
              onClick={handleBackToBrowser}
              style={{
                padding: '12px 20px',
                background: 'transparent',
                border: '1px solid var(--theme-border)',
                borderRadius: '8px',
                color: 'var(--theme-text-secondary)',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <button
              onClick={handleLaunch}
              style={{
                flex: 1,
                padding: '12px 20px',
                background: catColor,
                border: 'none',
                borderRadius: '8px',
                color: 'var(--theme-text-inverted)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Play size={16} />
              Launch Mission
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Preset browser view (grid)
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
              Select a template and customize the objective, or define your own mission
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
                background: selectedCategory === cat ? `${categoryColors[cat] || 'var(--theme-accent)'}20` : 'transparent',
                color: selectedCategory === cat ? (categoryColors[cat] || 'var(--theme-accent)') : 'var(--theme-text-secondary)',
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
              Loading templates...
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px',
              }}
            >
              {/* Custom mission input — always shown at top */}
              {!selectedCategory && (
                <CustomMissionInput onSelect={onSelect} />
              )}

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
                    onClick={() => handlePresetClick(preset)}
                    style={{
                      background: hoveredPreset === preset.id
                        ? 'var(--theme-surface-elevated)'
                        : 'var(--theme-surface)',
                      border: `1px solid ${
                        hoveredPreset === preset.id
                          ? (categoryColors[preset.category] || 'var(--theme-border)')
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
                          color: categoryColors[preset.category] || 'var(--theme-text-muted)',
                          padding: '4px 8px',
                          background: `${categoryColors[preset.category] || 'var(--theme-text-muted)'}15`,
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

                    {/* Customize button (shows on hover) */}
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
                        background: categoryColors[preset.category] || 'var(--theme-accent)',
                        borderRadius: '6px',
                        color: 'var(--theme-text-inverted)',
                        fontSize: '13px',
                        fontWeight: 500,
                      }}
                    >
                      <Edit3 size={14} />
                      Customize & Launch
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
            Every template is a starting point — customize the objective to match your specific needs
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
