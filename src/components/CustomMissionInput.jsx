import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Loader, Play, ArrowLeft, AlertCircle } from 'lucide-react';
import { parseDataStream, parseAgentResponse } from '../services/streamParser';
import { useAuthStore } from '../stores/authStore';
import { countAgents, flattenTree, roleColors } from '../utils/missionUtils';

export default function CustomMissionInput({ onSelect }) {
  const [objective, setObjective] = useState('');
  const [phase, setPhase] = useState('input'); // input | planning | preview | error
  const [streamText, setStreamText] = useState('');
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);

  const handlePlan = async () => {
    if (!objective.trim()) return;

    setPhase('planning');
    setStreamText('');
    setError(null);

    try {
      const token = useAuthStore.getState().getAccessToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch('/api/plan-mission', {
        method: 'POST',
        headers,
        body: JSON.stringify({ objective: objective.trim() }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to plan mission');
      }

      const fullText = await parseDataStream(response, (delta, accumulated) => {
        setStreamText(accumulated);
      });

      const parsed = parseAgentResponse(fullText);

      // Validate the plan has the required structure
      if (!parsed.agent_config?.root) {
        throw new Error('Invalid plan structure — missing agent_config.root');
      }

      setPlan(parsed);
      setPhase('preview');
    } catch (err) {
      console.error('Mission planning failed:', err);
      setError(err.message);
      setPhase('error');
    }
  };

  const handleLaunch = () => {
    if (!plan) return;

    // Build a synthetic preset from the plan
    const syntheticPreset = {
      id: `custom-${Date.now()}`,
      slug: 'custom-mission',
      name: plan.name || 'Custom Mission',
      description: plan.description || objective,
      icon: '🎯',
      category: 'custom',
      initial_objective: objective,
      estimated_agents: plan.estimated_agents || countAgents(plan.agent_config?.root),
      estimated_duration: 'Varies',
      showcase_points: ['Custom objective', 'AI-planned team'],
      agent_config: plan.agent_config,
    };

    onSelect(syntheticPreset);
  };

  const handleBack = () => {
    setPhase('input');
    setPlan(null);
    setError(null);
    setStreamText('');
  };

  // Input phase — type your objective
  if (phase === 'input') {
    return (
      <div
        style={{
          background: 'var(--theme-surface)',
          border: '2px dashed var(--theme-border)',
          borderRadius: '12px',
          padding: '24px',
          gridColumn: '1 / -1',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Wand2 size={20} style={{ color: 'var(--theme-accent)' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--theme-text-primary)', margin: 0 }}>
            Custom Mission
          </h3>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--theme-text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
          Describe what you want to accomplish. AI will plan the optimal team of agents.
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handlePlan()}
            placeholder="e.g., Analyze the competitive landscape for a new fintech product"
            style={{
              flex: 1,
              padding: '12px 16px',
              background: 'var(--theme-bg)',
              border: '1px solid var(--theme-border)',
              borderRadius: '8px',
              color: 'var(--theme-text-primary)',
              fontSize: '14px',
              outline: 'none',
            }}
          />
          <button
            onClick={handlePlan}
            disabled={!objective.trim()}
            style={{
              padding: '12px 20px',
              background: objective.trim() ? 'var(--theme-accent)' : 'var(--theme-border)',
              border: 'none',
              borderRadius: '8px',
              color: objective.trim() ? 'var(--theme-accent-text)' : 'var(--theme-text-muted)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: objective.trim() ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            <Wand2 size={14} />
            Plan Mission
          </button>
        </div>
      </div>
    );
  }

  // Planning phase — streaming the planner's thinking
  if (phase === 'planning') {
    return (
      <div
        style={{
          background: 'var(--theme-surface)',
          border: '2px solid var(--theme-accent)',
          borderRadius: '12px',
          padding: '24px',
          gridColumn: '1 / -1',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
            <Loader size={20} style={{ color: 'var(--theme-accent)' }} />
          </motion.div>
          <h3 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--theme-text-primary)', margin: 0 }}>
            Planning your mission...
          </h3>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--theme-text-secondary)', marginBottom: '12px' }}>
          {objective}
        </p>
        {streamText && (
          <div
            style={{
              background: 'var(--theme-bg)',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '12px',
              fontFamily: 'monospace',
              color: 'var(--theme-text-muted)',
              maxHeight: '120px',
              overflow: 'hidden',
              lineHeight: 1.5,
              borderLeft: '2px solid var(--theme-accent)',
            }}
          >
            {streamText.slice(-300)}
          </div>
        )}
      </div>
    );
  }

  // Error phase
  if (phase === 'error') {
    return (
      <div
        style={{
          background: 'var(--theme-surface)',
          border: '2px solid hsl(0, 70%, 50%)',
          borderRadius: '12px',
          padding: '24px',
          gridColumn: '1 / -1',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <AlertCircle size={20} style={{ color: 'hsl(0, 70%, 50%)' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--theme-text-primary)', margin: 0 }}>
            Planning failed
          </h3>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--theme-text-secondary)', marginBottom: '16px' }}>
          {error}
        </p>
        <button
          onClick={handleBack}
          style={{
            padding: '8px 16px',
            background: 'transparent',
            border: '1px solid var(--theme-border)',
            borderRadius: '6px',
            color: 'var(--theme-text-secondary)',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <ArrowLeft size={14} />
          Try Again
        </button>
      </div>
    );
  }

  // Preview phase — show the planned agent tree
  if (phase === 'preview' && plan) {
    const agents = flattenTree(plan.agent_config?.root);
    const agentCount = agents.length;

    return (
      <div
        style={{
          background: 'var(--theme-surface)',
          border: '2px solid var(--theme-accent)',
          borderRadius: '12px',
          padding: '24px',
          gridColumn: '1 / -1',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--theme-text-primary)', margin: 0 }}>
              🎯 {plan.name}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--theme-text-secondary)', marginTop: '4px' }}>
              {plan.description} — {agentCount} agents planned
            </p>
          </div>
        </div>

        {/* Agent tree preview */}
        <div
          style={{
            background: 'var(--theme-bg)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
            maxHeight: '240px',
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
                padding: '6px 0',
                paddingLeft: `${agent.depth * 24}px`,
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: roleColors[agent.role] || 'var(--theme-text-muted)',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: '12px', color: roleColors[agent.role], textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em', width: '90px', flexShrink: 0 }}>
                {agent.role}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--theme-text-primary)', fontWeight: 500 }}>
                {agent.name}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--theme-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                — {agent.objective}
              </span>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleBack}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: '1px solid var(--theme-border)',
              borderRadius: '6px',
              color: 'var(--theme-text-secondary)',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ArrowLeft size={14} />
            Revise
          </button>
          <button
            onClick={handleLaunch}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: 'var(--theme-accent)',
              border: 'none',
              borderRadius: '6px',
              color: 'var(--theme-accent-text)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <Play size={14} />
            Launch Mission
          </button>
        </div>
      </div>
    );
  }

  return null;
}
