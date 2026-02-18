import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, FileText, Layers, List, Copy, Download, CheckCircle, Loader } from 'lucide-react';
import { useMissionReportStore } from '../stores/missionReportStore';
import { renderMarkdown } from '../utils/renderMarkdown';

const TABS = [
  { key: 'report', label: 'Report', icon: FileText },
  { key: 'artifacts', label: 'Artifacts', icon: Layers },
  { key: 'raw', label: 'Raw Findings', icon: List },
];

const statusColors = {
  building: 'hsl(210, 70%, 50%)',
  synthesizing: 'hsl(30, 80%, 55%)',
  complete: 'hsl(150, 70%, 50%)',
};

const statusLabels = {
  building: 'Building',
  synthesizing: 'Synthesizing',
  complete: 'Complete',
};

const roleOrder = ['coordinator', 'researcher', 'executor', 'validator', 'synthesizer'];

export default function MissionReport({ onClose }) {
  const [activeTab, setActiveTab] = useState('report');
  const [copied, setCopied] = useState(false);

  const sections = useMissionReportStore((s) => s.sections);
  const synthesis = useMissionReportStore((s) => s.synthesis);
  const status = useMissionReportStore((s) => s.status);
  const getSectionsByRole = useMissionReportStore((s) => s.getSectionsByRole);
  const getArtifacts = useMissionReportStore((s) => s.getArtifacts);

  const sectionsByRole = getSectionsByRole();
  const artifacts = getArtifacts();

  const handleCopy = async () => {
    const text = synthesis || sections.map((s) => `## ${s.agentName}\n${s.content}`).join('\n\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = synthesis
      ? `# Mission Report\n\n${synthesis}\n\n---\n\n${sections.map((s) => `## ${s.agentName} (${s.role})\n${s.content}`).join('\n\n')}`
      : sections.map((s) => `## ${s.agentName} (${s.role})\n${s.content}`).join('\n\n');

    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mission-report.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ x: 480 }}
      animate={{ x: 0 }}
      exit={{ x: 480 }}
      transition={{ type: 'spring', damping: 25, stiffness: 250 }}
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '480px',
        maxWidth: '100vw',
        background: 'var(--theme-surface)',
        borderLeft: '1px solid var(--theme-border)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--theme-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FileText size={18} style={{ color: 'var(--theme-text-muted)' }} />
          <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--theme-text-primary)' }}>
            Mission Output
          </span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              padding: '3px 8px',
              background: `${statusColors[status]}20`,
              color: statusColors[status],
              borderRadius: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {status === 'synthesizing' && (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <Loader size={10} />
              </motion.div>
            )}
            {statusLabels[status]}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '6px',
            cursor: 'pointer',
            color: 'var(--theme-text-muted)',
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--theme-border)',
          padding: '0 20px',
          flexShrink: 0,
        }}
      >
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === key ? '2px solid var(--theme-accent)' : '2px solid transparent',
              color: activeTab === key ? 'var(--theme-accent)' : 'var(--theme-text-muted)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s',
            }}
          >
            <Icon size={13} />
            {label}
            {key === 'artifacts' && artifacts.length > 0 && (
              <span style={{ fontSize: '10px', padding: '1px 5px', background: 'var(--theme-accent-muted)', borderRadius: '8px' }}>
                {artifacts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {/* Report tab */}
        {activeTab === 'report' && (
          <>
            {synthesis && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--theme-accent)', marginBottom: '8px', fontWeight: 600 }}>
                  Synthesized Report
                </div>
                <div style={{ background: 'var(--theme-bg)', borderRadius: '8px', padding: '16px', border: '1px solid var(--theme-border)' }}>
                  {renderMarkdown(synthesis)}
                </div>
              </div>
            )}

            {roleOrder.map((role) => {
              const roleSections = sectionsByRole[role];
              if (!roleSections || roleSections.length === 0) return null;
              return (
                <div key={role} style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--theme-text-muted)', marginBottom: '8px', fontWeight: 600 }}>
                    {role}s ({roleSections.length})
                  </div>
                  {roleSections.map((section) => (
                    <div
                      key={section.id}
                      style={{
                        background: 'var(--theme-bg)',
                        borderRadius: '8px',
                        padding: '12px 14px',
                        marginBottom: '8px',
                        border: '1px solid var(--theme-border)',
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--theme-text-primary)', marginBottom: '6px' }}>
                        {section.agentName}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--theme-text-secondary)', lineHeight: 1.6 }}>
                        {section.content.length > 500
                          ? renderMarkdown(section.content.slice(0, 500) + '...')
                          : renderMarkdown(section.content)
                        }
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}

            {sections.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--theme-text-muted)', fontSize: '13px' }}>
                Agent outputs will appear here as they complete work.
              </div>
            )}
          </>
        )}

        {/* Artifacts tab */}
        {activeTab === 'artifacts' && (
          <>
            {artifacts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--theme-text-muted)', fontSize: '13px' }}>
                No artifacts generated yet.
              </div>
            ) : (
              artifacts.map((artifact) => (
                <div
                  key={artifact.id}
                  style={{
                    background: 'var(--theme-bg)',
                    borderRadius: '8px',
                    padding: '14px',
                    marginBottom: '10px',
                    border: '1px solid var(--theme-border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Layers size={14} style={{ color: 'var(--theme-accent)' }} />
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--theme-text-primary)' }}>
                      {artifact.title}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--theme-text-muted)', textTransform: 'uppercase' }}>
                      {artifact.agentName}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--theme-text-secondary)', lineHeight: 1.6 }}>
                    {renderMarkdown(artifact.content)}
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* Raw findings tab */}
        {activeTab === 'raw' && (
          <>
            {sections.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--theme-text-muted)', fontSize: '13px' }}>
                No findings yet.
              </div>
            ) : (
              sections
                .sort((a, b) => a.timestamp - b.timestamp)
                .map((section) => (
                  <div
                    key={section.id}
                    style={{
                      padding: '10px 0',
                      borderBottom: '1px solid var(--theme-border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--theme-text-muted)', textTransform: 'uppercase' }}>
                        {section.role}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--theme-text-primary)' }}>
                        {section.agentName}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--theme-text-muted)', marginLeft: 'auto' }}>
                        {new Date(section.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--theme-text-secondary)', lineHeight: 1.5 }}>
                      {section.content.length > 300 ? section.content.slice(0, 300) + '...' : section.content}
                    </div>
                  </div>
                ))
            )}
          </>
        )}
      </div>

      {/* Actions footer */}
      <div
        style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--theme-border)',
          display: 'flex',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <button
          onClick={handleCopy}
          style={{
            flex: 1,
            padding: '10px',
            background: 'var(--theme-bg)',
            border: '1px solid var(--theme-border)',
            borderRadius: '6px',
            color: copied ? 'hsl(150, 70%, 50%)' : 'var(--theme-text-secondary)',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          onClick={handleDownload}
          style={{
            flex: 1,
            padding: '10px',
            background: 'var(--theme-bg)',
            border: '1px solid var(--theme-border)',
            borderRadius: '6px',
            color: 'var(--theme-text-secondary)',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <Download size={14} />
          Download .md
        </button>
      </div>
    </motion.div>
  );
}
