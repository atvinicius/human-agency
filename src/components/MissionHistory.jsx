import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Rocket, Clock, Users, ChevronRight, ArrowLeft, FileText } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { getMissionHistory, getMissionDetails } from '../services/missionHistoryService';

const STATUS_COLORS = {
  active: 'hsl(150, 70%, 50%)',
  completed: 'hsl(210, 70%, 55%)',
  failed: 'hsl(0, 70%, 55%)',
  paused: 'hsl(40, 90%, 55%)',
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function MissionList({ missions, onSelect, onRelaunch, loading }) {
  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--theme-text-muted)' }}>
        Loading missions...
      </div>
    );
  }

  if (missions.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Rocket size={32} style={{ color: 'var(--theme-text-muted)', marginBottom: '12px' }} />
        <p style={{ fontSize: '14px', color: 'var(--theme-text-secondary)' }}>No mission history yet</p>
        <p style={{ fontSize: '12px', color: 'var(--theme-text-muted)', marginTop: '4px' }}>
          Launch your first mission to see it here
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {missions.map((mission) => (
        <button
          key={mission.id}
          onClick={() => onSelect(mission.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 16px',
            background: 'transparent',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--theme-bg)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: STATUS_COLORS[mission.status] || 'var(--theme-text-muted)',
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--theme-text-primary)', marginBottom: '2px' }}>
              {mission.name}
            </div>
            <div style={{
              fontSize: '11px',
              color: 'var(--theme-text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {mission.objective?.substring(0, 60)}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <span style={{ fontSize: '11px', color: 'var(--theme-text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Users size={10} />
              {mission.agent_count}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--theme-text-muted)' }}>
              {formatDate(mission.started_at)}
            </span>
            <ChevronRight size={14} style={{ color: 'var(--theme-text-muted)' }} />
          </div>
        </button>
      ))}
    </div>
  );
}

function MissionDetail({ missionId, onBack, onRelaunch }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMissionDetails(missionId).then((data) => {
      setDetails(data);
      setLoading(false);
    });
  }, [missionId]);

  if (loading || !details) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--theme-text-muted)' }}>
        Loading details...
      </div>
    );
  }

  const { session, agents, events, artifacts } = details;
  const presetConfig = session.metadata?.preset_config;

  return (
    <div>
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 0',
          background: 'none',
          border: 'none',
          color: 'var(--theme-text-muted)',
          fontSize: '12px',
          cursor: 'pointer',
          marginBottom: '12px',
        }}
      >
        <ArrowLeft size={14} />
        Back to list
      </button>

      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--theme-text-primary)', marginBottom: '4px' }}>
          {session.name}
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--theme-text-secondary)', lineHeight: 1.5 }}>
          {session.objective}
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <span style={{
            fontSize: '11px',
            padding: '3px 8px',
            borderRadius: '4px',
            background: STATUS_COLORS[session.status] ? `${STATUS_COLORS[session.status]}22` : 'var(--theme-bg)',
            color: STATUS_COLORS[session.status] || 'var(--theme-text-muted)',
          }}>
            {session.status}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--theme-text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Users size={10} /> {agents.length} agents
          </span>
          <span style={{ fontSize: '11px', color: 'var(--theme-text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Clock size={10} /> {formatDate(session.started_at)}
          </span>
        </div>
      </div>

      {/* Agents */}
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--theme-text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Agents
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflow: 'auto' }}>
          {agents.map((agent) => (
            <div key={agent.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 10px',
              background: 'var(--theme-bg)',
              borderRadius: '6px',
              fontSize: '12px',
            }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: STATUS_COLORS[agent.status] || 'var(--theme-text-muted)',
              }} />
              <span style={{ color: 'var(--theme-text-primary)', fontWeight: 500 }}>{agent.name}</span>
              <span style={{ color: 'var(--theme-text-muted)' }}>{agent.role}</span>
              <span style={{ marginLeft: 'auto', color: 'var(--theme-text-muted)' }}>{agent.progress}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Artifacts */}
      {artifacts.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--theme-text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Artifacts
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {artifacts.map((artifact) => (
              <div key={artifact.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                background: 'var(--theme-bg)',
                borderRadius: '6px',
                fontSize: '12px',
              }}>
                <FileText size={12} style={{ color: 'var(--theme-text-muted)' }} />
                <span style={{ color: 'var(--theme-text-primary)' }}>{artifact.name}</span>
                <span style={{ color: 'var(--theme-text-muted)' }}>{artifact.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Re-launch */}
      {presetConfig && (
        <button
          onClick={() => onRelaunch(presetConfig)}
          style={{
            width: '100%',
            padding: '12px',
            background: 'var(--theme-accent)',
            border: 'none',
            borderRadius: '8px',
            color: 'var(--theme-accent-text)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <Rocket size={14} />
          Re-launch Mission
        </button>
      )}
    </div>
  );
}

export default function MissionHistory({ onClose, onRelaunch }) {
  const userId = useAuthStore((s) => s.user?.id);
  const authLoading = useAuthStore((s) => s.loading);
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMissionId, setSelectedMissionId] = useState(null);

  useEffect(() => {
    // Wait for auth to finish initializing before deciding
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getMissionHistory(userId)
      .then((data) => {
        setMissions(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch mission history:', err);
        setLoading(false);
      });
  }, [authLoading, userId]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
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
      }}
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
          padding: '24px',
          maxWidth: '560px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 className="font-serif" style={{ fontSize: '20px', color: 'var(--theme-text-primary)' }}>
            Mission History
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--theme-text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {selectedMissionId ? (
          <MissionDetail
            missionId={selectedMissionId}
            onBack={() => setSelectedMissionId(null)}
            onRelaunch={onRelaunch}
          />
        ) : (
          <MissionList
            missions={missions}
            onSelect={setSelectedMissionId}
            onRelaunch={onRelaunch}
            loading={loading}
          />
        )}
      </motion.div>
    </motion.div>
  );
}
