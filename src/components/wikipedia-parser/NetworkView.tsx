"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { WikiNetworkNode, WikiNetworkResult } from "@/lib/wikipedia/network-types";

type PositionedNode = WikiNetworkNode & {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
};

type DragState = {
  id: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  moved: boolean;
};

const GRAPH_WIDTH = 920;
const GRAPH_HEIGHT = 520;
const CENTER_X = GRAPH_WIDTH / 2;
const CENTER_Y = GRAPH_HEIGHT / 2;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function nodeColor(type: WikiNetworkNode["type"]): string {
  if (type === "person") return "#16a34a";
  if (type === "place") return "#2563eb";
  return "#64748b";
}

function nodeBorder(type: WikiNetworkNode["type"]): string {
  if (type === "person") return "#166534";
  if (type === "place") return "#1d4ed8";
  return "#334155";
}

function edgeColor(relation: string): string {
  if (relation === "персона") return "#22c55e";
  if (relation === "место") return "#3b82f6";
  return "#94a3b8";
}

function truncateLabel(value: string, max = 22): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function splitByType(nodes: WikiNetworkNode[]) {
  return {
    persons: nodes.filter((node) => node.type === "person"),
    places: nodes.filter((node) => node.type === "place"),
    articles: nodes.filter((node) => node.type === "article"),
  };
}

function placeOnRing(
  nodes: WikiNetworkNode[],
  radius: number,
  angleOffset: number,
): PositionedNode[] {
  if (!nodes.length) return [];

  return nodes.map((node, index) => {
    const angle = angleOffset + (index / nodes.length) * Math.PI * 2;
    return {
      ...node,
      x: CENTER_X + Math.cos(angle) * radius,
      y: CENTER_Y + Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
      radius: 12,
    };
  });
}

function buildInitialLayout(network: WikiNetworkResult): PositionedNode[] {
  const rootNode = network.nodes.find((node) => node.isRoot);
  const relatedNodes = network.nodes.filter((node) => !node.isRoot);

  if (!rootNode) return [];

  const root: PositionedNode = {
    ...rootNode,
    x: CENTER_X,
    y: CENTER_Y,
    vx: 0,
    vy: 0,
    radius: 16,
  };

  const { persons, places, articles } = splitByType(relatedNodes);

  return [
    root,
    ...placeOnRing(persons, 130, -Math.PI / 2),
    ...placeOnRing(places, 195, -Math.PI / 3),
    ...placeOnRing(articles, 250, -Math.PI / 6),
  ];
}

function springLengthByRelation(relation: string): number {
  if (relation === "персона") return 125;
  if (relation === "место") return 185;
  return 235;
}

