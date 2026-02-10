import { useRef, useEffect, useCallback, useState } from 'react';
import { select } from 'd3-selection';
import { zoom, zoomIdentity } from 'd3-zoom';
import AgentNode from './AgentNode';
import AgentEdge from './AgentEdge';
import MapControls from './MapControls';
import { calculateLayout, calculateBounds } from '../../utils/layoutEngine';
import { mapColors } from '../../utils/colorScheme';

export default function AgentMap({
  agents,
  selectedAgentId,
  onSelectAgent,
  onPauseAgent,
  onResumeAgent,
  onDiveAgent,
  isPaused,
  onTogglePause,
  onReset,
  stats,
}) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const zoomBehavior = useRef(null);

  // Calculate layout
  const { nodes, edges } = calculateLayout(agents);

  // Initialize zoom behavior
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

    // Initial fit
    if (nodes.length > 0) {
      fitView();
    }

    return () => {
      svg.on('.zoom', null);
    };
  }, []);

  // Fit view when agents change significantly
  useEffect(() => {
    if (nodes.length > 0 && nodes.length <= 3) {
      fitView();
    }
  }, [nodes.length]);

  const fitView = useCallback(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

    const bounds = calculateBounds(nodes);
    const containerRect = containerRef.current.getBoundingClientRect();

    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;

    const scale = Math.min(
      containerRect.width / width,
      containerRect.height / height,
      1
    ) * 0.85;

    const x = containerRect.width / 2 - (bounds.minX + width / 2) * scale;
    const y = containerRect.height / 2 - (bounds.minY + height / 2) * scale;

    const svg = select(svgRef.current);
    svg.transition().duration(500).call(
      zoomBehavior.current.transform,
      zoomIdentity.translate(x, y).scale(scale)
    );
  }, [nodes]);

  const handleZoomIn = useCallback(() => {
    const svg = select(svgRef.current);
    svg.transition().duration(300).call(zoomBehavior.current.scaleBy, 1.3);
  }, []);

  const handleZoomOut = useCallback(() => {
    const svg = select(svgRef.current);
    svg.transition().duration(300).call(zoomBehavior.current.scaleBy, 0.7);
  }, []);

  // Get highlighted edges (connected to selected agent)
  const highlightedEdges = new Set();
  if (selectedAgentId) {
    edges.forEach((edge) => {
      if (edge.sourceId === selectedAgentId || edge.targetId === selectedAgentId) {
        highlightedEdges.add(edge.id);
      }
    });
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background: mapColors.background,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* SVG layer for edges */}
      <svg
        ref={svgRef}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          cursor: 'grab',
        }}
      >
        <defs>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke={mapColors.gridLine}
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

        {/* Edges */}
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          {edges.map((edge) => (
            <AgentEdge
              key={edge.id}
              edge={edge}
              isHighlighted={highlightedEdges.has(edge.id)}
            />
          ))}
        </g>
      </svg>

      {/* HTML layer for nodes */}
      <div
        style={{
          position: 'absolute',
          transformOrigin: '0 0',
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
          pointerEvents: 'none',
        }}
      >
        {nodes.map((node) => (
          <div key={node.id} style={{ pointerEvents: 'auto' }}>
            <AgentNode
              agent={node}
              isSelected={selectedAgentId === node.id}
              onSelect={onSelectAgent}
              onPause={onPauseAgent}
              onResume={onResumeAgent}
              onDive={onDiveAgent}
            />
          </div>
        ))}
      </div>

      {/* Controls */}
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
      {nodes.length === 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: mapColors.textMuted,
          }}
        >
          <p style={{ fontSize: '18px', marginBottom: '8px' }}>No agents running</p>
          <p style={{ fontSize: '14px' }}>Agents will appear here as they spawn</p>
        </div>
      )}
    </div>
  );
}
