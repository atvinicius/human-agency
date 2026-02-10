import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Info, X, Rocket, Clock, Users, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgentStore } from '../stores/agentStore';
import { MockAgentSimulator } from '../services/mockAgentService';
import { getOrchestrationService } from '../services/orchestrationService';
import AgentMap from '../components/map/AgentMap';
import ActivityStream from '../components/stream/ActivityStream';
import InterventionPanel from '../components/intervention/InterventionPanel';
import QuickActions from '../components/intervention/QuickActions';
import PresetSelector from '../components/PresetSelector';
import ThemeToggle from '../components/ThemeToggle';
import { mapColors, getAgentColor } from '../utils/colorScheme';

function DetailPanel({ agent, onClose, onPause, onResume, onDive }) {
  if (!agent) return null;

  const color = getAgentColor(agent.role, agent.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      style={{
        position: 'absolute',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--theme-surface)',
        border: '1px solid var(--theme-border)',
        borderRadius: '12px',
        padding: '20px',
        minWidth: '400px',
        maxWidth: '600px',
        zIndex: 150,
        boxShadow: 'var(--theme-shadow)',
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'transparent',
          border: 'none',
          padding: '4px',
          cursor: 'pointer',
          color: 'var(--theme-text-muted)',
        }}
      >
        <X size={16} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: color,
          }}
        />
        <div>
          <div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--theme-text-primary)' }}>
            {agent.name}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--theme-text-muted)', textTransform: 'capitalize' }}>
            {agent.role} • {agent.status} • {agent.priority} priority
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: 'var(--theme-text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Objective
        </div>
        <div style={{ fontSize: '14px', color: 'var(--theme-text-secondary)' }}>
          {agent.objective}
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Progress
          </span>
          <span style={{ fontSize: '12px', color: 'var(--theme-text-primary)' }}>
            {Math.round(agent.progress)}%
          </span>
        </div>
        <div
          style={{
            height: '6px',
            background: 'var(--theme-border)',
            borderRadius: '3px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${agent.progress}%`,
              height: '100%',
              background: color,
              borderRadius: '3px',
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '11px', color: 'var(--theme-text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Current Activity
        </div>
        <div style={{ fontSize: '14px', color: 'var(--theme-text-primary)' }}>
          {agent.currentActivity || agent.current_activity}
        </div>
      </div>

      <QuickActions
        agent={agent}
        onPause={onPause}
        onResume={onResume}
        onDive={onDive}
      />
    </motion.div>
  );
}

