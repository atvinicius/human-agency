import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  X, FileText, Layers, Clock, ExternalLink,
  Copy, Download, CheckCircle, Loader, ChevronDown,
} from 'lucide-react';
import { useMissionReportStore } from '../stores/missionReportStore';
import { renderMarkdown } from '../utils/renderMarkdown';
import FindingCard from './report/FindingCard';
import SourceList from './report/SourceList';
import TimelineView from './report/TimelineView';

const TABS = [
  { key: 'summary', label: 'Summary', icon: FileText },
  { key: 'findings', label: 'Findings', icon: Layers },
  { key: 'sources', label: 'Sources', icon: ExternalLink },
  { key: 'timeline', label: 'Timeline', icon: Clock },
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

// Convert structured or string synthesis to plain text
function synthesisAsText(synthesis) {
  if (!synthesis) return '';
  if (typeof synthesis === 'string') return synthesis;
  const parts = [];
  if (synthesis.executive_summary) parts.push(`## Executive Summary\n${synthesis.executive_summary}`);
  if (synthesis.key_findings?.length) {
    parts.push(`## Key Findings\n${synthesis.key_findings.map((kf, i) => {
      let line = `${i + 1}. ${kf.finding}`;
      if (kf.confidence) line += ` [${kf.confidence} confidence]`;
      if (kf.sources?.length) line += `\n   Sources: ${kf.sources.join(', ')}`;
      return line;
    }).join('\n')}`);
  }
  if (synthesis.detailed_analysis) parts.push(`## Detailed Analysis\n${synthesis.detailed_analysis}`);
  if (synthesis.methodology) parts.push(`## Methodology\n${synthesis.methodology}`);
  if (synthesis.sources?.length) {
    parts.push(`## Sources\n${synthesis.sources.map((s) => `- ${s.title || s.url}: ${s.url}`).join('\n')}`);
  }
  return parts.join('\n\n');
}

// Build structured JSON export
function buildExportJson(sections, searchRecords, synthesis, sourceMap) {
  return {
    synthesis,
    sections: sections.map((s) => ({
      agentName: s.agentName,
      role: s.role,
      content: s.content,
      thinking: s.thinking,
      searchQueries: s.searchQueries,
      sources: s.sources,
      tags: s.tags,
      objective: s.objective,
      timestamp: s.timestamp,
    })),
    searches: searchRecords,
    sources: Object.values(sourceMap),
    exportedAt: new Date().toISOString(),
  };
}

// Build self-contained HTML export
function buildExportHtml(sections, synthesis, sourceMap) {
  const sourcesHtml = Object.values(sourceMap)
    .map((s) => `<li><a href="${s.url}">${s.url}</a> (cited by: ${s.citedBy.map((c) => c.agentName).join(', ')})</li>`)
    .join('\n');

  const findingsHtml = sections
    .filter((s) => s.type !== 'artifact')
    .map((s) => {
      let html = `<div class="finding"><h3>${s.agentName} <span class="badge">${s.role}</span></h3>`;
      html += `<div class="content">${s.content.replace(/\n/g, '<br>')}</div>`;
      if (s.thinking && s.thinking !== 'Processing...') {
        html += `<details><summary>Agent Reasoning</summary><p class="thinking">${s.thinking}</p></details>`;
      }
      html += '</div>';
      return html;
    })
    .join('\n');

  // Build synthesis HTML — handle structured or string
  let synthesisHtml = '';
  if (synthesis && typeof synthesis === 'object' && synthesis.executive_summary) {
    synthesisHtml += `<h2>Executive Summary</h2><div class="content">${synthesis.executive_summary.replace(/\n/g, '<br>')}</div>`;
    if (synthesis.key_findings?.length) {
      synthesisHtml += '<h2>Key Findings</h2>';
      for (const kf of synthesis.key_findings) {
        const conf = kf.confidence ? ` <span class="conf-${kf.confidence}">[${kf.confidence}]</span>` : '';
        const srcs = kf.sources?.length ? `<div class="kf-sources">${kf.sources.map((s) => `<a href="${s}">${s}</a>`).join(' ')}</div>` : '';
        synthesisHtml += `<div class="finding"><p>${kf.finding}${conf}</p>${srcs}</div>`;
      }
    }
    if (synthesis.detailed_analysis) {
      synthesisHtml += `<h2>Detailed Analysis</h2><div class="content">${synthesis.detailed_analysis.replace(/\n/g, '<br>')}</div>`;
    }
    if (synthesis.methodology) {
      synthesisHtml += `<h2>Methodology</h2><div class="content">${synthesis.methodology.replace(/\n/g, '<br>')}</div>`;
    }
  } else if (synthesis) {
    synthesisHtml = `<h2>Synthesis</h2><div class="content">${String(synthesis).replace(/\n/g, '<br>')}</div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Mission Report</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #e0e0e0; background: #1a1a2e; }
  h1 { border-bottom: 2px solid #333; padding-bottom: 12px; }
  h2 { color: #8ab4f8; margin-top: 32px; }
  h3 { margin: 0 0 8px; font-size: 15px; }
  .badge { font-size: 10px; padding: 2px 8px; border-radius: 8px; background: rgba(138,180,248,0.15); color: #8ab4f8; text-transform: uppercase; font-weight: 600; }
  .conf-high { color: #66bb6a; font-size: 11px; }
  .conf-medium { color: #ffa726; font-size: 11px; }
  .conf-low { color: #ef5350; font-size: 11px; }
  .kf-sources { margin-top: 4px; font-size: 12px; }
  .kf-sources a { margin-right: 8px; }
  .finding { background: #1e1e32; border: 1px solid #333; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
  .content { font-size: 14px; line-height: 1.7; color: #c0c0c0; }
  .thinking { font-size: 13px; color: #888; border-left: 2px solid #444; padding-left: 12px; }
  details { margin-top: 8px; }
  summary { cursor: pointer; font-size: 12px; color: #888; text-transform: uppercase; }
  a { color: #8ab4f8; }
  ul { padding-left: 20px; }
  li { margin: 4px 0; font-size: 13px; }
  .meta { font-size: 11px; color: #666; margin-top: 32px; border-top: 1px solid #333; padding-top: 12px; }
</style>
</head>
<body>
<h1>Mission Report</h1>
${synthesisHtml}
<h2>Findings</h2>
${findingsHtml}
${sourcesHtml ? `<h2>Sources</h2><ul>${sourcesHtml}</ul>` : ''}
<div class="meta">Generated by Human Agency</div>
</body>
</html>`;
}

export default function MissionReport({ onClose }) {
  const [activeTab, setActiveTab] = useState('summary');
  const [copied, setCopied] = useState(false);
  const [exportMenu, setExportMenu] = useState(false);

  const sections = useMissionReportStore((s) => s.sections);
  const searchRecords = useMissionReportStore((s) => s.searchRecords);
  const synthesis = useMissionReportStore((s) => s.synthesis);
  const status = useMissionReportStore((s) => s.status);
  const getArtifacts = useMissionReportStore((s) => s.getArtifacts);
  const getSourceMap = useMissionReportStore((s) => s.getSourceMap);
  const getSectionTree = useMissionReportStore((s) => s.getSectionTree);

  const artifacts = getArtifacts();
  const sourceMap = getSourceMap();
  const sectionTree = getSectionTree();

  // Build a lookup for parent agent names
  const parentNameMap = useMemo(() => {
    const map = {};
    for (const section of sections) {
      if (section.parentAgentId) {
        const parent = sections.find((s) => s.agentId === section.parentAgentId);
        if (parent) map[section.agentId] = parent.agentName;
      }
    }
    return map;
  }, [sections]);

  // Output-only sections (non-artifact)
  const outputSections = sections.filter((s) => s.type !== 'artifact');
  const sourceCount = Object.keys(sourceMap).length;

  const handleCopySynthesis = async () => {
    const text = synthesisAsText(synthesis) || sections.map((s) => `## ${s.agentName}\n${s.content}`).join('\n\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyHtml = async () => {
    const html = buildExportHtml(sections, synthesis, sourceMap);
    const blob = new Blob([html], { type: 'text/html' });
    await navigator.clipboard.write([new ClipboardItem({ 'text/html': blob })]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setExportMenu(false);
  };

  const handleDownloadHtml = () => {
    const html = buildExportHtml(sections, synthesis, sourceMap);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mission-report.html';
    a.click();
    URL.revokeObjectURL(url);
    setExportMenu(false);
  };

  const handleDownloadJson = () => {
    const data = buildExportJson(sections, searchRecords, synthesis, sourceMap);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mission-report.json';
    a.click();
    URL.revokeObjectURL(url);
    setExportMenu(false);
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
          padding: '0 12px',
          flexShrink: 0,
        }}
      >
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              padding: '10px 12px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === key ? '2px solid var(--theme-accent)' : '2px solid transparent',
              color: activeTab === key ? 'var(--theme-accent)' : 'var(--theme-text-muted)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.15s',
            }}
          >
            <Icon size={13} />
            {label}
            {key === 'sources' && sourceCount > 0 && (
              <span style={{ fontSize: '10px', padding: '1px 5px', background: 'var(--theme-accent-muted)', borderRadius: '8px' }}>
                {sourceCount}
              </span>
            )}
            {key === 'findings' && outputSections.length > 0 && (
              <span style={{ fontSize: '10px', padding: '1px 5px', background: 'var(--theme-accent-muted)', borderRadius: '8px' }}>
                {outputSections.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {/* Summary tab */}
        {activeTab === 'summary' && (
          <>
            {synthesis && typeof synthesis === 'object' && synthesis.executive_summary ? (
              <StructuredSynthesis synthesis={synthesis} />
            ) : synthesis ? (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--theme-accent)', marginBottom: '8px', fontWeight: 600 }}>
                  Synthesized Report
                </div>
                <div style={{ background: 'var(--theme-bg)', borderRadius: '8px', padding: '16px', border: '1px solid var(--theme-border)' }}>
                  {renderMarkdown(synthesis)}
                </div>
              </div>
            ) : null}

            {/* Quick stats */}
            {(outputSections.length > 0 || searchRecords.length > 0) && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <StatChip label="Findings" value={outputSections.length} color="hsl(210, 70%, 60%)" />
                <StatChip label="Searches" value={searchRecords.length} color="hsl(30, 70%, 55%)" />
                <StatChip label="Sources" value={sourceCount} color="hsl(150, 60%, 50%)" />
                {artifacts.length > 0 && (
                  <StatChip label="Artifacts" value={artifacts.length} color="hsl(260, 60%, 60%)" />
                )}
              </div>
            )}

            {/* Role breakdown with agent cards */}
            {roleOrder.map((role) => {
              const roleSections = outputSections.filter((s) => s.role === role);
              if (roleSections.length === 0) return null;
              return (
                <div key={role} style={{ marginBottom: '16px' }}>
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
                          : renderMarkdown(section.content)}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Artifacts inline */}
            {artifacts.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--theme-text-muted)', marginBottom: '8px', fontWeight: 600 }}>
                  Artifacts ({artifacts.length})
                </div>
                {artifacts.map((artifact) => (
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
                ))}
              </div>
            )}

            {sections.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--theme-text-muted)', fontSize: '13px' }}>
                Agent outputs will appear here as they complete work.
              </div>
            )}
          </>
        )}

        {/* Findings tab — hierarchical expandable cards */}
        {activeTab === 'findings' && (
          <>
            {outputSections.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--theme-text-muted)', fontSize: '13px' }}>
                No findings yet. Agent outputs will appear as expandable cards here.
              </div>
            ) : (
              <>
                {sectionTree.length > 0 ? (
                  // Hierarchical view
                  sectionTree.map((node) => (
                    <AgentNode key={node.agentId} node={node} parentNameMap={parentNameMap} depth={0} />
                  ))
                ) : (
                  // Flat fallback
                  outputSections
                    .sort((a, b) => a.timestamp - b.timestamp)
                    .map((section) => (
                      <FindingCard
                        key={section.id}
                        section={section}
                        parentName={parentNameMap[section.agentId]}
                      />
                    ))
                )}
              </>
            )}
          </>
        )}

        {/* Sources tab */}
        {activeTab === 'sources' && <SourceList sourceMap={sourceMap} />}

        {/* Timeline tab */}
        {activeTab === 'timeline' && (
          <TimelineView sections={outputSections} searchRecords={searchRecords} />
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
          position: 'relative',
        }}
      >
        <button
          onClick={handleCopySynthesis}
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
        <div style={{ flex: 1, position: 'relative' }}>
          <button
            onClick={() => setExportMenu(!exportMenu)}
            style={{
              width: '100%',
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
            Export
            <ChevronDown size={12} />
          </button>

          {/* Export dropdown */}
          {exportMenu && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                right: 0,
                marginBottom: '4px',
                background: 'var(--theme-surface)',
                border: '1px solid var(--theme-border)',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 -4px 16px rgba(0,0,0,0.2)',
                zIndex: 10,
              }}
            >
              <ExportOption label="Copy as rich text" sub="HTML" onClick={handleCopyHtml} />
              <ExportOption label="Download HTML" sub=".html" onClick={handleDownloadHtml} />
              <ExportOption label="Download JSON" sub=".json" onClick={handleDownloadJson} />
              <ExportOption
                label="Copy synthesis only"
                sub="Text"
                onClick={() => {
                  navigator.clipboard.writeText(synthesisAsText(synthesis) || '');
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                  setExportMenu(false);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Recursive tree renderer for findings
function AgentNode({ node, parentNameMap, depth }) {
  const outputSections = node.sections.filter((s) => s.type !== 'artifact');
  if (outputSections.length === 0 && node.children.length === 0) return null;

  return (
    <div style={{ marginLeft: depth > 0 ? '12px' : 0, borderLeft: depth > 0 ? '2px solid var(--theme-border)' : 'none', paddingLeft: depth > 0 ? '10px' : 0 }}>
      {outputSections.map((section) => (
        <FindingCard
          key={section.id}
          section={section}
          parentName={parentNameMap[section.agentId]}
        />
      ))}
      {node.children.map((child) => (
        <AgentNode key={child.agentId} node={child} parentNameMap={parentNameMap} depth={depth + 1} />
      ))}
    </div>
  );
}

// Small stat chip for summary
function StatChip({ label, value, color }) {
  return (
    <div
      style={{
        padding: '6px 10px',
        background: `${color}12`,
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      <span style={{ fontSize: '14px', fontWeight: 600, color }}>{value}</span>
      <span style={{ fontSize: '11px', color: 'var(--theme-text-muted)' }}>{label}</span>
    </div>
  );
}

// Confidence badge colors
const confidenceColors = {
  high: { bg: 'hsla(150, 60%, 45%, 0.15)', text: 'hsl(150, 60%, 55%)' },
  medium: { bg: 'hsla(40, 70%, 50%, 0.15)', text: 'hsl(40, 70%, 55%)' },
  low: { bg: 'hsla(0, 60%, 50%, 0.15)', text: 'hsl(0, 60%, 55%)' },
};

// Structured synthesis renderer
function StructuredSynthesis({ synthesis }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      {/* Executive Summary */}
      {synthesis.executive_summary && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--theme-accent)', marginBottom: '8px', fontWeight: 600 }}>
            Executive Summary
          </div>
          <div style={{ background: 'var(--theme-bg)', borderRadius: '8px', padding: '16px', border: '1px solid var(--theme-border)' }}>
            {renderMarkdown(synthesis.executive_summary)}
          </div>
        </div>
      )}

      {/* Key Findings */}
      {synthesis.key_findings && synthesis.key_findings.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--theme-accent)', marginBottom: '8px', fontWeight: 600 }}>
            Key Findings ({synthesis.key_findings.length})
          </div>
          {synthesis.key_findings.map((kf, i) => {
            const conf = confidenceColors[kf.confidence] || confidenceColors.medium;
            return (
              <div
                key={i}
                style={{
                  background: 'var(--theme-bg)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  marginBottom: '8px',
                  border: '1px solid var(--theme-border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--theme-text-primary)', flex: 1 }}>
                    {renderMarkdown(kf.finding)}
                  </span>
                  {kf.confidence && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 7px',
                        background: conf.bg,
                        color: conf.text,
                        borderRadius: '8px',
                        textTransform: 'uppercase',
                        flexShrink: 0,
                      }}
                    >
                      {kf.confidence}
                    </span>
                  )}
                </div>
                {kf.sources && kf.sources.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                    {kf.sources.map((src, j) => (
                      <a
                        key={j}
                        href={src}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          background: 'hsla(210, 70%, 50%, 0.1)',
                          color: 'hsl(210, 70%, 60%)',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          maxWidth: '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'inline-block',
                        }}
                      >
                        {src.length > 40 ? src.slice(0, 37) + '...' : src}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Analysis */}
      {synthesis.detailed_analysis && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--theme-accent)', marginBottom: '8px', fontWeight: 600 }}>
            Detailed Analysis
          </div>
          <div style={{ background: 'var(--theme-bg)', borderRadius: '8px', padding: '16px', border: '1px solid var(--theme-border)' }}>
            {renderMarkdown(synthesis.detailed_analysis)}
          </div>
        </div>
      )}

      {/* Methodology */}
      {synthesis.methodology && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--theme-text-muted)', marginBottom: '8px', fontWeight: 600 }}>
            Methodology
          </div>
          <div style={{ background: 'var(--theme-bg)', borderRadius: '8px', padding: '12px 14px', border: '1px solid var(--theme-border)', fontSize: '12px', color: 'var(--theme-text-secondary)', lineHeight: 1.6 }}>
            {renderMarkdown(synthesis.methodology)}
          </div>
        </div>
      )}

      {/* Synthesis Sources */}
      {synthesis.sources && synthesis.sources.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--theme-text-muted)', marginBottom: '8px', fontWeight: 600 }}>
            Cited Sources ({synthesis.sources.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {synthesis.sources.map((src, i) => (
              <a
                key={i}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '12px',
                  color: 'var(--theme-accent)',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <ExternalLink size={11} style={{ flexShrink: 0 }} />
                {src.title || src.url}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Export menu item
function ExportOption({ label, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '10px 14px',
        background: 'transparent',
        border: 'none',
        borderBottom: '1px solid var(--theme-border)',
        color: 'var(--theme-text-secondary)',
        fontSize: '12px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        textAlign: 'left',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--theme-bg)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {label}
      <span style={{ fontSize: '10px', color: 'var(--theme-text-muted)', textTransform: 'uppercase' }}>{sub}</span>
    </button>
  );
}
