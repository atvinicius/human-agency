import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgentStore } from '../stores/agentStore';
import { MockAgentSimulator } from '../services/mockAgentService';
import AgentMap from '../components/map/AgentMap';
import ActivityStream from '../components/stream/ActivityStream';
import InterventionPanel from '../components/intervention/InterventionPanel';
import QuickActions from '../components/intervention/QuickActions';
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
        background: mapColors.nodeBackground,
        border: `1px solid ${mapColors.nodeBorder}`,
        borderRadius: '12px',
        padding: '20px',
        minWidth: '400px',
        maxWidth: '600px',
        zIndex: 150,
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
      }}
    >
      {/* Close button */}
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
          color: mapColors.textMuted,
        }}
      >
        <X size={16} />
      </button>

      {/* Header */}
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
          <div style={{ fontSize: '16px', fontWeight: 500, color: mapColors.textPrimary }}>
            {agent.name}
          </div>
          <div style={{ fontSize: '12px', color: mapColors.textMuted, textTransform: 'capitalize' }}>
            {agent.role} • {agent.status} • {agent.priority} priority
          </div>
        </div>
      </div>

      {/* Objective */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: mapColors.textMuted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Objective
        </div>
        <div style={{ fontSize: '14px', color: mapColors.textSecondary }}>
          {agent.objective}
        </div>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', color: mapColors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Progress
          </span>
          <span style={{ fontSize: '12px', color: mapColors.textPrimary }}>
            {Math.round(agent.progress)}%
          </span>
        </div>
        <div
          style={{
            height: '6px',
            background: mapColors.nodeBorder,
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

      {/* Current Activity */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '11px', color: mapColors.textMuted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Current Activity
        </div>
        <div style={{ fontSize: '14px', color: mapColors.textPrimary }}>
          {agent.currentActivity}
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions
        agent={agent}
        onPause={onPause}
        onResume={onResume}
        onDive={onDive}
      />
    </motion.div>
  );
}

export default function Demo() {
  const simulatorRef = useRef(null);
  const [showInfo, setShowInfo] = useState(true);

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
  const waitingAgent = agents.find((a) => a.pendingInput);
  const stats = getStats();

  // Initialize simulator
  useEffect(() => {
    simulatorRef.current = new MockAgentSimulator(useAgentStore.getState());
    simulatorRef.current.store = useAgentStore.getState();

    // Connect store updates
    const unsubscribe = useAgentStore.subscribe((state) => {
      if (simulatorRef.current) {
        simulatorRef.current.store = state;
      }
    });

    simulatorRef.current.start();

    return () => {
      simulatorRef.current?.stop();
      unsubscribe();
      reset();
    };
  }, []);

  const handleReset = () => {
    simulatorRef.current?.stop();
    reset();
    simulatorRef.current = new MockAgentSimulator(useAgentStore.getState());
    simulatorRef.current.store = useAgentStore.getState();
    simulatorRef.current.start();
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
    // Could implement zoom-to-agent here
  };

  const handleEventClick = (agentId) => {
    if (agentId) {
      selectAgent(agentId);
    }
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: mapColors.background,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <header
        style={{
          height: '56px',
          borderBottom: `1px solid ${mapColors.nodeBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: mapColors.textMuted,
              textDecoration: 'none',
              fontSize: '14px',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = mapColors.textPrimary)}
            onMouseLeave={(e) => (e.currentTarget.style.color = mapColors.textMuted)}
          >
            <ArrowLeft size={16} />
            Back
          </Link>
          <div
            style={{
              width: '1px',
              height: '24px',
              background: mapColors.nodeBorder,
            }}
          />
          <span
            className="font-serif"
            style={{
              fontSize: '16px',
              color: mapColors.textPrimary,
            }}
          >
            Mission Control
          </span>
          <span
            style={{
              fontSize: '11px',
              padding: '4px 8px',
              background: 'rgba(201, 168, 124, 0.1)',
              borderRadius: '4px',
              color: '#c9a87c',
            }}
          >
            DEMO
          </span>
        </div>

        <button
          onClick={() => setShowInfo(!showInfo)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            background: 'transparent',
            border: `1px solid ${mapColors.nodeBorder}`,
            borderRadius: '6px',
            color: mapColors.textSecondary,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          <Info size={14} />
          Info
        </button>
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

          {/* Selected agent detail panel */}
          <AnimatePresence>
            {selectedAgent && !selectedAgent.pendingInput && (
              <DetailPanel
                agent={selectedAgent}
                onClose={clearSelection}
                onPause={pauseAgent}
                onResume={resumeAgent}
                onDive={handleDive}
              />
            )}
          </AnimatePresence>
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
              background: 'rgba(0,0,0,0.8)',
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
                background: mapColors.nodeBackground,
                border: `1px solid ${mapColors.nodeBorder}`,
                borderRadius: '12px',
                padding: '32px',
                maxWidth: '500px',
                width: '90%',
              }}
            >
              <h2
                className="font-serif"
                style={{
                  fontSize: '24px',
                  color: mapColors.textPrimary,
                  marginBottom: '16px',
                }}
              >
                Agent Orchestration Demo
              </h2>
              <p
                style={{
                  fontSize: '14px',
                  color: mapColors.textSecondary,
                  lineHeight: 1.7,
                  marginBottom: '20px',
                }}
              >
                This is a live simulation of the Human Agency orchestration layer.
                Watch as AI agents spawn, work, and complete tasks in real-time.
              </p>

              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '13px', color: mapColors.textPrimary, marginBottom: '12px' }}>
                  Interactions:
                </h3>
                <ul style={{ fontSize: '13px', color: mapColors.textSecondary, paddingLeft: '20px', lineHeight: 1.8 }}>
                  <li><strong>Pan/Zoom</strong> — Drag and scroll to navigate</li>
                  <li><strong>Click node</strong> — View agent details</li>
                  <li><strong>Pause/Resume</strong> — Control agent execution</li>
                  <li><strong>Human Input</strong> — Respond to agent requests</li>
                </ul>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '13px', color: mapColors.textPrimary, marginBottom: '12px' }}>
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
                      <span style={{ fontSize: '12px', color: mapColors.textSecondary }}>
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
                  background: '#c9a87c',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#0a0a0a',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Start Exploring
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