function MissionHeader({ preset, stats, elapsedTime }) {
  if (!preset) return null;

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--theme-surface)',
        border: '1px solid var(--theme-border)',
        borderRadius: '12px',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        zIndex: 100,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '24px' }}>{preset.icon}</span>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--theme-text-primary)' }}>
            {preset.name}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--theme-text-muted)' }}>
            {preset.initial_objective?.substring(0, 50)}...
          </div>
        </div>
      </div>

      <div style={{ width: '1px', height: '32px', background: 'var(--theme-border)' }} />

      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Users size={12} style={{ color: 'var(--theme-text-muted)' }} />
            <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--theme-text-primary)' }}>
              {stats.total}
            </span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--theme-text-muted)' }}>Agents</div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Zap size={12} style={{ color: 'hsl(150, 70%, 50%)' }} />
            <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--theme-text-primary)' }}>
              {stats.working}
            </span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--theme-text-muted)' }}>Active</div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} style={{ color: 'var(--theme-text-muted)' }} />
            <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--theme-text-primary)' }}>
              {formatTime(elapsedTime)}
            </span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--theme-text-muted)' }}>Elapsed</div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Demo() {
  const simulatorRef = useRef(null);
  const orchestratorRef = useRef(null);
  const [showPresetSelector, setShowPresetSelector] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [currentPreset, setCurrentPreset] = useState(null);
  const [useRealAI, setUseRealAI] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTimeRef = useRef(null);

  const {
    agents,
    selectedAgentId,
    events,
    isPaused,
    selectAgent,
    clearSelection,
    pauseAgent,
    resumeAgent,
    pauseAll,
    resumeAll,
    respondToInput,
    reset,
    getAgentById,
    getStats,
  } = useAgentStore();

  const selectedAgent = selectedAgentId ? getAgentById(selectedAgentId) : null;
  const waitingAgent = agents.find((a) => a.pendingInput || a.pending_input);
  const stats = getStats();

  // Elapsed time timer
  useEffect(() => {
    if (!currentPreset || isPaused) return;

    const interval = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedTime(Date.now() - startTimeRef.current);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentPreset, isPaused]);

  const handleSelectPreset = async (preset) => {
    setShowPresetSelector(false);
    setCurrentPreset(preset);
    reset();
    startTimeRef.current = Date.now();
    setElapsedTime(0);

    // For now, use mock simulation (real AI requires deployed API route)
    // In production, this would use the orchestration service
    if (useRealAI) {
      orchestratorRef.current = getOrchestrationService();
      await orchestratorRef.current.startSession(preset);
    } else {
      // Use mock simulation with preset's agent config
      simulatorRef.current = new MockAgentSimulator(useAgentStore.getState());
      simulatorRef.current.store = useAgentStore.getState();

      const unsubscribe = useAgentStore.subscribe((state) => {
        if (simulatorRef.current) {
          simulatorRef.current.store = state;
        }
      });

      // Custom initialization from preset
      simulatorRef.current.startWithPreset(preset);
    }
  };

  const handleReset = () => {
    simulatorRef.current?.stop();
    orchestratorRef.current?.stop();
    reset();
    setCurrentPreset(null);
    setElapsedTime(0);
    setShowPresetSelector(true);
  };

  const handleTogglePause = () => {
    if (isPaused) {
      resumeAll();
    } else {
      pauseAll();
    }
  };

  const handleDive = (agentId) => {
    selectAgent(agentId);
  };

  const handleEventClick = (agentId) => {
    if (agentId) {
      selectAgent(agentId);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      simulatorRef.current?.stop();
      orchestratorRef.current?.stop();
      reset();
    };
  }, []);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--theme-bg)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <header
        style={{
          height: '56px',
          borderBottom: '1px solid var(--theme-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          flexShrink: 0,
          background: 'var(--theme-bg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--theme-text-muted)',
              textDecoration: 'none',
              fontSize: '14px',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--theme-text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--theme-text-muted)')}
          >
            <ArrowLeft size={16} />
            Back
          </Link>
          <div style={{ width: '1px', height: '24px', background: 'var(--theme-border)' }} />
          <span className="font-serif" style={{ fontSize: '16px', color: 'var(--theme-text-primary)' }}>
            Mission Control
          </span>
          <span
            style={{
              fontSize: '11px',
              padding: '4px 8px',
              background: 'var(--theme-accent-muted)',
              borderRadius: '4px',
              color: 'var(--theme-accent)',
            }}
          >
            DEMO
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {currentPreset && (
            <button
              onClick={() => setShowPresetSelector(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                background: 'var(--theme-accent-muted)',
                border: '1px solid var(--theme-accent-border)',
                borderRadius: '6px',
                color: 'var(--theme-accent)',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              <Rocket size={14} />
              New Mission
            </button>
          )}
          <button
            onClick={() => setShowInfo(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              background: 'transparent',
              border: '1px solid var(--theme-border)',
              borderRadius: '6px',
              color: 'var(--theme-text-secondary)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            <Info size={14} />
            Info
          </button>
          <ThemeToggle size="small" />
        </div>
      </header>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Map area */}
        <div style={{ flex: 1, position: 'relative' }}>
          <AgentMap
            agents={agents}
            selectedAgentId={selectedAgentId}
            onSelectAgent={selectAgent}
            onPauseAgent={pauseAgent}
            onResumeAgent={resumeAgent}
            onDiveAgent={handleDive}
            isPaused={isPaused}
            onTogglePause={handleTogglePause}
            onReset={handleReset}
            stats={stats}
          />

          {/* Mission header */}
          {currentPreset && (
            <MissionHeader preset={currentPreset} stats={stats} elapsedTime={elapsedTime} />
          )}

          {/* Selected agent detail panel */}
          <AnimatePresence>
            {selectedAgent && !selectedAgent.pendingInput && !selectedAgent.pending_input && (
              <DetailPanel
                agent={selectedAgent}
                onClose={clearSelection}
                onPause={pauseAgent}
                onResume={resumeAgent}
                onDive={handleDive}
              />
            )}
          </AnimatePresence>

          {/* Empty state - no mission selected */}
          {!currentPreset && agents.length === 0 && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
              }}
            >
              <Rocket size={48} style={{ color: 'var(--theme-text-muted)', marginBottom: '16px' }} />
              <h2
                className="font-serif"
                style={{ fontSize: '24px', color: 'var(--theme-text-primary)', marginBottom: '8px' }}
              >
                No Active Mission
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--theme-text-secondary)', marginBottom: '24px' }}>
                Choose a scenario to see agents in action
              </p>
              <button
                onClick={() => setShowPresetSelector(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  background: 'var(--theme-accent)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'var(--theme-accent-text)',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <Rocket size={16} />
                Launch Mission
              </button>
            </div>
          )}
        </div>

        {/* Activity stream sidebar */}
        <div style={{ width: '320px', flexShrink: 0 }}>
          <ActivityStream events={events} onEventClick={handleEventClick} />
        </div>
      </div>

      {/* Human input panel */}
      {waitingAgent && (
        <InterventionPanel
          agent={waitingAgent}
          onRespond={respondToInput}
          onClose={() => {}}
        />
      )}

      {/* Preset selector */}
      <AnimatePresence>
        {showPresetSelector && (
          <PresetSelector
            onSelect={handleSelectPreset}
            onClose={() => {
              if (currentPreset) setShowPresetSelector(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Info overlay */}
      <AnimatePresence>
        {showInfo && (
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
              zIndex: 300,
            }}
            onClick={() => setShowInfo(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--theme-surface)',
                border: '1px solid var(--theme-border)',
                borderRadius: '12px',
                padding: '32px',
                maxWidth: '500px',
                width: '90%',
              }}
            >
              <h2
                className="font-serif"
                style={{ fontSize: '24px', color: 'var(--theme-text-primary)', marginBottom: '16px' }}
              >
                About This Demo
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--theme-text-secondary)', lineHeight: 1.7, marginBottom: '20px' }}>
                This is a live simulation of the Human Agency orchestration layer. Watch as AI agents
                spawn, work in parallel, and complete complex tasks that would typically require
                entire teams.
              </p>

              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '13px', color: 'var(--theme-text-primary)', marginBottom: '12px' }}>
                  The 1:1,000,000 Ratio
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--theme-text-secondary)', lineHeight: 1.6 }}>
                  Each scenario demonstrates how one human can direct dozens of specialized agents
                  working in parallel—accomplishing in minutes what would take teams weeks.
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '13px', color: 'var(--theme-text-primary)', marginBottom: '12px' }}>
                  Color Legend:
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {[
                    { role: 'coordinator', label: 'Coordinator' },
                    { role: 'researcher', label: 'Researcher' },
                    { role: 'executor', label: 'Executor' },
                    { role: 'validator', label: 'Validator' },
                    { role: 'synthesizer', label: 'Synthesizer' },
                  ].map(({ role, label }) => (
                    <div key={role} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: getAgentColor(role, 'working'),
                        }}
                      />
                      <span style={{ fontSize: '12px', color: 'var(--theme-text-secondary)' }}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowInfo(false)}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'var(--theme-accent)',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'var(--theme-accent-text)',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Got It
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
