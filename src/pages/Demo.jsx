import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, X, Rocket, Clock, Users, Zap, LogOut, History, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgentStore } from '../stores/agentStore';
import { useMissionReportStore } from '../stores/missionReportStore';
import { useCreditStore } from '../stores/creditStore';
import { MockAgentSimulator } from '../services/mockAgentService';
import { getOrchestrationService } from '../services/orchestrationService';
import AgentMap from '../components/map/AgentMap';
import PulseBar from '../components/timeline/PulseBar';
import PresetSelector from '../components/PresetSelector';
import ConfirmDialog from '../components/ConfirmDialog';
import MissionHistory from '../components/MissionHistory';
import MissionReport from '../components/MissionReport';
import BetaWelcome from '../components/BetaWelcome';
import CreditBalance from '../components/CreditBalance';
import ThemeToggle from '../components/ThemeToggle';
import { useAuthStore } from '../stores/authStore';
import { isSupabaseConfigured } from '../lib/supabase';
import { getAgentColor } from '../utils/colorScheme';

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
  const navigate = useNavigate();
  const simulatorRef = useRef(null);
  const orchestratorRef = useRef(null);
  const [showPresetSelector, setShowPresetSelector] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [currentPreset, setCurrentPreset] = useState(null);
  const [useRealAI, setUseRealAI] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [focusedAgentId, setFocusedAgentId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // null | { type, payload? }
  const [showReport, setShowReport] = useState(false);
  const [showBetaWelcome, setShowBetaWelcome] = useState(false);
  const startTimeRef = useRef(null);

  const authUser = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const reportSectionCount = useMissionReportStore((s) => s.sections.length);
  const reportStatus = useMissionReportStore((s) => s.status);

  const {
    agents,
    selectedAgentId,
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

  const stats = getStats();

  const isMissionRunning = currentPreset && agents.some(
    (a) => !['completed', 'failed'].includes(a.status)
  );

  const handleSignOut = async () => {
    if (isMissionRunning) {
      setConfirmAction({ type: 'signout' });
      return;
    }
    await signOut();
    navigate('/login');
  };

  // Show beta welcome for first-time users
  useEffect(() => {
    if (authUser && isSupabaseConfigured()) {
      const seen = localStorage.getItem(`beta_welcome_seen_${authUser.id}`);
      if (!seen) {
        setShowBetaWelcome(true);
      }
    }
  }, [authUser]);

  // Auto-focus on agents that need input
  const waitingAgent = agents.find((a) => a.pendingInput || a.pending_input);
  useEffect(() => {
    if (waitingAgent && !focusedAgentId) {
      setFocusedAgentId(waitingAgent.id);
    } else if (!waitingAgent && focusedAgentId) {
      setFocusedAgentId(null);
    }
  }, [waitingAgent?.id]);

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

    if (useRealAI) {
      orchestratorRef.current = getOrchestrationService();
      await orchestratorRef.current.startSession(preset);
      // Refresh credit balance after mission planning
      useCreditStore.getState().fetchBalance();
    } else {
      simulatorRef.current = new MockAgentSimulator(useAgentStore.getState());
      simulatorRef.current.store = useAgentStore.getState();

      const unsubscribe = useAgentStore.subscribe((state) => {
        if (simulatorRef.current) {
          simulatorRef.current.store = state;
        }
      });

      simulatorRef.current.startWithPreset(preset);
    }
  };

  const doReset = async () => {
    simulatorRef.current?.stop();
    await orchestratorRef.current?.stop();
    reset();
    useMissionReportStore.getState().reset();
    setCurrentPreset(null);
    setElapsedTime(0);
    setFocusedAgentId(null);
    setShowReport(false);
    setShowPresetSelector(true);
  };

  const handleReset = () => {
    if (isMissionRunning) {
      setConfirmAction({ type: 'reset' });
      return;
    }
    doReset();
  };

  const handleNewMission = () => {
    if (isMissionRunning) {
      setConfirmAction({ type: 'newMission' });
      return;
    }
    setShowPresetSelector(true);
  };

  const handleConfirmAction = async () => {
    const action = confirmAction;
    setConfirmAction(null);
    if (!action) return;

    switch (action.type) {
      case 'reset':
        await doReset();
        break;
      case 'signout':
        await doReset();
        await signOut();
        navigate('/login');
        break;
      case 'newMission':
        await doReset();
        setShowPresetSelector(true);
        break;
    }
  };

  const handleRelaunch = async (preset) => {
    setShowHistory(false);
    if (isMissionRunning) {
      setConfirmAction({ type: 'newMission' });
      return;
    }
    handleSelectPreset(preset);
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

  const handleRespondToInput = (agentId, response) => {
    respondToInput(agentId, response);
    setFocusedAgentId(null);
  };

  const handleUnfocusAgent = () => {
    setFocusedAgentId(null);
  };

  // Warn before tab close/refresh during active mission
  useEffect(() => {
    if (!isMissionRunning) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isMissionRunning]);

  // Reconnect to running orchestrator on mount (background execution)
  useEffect(() => {
    const orch = getOrchestrationService();
    const status = orch.getStatus();
    if (status.running && status.preset) {
      orchestratorRef.current = orch;
      setCurrentPreset(status.preset);
      startTimeRef.current = status.startTime;
      setElapsedTime(Date.now() - status.startTime);
      setShowPresetSelector(false);
    }
  }, []);

  // Cleanup only the mock simulator on unmount (orchestrator survives navigation)
  useEffect(() => {
    return () => {
      simulatorRef.current?.stop();
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
          {/* History always visible when authenticated */}
          {isSupabaseConfigured() && authUser && (
            <button
              onClick={() => setShowHistory(true)}
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
              <History size={14} />
              History
            </button>
          )}
          {/* These only show during/after a mission */}
          {currentPreset && (
            <>
              <button
                onClick={() => setShowReport(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  background: reportStatus === 'complete' ? 'hsl(150, 70%, 50%, 0.1)' : 'transparent',
                  border: `1px solid ${reportStatus === 'complete' ? 'hsl(150, 70%, 50%, 0.3)' : 'var(--theme-border)'}`,
                  borderRadius: '6px',
                  color: reportStatus === 'complete' ? 'hsl(150, 70%, 50%)' : 'var(--theme-text-secondary)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                <FileText size={14} />
                View Output
                {reportSectionCount > 0 && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '1px 5px',
                      background: 'var(--theme-accent)',
                      color: 'var(--theme-accent-text)',
                      borderRadius: '8px',
                      minWidth: '16px',
                      textAlign: 'center',
                    }}
                  >
                    {reportSectionCount}
                  </span>
                )}
              </button>
              <button
                onClick={handleNewMission}
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
            </>
          )}
          {isSupabaseConfigured() && authUser && <CreditBalance />}
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
          {isSupabaseConfigured() && authUser && (
            <>
              <div style={{ width: '1px', height: '24px', background: 'var(--theme-border)' }} />
              <span style={{ fontSize: '12px', color: 'var(--theme-text-muted)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {authUser.email}
              </span>
              <button
                onClick={handleSignOut}
                title="Sign out"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 10px',
                  background: 'transparent',
                  border: '1px solid var(--theme-border)',
                  borderRadius: '6px',
                  color: 'var(--theme-text-muted)',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                <LogOut size={14} />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Full-width map area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <AgentMap
          agents={agents}
          selectedAgentId={selectedAgentId}
          onSelectAgent={(id) => id ? selectAgent(id) : clearSelection()}
          onPauseAgent={pauseAgent}
          onResumeAgent={resumeAgent}
          onDiveAgent={handleDive}
          onRespondToInput={handleRespondToInput}
          isPaused={isPaused}
          onTogglePause={handleTogglePause}
          onReset={handleReset}
          stats={stats}
          focusedAgentId={focusedAgentId}
          onFocusAgent={setFocusedAgentId}
          onUnfocusAgent={handleUnfocusAgent}
        />

        {/* Mission header */}
        {currentPreset && (
          <MissionHeader preset={currentPreset} stats={stats} elapsedTime={elapsedTime} />
        )}

        {/* PulseBar (bottom timeline) */}
        {currentPreset && <PulseBar />}

        {/* Empty state - no mission selected */}
        {!currentPreset && agents.length === 0 && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
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

      {/* Preset selector */}
      <AnimatePresence>
        {showPresetSelector && (
          <PresetSelector
            onSelect={handleSelectPreset}
            onClose={() => setShowPresetSelector(false)}
          />
        )}
      </AnimatePresence>

      {/* Confirmation dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        title={
          confirmAction?.type === 'reset' ? 'Reset Mission?' :
          confirmAction?.type === 'signout' ? 'Sign Out?' :
          'Start New Mission?'
        }
        message={
          confirmAction?.type === 'reset'
            ? 'A mission is currently running. Resetting will stop all agents and discard their progress.'
            : confirmAction?.type === 'signout'
            ? 'A mission is currently running. Signing out will stop all agents and discard their progress.'
            : 'A mission is currently running. Starting a new mission will stop all current agents.'
        }
        confirmLabel={
          confirmAction?.type === 'signout' ? 'Sign Out' :
          confirmAction?.type === 'reset' ? 'Reset' : 'Start New'
        }
        variant="danger"
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
      />

      {/* Mission history */}
      <AnimatePresence>
        {showHistory && (
          <MissionHistory
            onClose={() => setShowHistory(false)}
            onRelaunch={handleRelaunch}
          />
        )}
      </AnimatePresence>

      {/* Mission report */}
      <AnimatePresence>
        {showReport && (
          <MissionReport onClose={() => setShowReport(false)} />
        )}
      </AnimatePresence>

      {/* Beta welcome modal */}
      <AnimatePresence>
        {showBetaWelcome && (
          <BetaWelcome
            userId={authUser?.id}
            onDismiss={() => {
              setShowBetaWelcome(false);
              useCreditStore.getState().fetchBalance();
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
                About This Project
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--theme-text-secondary)', lineHeight: 1.7, marginBottom: '20px' }}>
                Human Agency is a research orchestration platform. Launch a mission and watch as a team of
                AI agents — researchers, validators, and synthesizers — work in parallel to investigate
                complex topics. Agents search the web, share findings, and converge into a structured report.
              </p>

              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '13px', color: 'var(--theme-text-primary)', marginBottom: '12px' }}>
                  How It Works
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--theme-text-secondary)', lineHeight: 1.6 }}>
                  Each mission spawns a coordinator that delegates to specialized agents. Researchers search the
                  web and share findings with siblings to avoid duplication. A validator cross-checks claims,
                  and a synthesizer compiles everything into a final report you can copy or download.
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '13px', color: 'var(--theme-text-primary)', marginBottom: '12px' }}>
                  The Living Map
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--theme-text-secondary)', lineHeight: 1.6 }}>
                  Agents appear as luminous orbs in a force-directed layout. Scroll to zoom, click to inspect.
                  Colored particles flowing along edges show data moving between agents — findings, context,
                  search results, and synthesis. A pulsing ring means an agent is searching the web.
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '13px', color: 'var(--theme-text-primary)', marginBottom: '12px' }}>
                  Agent Roles
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {[
                    { role: 'coordinator', label: 'Coordinator' },
                    { role: 'researcher', label: 'Researcher' },
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
