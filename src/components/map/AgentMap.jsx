// AgentMap — The Living Map
// Force-directed topology with luminous orbs, semantic zoom, spatial events
// SVG-only rendering with organic edges, ripples, annotations, and ambient glow

import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useAgentStore } from '../../stores/agentStore';
import { select } from 'd3-selection';
import { zoom, zoomIdentity } from 'd3-zoom';
import {
  createForceSimulation,
  syncSimulation,
  getSimulationLinks,
} from '../../utils/forceLayoutEngine';

import AgentOrb from './AgentOrb';
import OrganicEdge from './OrganicEdge';
import RippleLayer from './RippleLayer';
import AnnotationLayer from './AnnotationLayer';
import AmbientLayer from './AmbientLayer';
import InlineIntervention from './InlineIntervention';
import OrbDetailOverlay from './OrbDetailOverlay';
import MapControls from './MapControls';

export default function AgentMap({
  agents,
  selectedAgentId,
  onSelectAgent,
  onPauseAgent,
  onResumeAgent,
  onDiveAgent,
  onRespondToInput,
  isPaused,
  onTogglePause,
  onReset,
  stats,
  focusedAgentId,
  onFocusAgent,
  onUnfocusAgent,
}) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const simulationRef = useRef(null);
  const nodeMapRef = useRef(new Map());
  const prevAgentCountRef = useRef(0);
  const animFrameRef = useRef(null);

  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [simNodes, setSimNodes] = useState([]);
  const [simLinks, setSimLinks] = useState([]);
  const zoomBehavior = useRef(null);
  const previousTransformRef = useRef(null);

  // Initialize force simulation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const sim = createForceSimulation(rect.width, rect.height);
    simulationRef.current = sim;

    // Throttled state update from simulation tick (~30fps)
    let lastUpdate = 0;
    const THROTTLE_MS = 33; // ~30fps

    sim.on('tick', () => {
      const now = performance.now();
      if (now - lastUpdate < THROTTLE_MS) return;
      lastUpdate = now;

      const nodes = sim.nodes().map((n) => ({ ...n }));
      const links = getSimulationLinks(sim);

      // Use requestAnimationFrame for smooth rendering
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(() => {
        setSimNodes(nodes);
        setSimLinks(links);
      });
    });

    return () => {
      sim.stop();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Sync agents into simulation
  useEffect(() => {
    const sim = simulationRef.current;
    if (!sim) return;

    const newNodeMap = syncSimulation(sim, agents, nodeMapRef.current);
    nodeMapRef.current = newNodeMap;

    // Auto-fit on first agents
    if (prevAgentCountRef.current === 0 && agents.length > 0) {
      setTimeout(() => fitView(), 300);
    }
    prevAgentCountRef.current = agents.length;
  }, [agents]);

  // Initialize zoom
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = select(svgRef.current);

    zoomBehavior.current = zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        setTransform({
          x: event.transform.x,
          y: event.transform.y,
          k: event.transform.k,
        });
      });

    svg.call(zoomBehavior.current);

    return () => {
      svg.on('.zoom', null);
    };
  }, []);

  // Focus on agent for intervention — smooth pan/zoom
  useEffect(() => {
    if (!focusedAgentId) return;

    const node = nodeMapRef.current.get(focusedAgentId);
    if (!node || !svgRef.current || !containerRef.current) return;

    // Save current transform for restoration
    previousTransformRef.current = { ...transform };

    const container = containerRef.current.getBoundingClientRect();
    const targetScale = 1.2;
    const targetX = container.width / 2 - node.x * targetScale;
    const targetY = container.height / 2 - node.y * targetScale;

    const svg = select(svgRef.current);
    svg.transition().duration(600).call(
      zoomBehavior.current.transform,
      zoomIdentity.translate(targetX, targetY).scale(targetScale)
    );
  }, [focusedAgentId]);

  const fitView = useCallback(() => {
    if (!svgRef.current || !containerRef.current) return;

    const nodes = simulationRef.current?.nodes() || [];
    if (nodes.length === 0) return;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    nodes.forEach((n) => {
      const r = n._radius || 30;
      minX = Math.min(minX, n.x - r);
      maxX = Math.max(maxX, n.x + r);
      minY = Math.min(minY, n.y - r);
      maxY = Math.max(maxY, n.y + r);
    });

    const containerRect = containerRef.current.getBoundingClientRect();
    const padding = 80;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    const scale = Math.min(
      containerRect.width / width,
      containerRect.height / height,
      1.5
    ) * 0.85;

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const x = containerRect.width / 2 - cx * scale;
    const y = containerRect.height / 2 - cy * scale;

    const svg = select(svgRef.current);
    svg.transition().duration(500).call(
      zoomBehavior.current.transform,
      zoomIdentity.translate(x, y).scale(scale)
    );
  }, []);

  const handleZoomIn = useCallback(() => {
    const svg = select(svgRef.current);
    svg.transition().duration(300).call(zoomBehavior.current.scaleBy, 1.3);
  }, []);

  const handleZoomOut = useCallback(() => {
    const svg = select(svgRef.current);
    svg.transition().duration(300).call(zoomBehavior.current.scaleBy, 0.7);
  }, []);

  const handleBackgroundClick = useCallback(() => {
    onSelectAgent(null);
    if (focusedAgentId && onUnfocusAgent) {
      // Restore previous transform
      if (previousTransformRef.current && svgRef.current) {
        const prev = previousTransformRef.current;
        const svg = select(svgRef.current);
        svg.transition().duration(400).call(
          zoomBehavior.current.transform,
          zoomIdentity.translate(prev.x, prev.y).scale(prev.k)
        );
      }
      onUnfocusAgent();
    }
  }, [onSelectAgent, focusedAgentId, onUnfocusAgent]);

  // Subscribe to data transfers for edge visualization
  const dataTransfers = useAgentStore((s) => s.dataTransfers);

  // Filter out expired transfers (>3s old)
  const activeTransfers = useMemo(() => {
    const now = Date.now();
    return dataTransfers.filter((t) => now - t.timestamp < 3000);
  }, [dataTransfers]);

  // Compute connected IDs for spotlight effect
  const connectedIds = useMemo(() => {
    if (!selectedAgentId) return null;

    const ids = new Set();
    for (const link of simLinks) {
      const sourceId = link.source?.id || link.source;
      const targetId = link.target?.id || link.target;
      if (sourceId === selectedAgentId) ids.add(targetId);
      if (targetId === selectedAgentId) ids.add(sourceId);
    }
    return ids;
  }, [selectedAgentId, simLinks]);

  // Determine if we should show the detail overlay
  const selectedAgent = selectedAgentId
    ? simNodes.find((n) => n.id === selectedAgentId)
    : null;
  const showDetailOverlay = selectedAgent && transform.k > 1.0 && !selectedAgent.pendingInput && !selectedAgent.pending_input;

  // Determine the waiting agent for inline intervention
  const waitingAgent = focusedAgentId
    ? simNodes.find((n) => n.id === focusedAgentId && (n.pendingInput || n.pending_input))
    : null;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background: 'var(--theme-bg)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <svg
        ref={svgRef}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          cursor: 'grab',
        }}
        onClick={handleBackgroundClick}
      >
        <defs>
          {/* Grid pattern */}
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="var(--theme-grid)"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>

        {/* Grid background */}
        <rect
          x="-10000"
          y="-10000"
          width="20000"
          height="20000"
          fill="url(#grid)"
          transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}
        />

        {/* Main transform group — all world-space elements */}
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>

          {/* Ambient glow layer (behind everything) */}
          <AmbientLayer agents={simNodes} />

          {/* Edges */}
          {simLinks.map((link) => {
            const sourceNode = link.source;
            const targetNode = link.target;
            if (!sourceNode?.x || !targetNode?.x) return null;

            const isHighlighted = selectedAgentId &&
              (sourceNode.id === selectedAgentId || targetNode.id === selectedAgentId);
            const isActive = sourceNode.status === 'working' && targetNode.status === 'working';

            // Match active data transfers to this edge
            const edgeFlows = activeTransfers.filter((t) =>
              (t.sourceId === sourceNode.id && t.targetId === targetNode.id) ||
              (t.sourceId === targetNode.id && t.targetId === sourceNode.id)
            );

            return (
              <OrganicEdge
                key={`${sourceNode.id}-${targetNode.id}`}
                source={sourceNode}
                target={targetNode}
                isHighlighted={isHighlighted}
                isActive={isActive}
                zoomK={transform.k}
                dataFlows={edgeFlows}
              />
            );
          })}

          {/* Ripples */}
          <RippleLayer nodeMap={nodeMapRef.current} />

          {/* Orbs */}
          {simNodes.map((node) => (
            <AgentOrb
              key={node.id}
              agent={node}
              isSelected={selectedAgentId === node.id}
              selectedAgentId={selectedAgentId}
              connectedIds={connectedIds}
              zoomK={transform.k}
              onSelect={onSelectAgent}
            />
          ))}

          {/* Annotations */}
          <AnnotationLayer nodeMap={nodeMapRef.current} zoomK={transform.k} />

          {/* Detail overlay (close zoom + selected) */}
          {showDetailOverlay && (
            <OrbDetailOverlay
              agent={selectedAgent}
              onPause={onPauseAgent}
              onResume={onResumeAgent}
              onDive={onDiveAgent}
              onClose={() => onSelectAgent(null)}
            />
          )}

          {/* Inline intervention */}
          {waitingAgent && (
            <InlineIntervention
              agent={waitingAgent}
              onRespond={onRespondToInput}
              x={waitingAgent.x}
              y={waitingAgent.y}
              radius={waitingAgent._radius}
            />
          )}
        </g>
      </svg>

      {/* Map controls (HTML overlay) */}
      <MapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={fitView}
        onReset={onReset}
        isPaused={isPaused}
        onTogglePause={onTogglePause}
        stats={stats}
      />

      {/* Empty state */}
      {simNodes.length === 0 && agents.length === 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: 'var(--theme-text-muted)',
          }}
        >
          <p style={{ fontSize: '18px', marginBottom: '8px' }}>No agents running</p>
          <p style={{ fontSize: '14px' }}>Agents will appear here as they spawn</p>
        </div>
      )}
    </div>
  );
}