function NetworkGraph({ network }: { network: WikiNetworkResult }) {
  const [nodes, setNodes] = useState<PositionedNode[]>([]);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const nodesRef = useRef<PositionedNode[]>([]);
  const dragRef = useRef<DragState | null>(null);
  const draggedNodeIdRef = useRef<string | null>(null);

  useEffect(() => {
    const initial = buildInitialLayout(network);
    nodesRef.current = initial;
    setNodes(initial);
    setDraggedNodeId(null);
    draggedNodeIdRef.current = null;
    dragRef.current = null;
  }, [network]);

  useEffect(() => {
    let rafId = 0;

    const tick = () => {
      const currentNodes = nodesRef.current;
      const nodeCount = currentNodes.length;
      if (!nodeCount) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const fx = new Array<number>(nodeCount).fill(0);
      const fy = new Array<number>(nodeCount).fill(0);
      const nodeIndex = new Map<string, number>();

      currentNodes.forEach((node, index) => nodeIndex.set(node.id, index));

      // Отталкивание узлов друг от друга.
      for (let i = 0; i < nodeCount; i++) {
        for (let j = i + 1; j < nodeCount; j++) {
          const a = currentNodes[i];
          const b = currentNodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist2 = Math.max(dx * dx + dy * dy, 36);
          const dist = Math.sqrt(dist2);
          const force = 1400 / dist2;
          const fxValue = (dx / dist) * force;
          const fyValue = (dy / dist) * force;

          fx[i] -= fxValue;
          fy[i] -= fyValue;
          fx[j] += fxValue;
          fy[j] += fyValue;
        }
      }

      // Пружины по рёбрам графа.
      network.edges.forEach((edge) => {
        const fromIndex = nodeIndex.get(edge.from);
        const toIndex = nodeIndex.get(edge.to);
        if (fromIndex === undefined || toIndex === undefined) return;

        const fromNode = currentNodes[fromIndex];
        const toNode = currentNodes[toIndex];

        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const targetLength = springLengthByRelation(edge.relation);
        const stretch = dist - targetLength;
        const force = stretch * 0.012;

        const fxValue = (dx / dist) * force;
        const fyValue = (dy / dist) * force;

        fx[fromIndex] += fxValue;
        fy[fromIndex] += fyValue;
        fx[toIndex] -= fxValue;
        fy[toIndex] -= fyValue;
      });

      // Центрирование.
      currentNodes.forEach((node, index) => {
        const strength = node.isRoot ? 0.09 : 0.0032;
        fx[index] += (CENTER_X - node.x) * strength;
        fy[index] += (CENTER_Y - node.y) * strength;
      });

      currentNodes.forEach((node, index) => {
        const isDragged = draggedNodeIdRef.current === node.id;
        if (isDragged) {
          node.vx = 0;
          node.vy = 0;
          return;
        }

        node.vx = (node.vx + fx[index]) * 0.87;
        node.vy = (node.vy + fy[index]) * 0.87;
        node.x += node.vx;
        node.y += node.vy;

        const margin = node.radius + 14;
        node.x = clamp(node.x, margin, GRAPH_WIDTH - margin);
        node.y = clamp(node.y, margin, GRAPH_HEIGHT - margin);
      });

      setNodes(currentNodes.map((node) => ({ ...node })));
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [network]);

  const nodeMap = useMemo(() => {
    return new Map(nodes.map((node) => [node.id, node]));
  }, [nodes]);

  const getSvgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;

    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    return {
      x: ((clientX - rect.left) / rect.width) * GRAPH_WIDTH,
      y: ((clientY - rect.top) / rect.height) * GRAPH_HEIGHT,
    };
  }, []);

  const moveDraggedNode = useCallback((clientX: number, clientY: number) => {
    const draggedId = draggedNodeIdRef.current;
    if (!draggedId) return;

    const point = getSvgPoint(clientX, clientY);
    if (!point) return;

    const currentNodes = nodesRef.current;
    const node = currentNodes.find((item) => item.id === draggedId);
    if (!node) return;

    const margin = node.radius + 14;
    node.x = clamp(point.x, margin, GRAPH_WIDTH - margin);
    node.y = clamp(point.y, margin, GRAPH_HEIGHT - margin);
    node.vx = 0;
    node.vy = 0;

    setNodes(currentNodes.map((item) => ({ ...item })));
  }, [getSvgPoint]);

  const handleNodePointerDown = useCallback((
    event: ReactPointerEvent<SVGCircleElement>,
    nodeId: string,
  ) => {
    event.preventDefault();

    const dragState: DragState = {
      id: nodeId,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      moved: false,
    };

    dragRef.current = dragState;
    draggedNodeIdRef.current = nodeId;
    setDraggedNodeId(nodeId);

    svgRef.current?.setPointerCapture(event.pointerId);
    moveDraggedNode(event.clientX, event.clientY);
  }, [moveDraggedNode]);

  const handleSvgPointerMove = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    const dragState = dragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const movedDistance =
      Math.abs(event.clientX - dragState.startClientX) +
      Math.abs(event.clientY - dragState.startClientY);
    if (movedDistance > 4) {
      dragState.moved = true;
    }

    moveDraggedNode(event.clientX, event.clientY);
  }, [moveDraggedNode]);

  const clearDragState = useCallback((pointerId: number) => {
    const dragState = dragRef.current;
    if (!dragState || dragState.pointerId !== pointerId) return;

    if (!dragState.moved) {
      const node = nodesRef.current.find((item) => item.id === dragState.id);
      if (node) {
        window.open(node.sourceUrl, "_blank", "noopener,noreferrer");
      }
    }

    dragRef.current = null;
    draggedNodeIdRef.current = null;
    setDraggedNodeId(null);

    if (svgRef.current?.hasPointerCapture(pointerId)) {
      svgRef.current.releasePointerCapture(pointerId);
    }
  }, []);

  const handleSvgPointerUp = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    clearDragState(event.pointerId);
  }, [clearDragState]);

  const handleSvgPointerCancel = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    clearDragState(event.pointerId);
  }, [clearDragState]);

  return (
    <div className="network-graph-card">
      <div className="network-graph-header">
        <h3>Граф связей</h3>
        <div className="network-legend">
          <span className="legend-item">
            <i className="legend-dot person" />
            Персоны
          </span>
          <span className="legend-item">
            <i className="legend-dot place" />
            Места
          </span>
          <span className="legend-item">
            <i className="legend-dot article" />
            Статьи
          </span>
        </div>
      </div>

      <div className="network-graph-wrapper">
        <svg
          ref={svgRef}
          className="network-graph"
          viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
          role="img"
          aria-label="Граф связей статьи"
          onPointerMove={handleSvgPointerMove}
          onPointerUp={handleSvgPointerUp}
          onPointerCancel={handleSvgPointerCancel}
        >
          {network.edges.map((edge) => {
            const from = nodeMap.get(edge.from);
            const to = nodeMap.get(edge.to);
            if (!from || !to) return null;

            return (
              <line
                key={`${edge.from}-${edge.to}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={edgeColor(edge.relation)}
                strokeWidth={1.5}
                strokeOpacity={0.75}
              />
            );
          })}

          {nodes.map((node) => (
            <g key={node.id} transform={`translate(${node.x} ${node.y})`}>
              <circle
                r={node.radius}
                fill={nodeColor(node.type)}
                stroke={nodeBorder(node.type)}
                strokeWidth={2}
                className={`network-graph-node ${draggedNodeId === node.id ? "dragging" : ""}`}
                onPointerDown={(event) => handleNodePointerDown(event, node.id)}
              />
              <text x={0} y={node.radius + 14} textAnchor="middle" className="network-graph-label">
                {truncateLabel(node.title)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function NetworkGroup({
  title,
  nodes,
}: {
  title: string;
  nodes: WikiNetworkNode[];
}) {
  if (!nodes.length) return null;

  return (
    <div className="network-group">
      <h3>
        {title} ({nodes.length})
      </h3>
      <div className="network-nodes">
        {nodes.map((node) => (
          <a
            key={node.id}
            className="network-node"
            href={node.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="network-node-title">{node.title}</div>
            {node.description ? (
              <div className="network-node-description">{node.description}</div>
            ) : null}
            {node.coordinates ? (
              <div className="network-node-coords">
                {node.coordinates.lat.toFixed(4)}, {node.coordinates.lng.toFixed(4)}
              </div>
            ) : null}
          </a>
        ))}
      </div>
    </div>
  );
}

function NetworkView({
  network,
  loading,
  error,
  onRetry,
}: {
  network: WikiNetworkResult | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (loading) {
    return <div className="network-state">Строим сеть связей…</div>;
  }

  if (error) {
    return (
      <div className="network-state">
        <div className="network-error">Ошибка: {error}</div>
        <button className="btn btn-secondary" onClick={onRetry}>
          Повторить
        </button>
      </div>
    );
  }

  if (!network) {
    return <div className="network-state">Сеть пока не загружена.</div>;
  }

  const rootNode = network.nodes.find((node) => node.isRoot);
  const relatedNodes = network.nodes.filter((node) => !node.isRoot);

  const persons = relatedNodes.filter((node) => node.type === "person");
  const places = relatedNodes.filter((node) => node.type === "place");
  const articles = relatedNodes.filter((node) => node.type === "article");

  return (
    <div className="network-view">
      <div className="network-stats">
        <div className="network-stat">
          <span>Узлов</span>
          <strong>{network.nodes.length}</strong>
        </div>
        <div className="network-stat">
          <span>Связей</span>
          <strong>{network.edges.length}</strong>
        </div>
        <div className="network-stat">
          <span>Язык</span>
          <strong>{network.lang.toUpperCase()}</strong>
        </div>
      </div>

      {rootNode ? (
        <div className="network-root">
          <div className="network-root-label">Корневая статья</div>
          <a href={rootNode.sourceUrl} target="_blank" rel="noopener noreferrer">
            {rootNode.title}
          </a>
        </div>
      ) : null}

      <NetworkGraph network={network} />

      <NetworkGroup title="Персоны" nodes={persons} />
      <NetworkGroup title="Места" nodes={places} />
      <NetworkGroup title="Прочие статьи" nodes={articles} />
    </div>
  );
}

export { NetworkView };
