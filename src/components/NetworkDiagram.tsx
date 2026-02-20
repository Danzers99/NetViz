/**
 * NetworkDiagram.tsx
 *
 * Full-screen modal overlay rendering a read-only 2D SVG network diagram.
 * Pan (drag), zoom (scroll), hover tooltips, Export PNG.
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { useAppStore } from '../store';
import { buildNetworkGraph, type GraphNode } from '../utils/graphLayout';
import { getDeviceDefinition } from '../data/deviceDefinitions';

// ─── Constants ──────────────────────────────────────────────

const NODE_RADIUS = 22;

const CATEGORY_COLORS: Record<string, { fill: string; stroke: string; icon: string }> = {
    infra: { fill: '#3b82f6', stroke: '#2563eb', icon: '🔗' },  // blue
    pos: { fill: '#10b981', stroke: '#059669', icon: '🖥' },  // green
    printer: { fill: '#f59e0b', stroke: '#d97706', icon: '🖨' },  // amber
    wireless: { fill: '#8b5cf6', stroke: '#7c3aed', icon: '📶' },  // purple
    power: { fill: '#6b7280', stroke: '#4b5563', icon: '⚡' },  // gray
};

const STATUS_COLORS: Record<string, string> = {
    online: '#22c55e',
    offline: '#ef4444',
    booting: '#f59e0b',
    error: '#ef4444',
};

// ─── Helper: Device icon SVG label ──────────────────────────

function deviceIcon(type: string): string {
    const def = getDeviceDefinition(type as any);
    const cap = def.capabilities;
    if (cap.isModem) return '📡';
    if (cap.isRouter) return '🔀';
    if (cap.isSwitch) return '🔗';
    if (cap.isAP) return '📶';
    if (cap.isPoEInjector) return '⚡';
    if (cap.isMobile) return '📱';
    if (def.category === 'printer') return '🖨';
    if (def.category === 'pos') return '🖥';
    return '📦';
}

// ─── Tooltip ────────────────────────────────────────────────

interface TooltipData {
    node: GraphNode;
    x: number;
    y: number;
}

const Tooltip = ({ data }: { data: TooltipData }) => {
    const def = getDeviceDefinition(data.node.type as any);
    return (
        <div
            className="fixed z-[100] pointer-events-none px-3 py-2 rounded-lg shadow-xl text-sm max-w-xs"
            style={{
                left: data.x + 16,
                top: data.y - 8,
                backgroundColor: 'var(--tooltip-bg)',
                color: 'var(--tooltip-fg)',
                border: '1px solid var(--tooltip-border)',
            }}
        >
            <div className="font-semibold">{data.node.label}</div>
            <div className="text-xs opacity-75">{def.displayName}</div>
            {data.node.ip && <div className="text-xs mt-1">IP: {data.node.ip}</div>}
            {data.node.room && <div className="text-xs">Room: {data.node.room}</div>}
            <div className="text-xs mt-1 flex items-center gap-1">
                <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[data.node.status] || '#6b7280' }}
                />
                {data.node.status}
                {data.node.connectionState && data.node.connectionState !== 'online' &&
                    ` (${data.node.connectionState.replace(/_/g, ' ')})`
                }
            </div>
        </div>
    );
};

// ─── Main Component ─────────────────────────────────────────

interface NetworkDiagramProps {
    onClose: () => void;
}

export const NetworkDiagram = ({ onClose }: NetworkDiagramProps) => {
    const devices = useAppStore(s => s.devices);
    const rooms = useAppStore(s => s.rooms);
    const darkMode = useAppStore(s => s.settings.darkMode);
    const projectName = useAppStore(s => s.projectInfo.name);

    const graph = useMemo(() => buildNetworkGraph(devices, rooms), [devices, rooms]);

    // Pan / Zoom state
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
    const [isPanning, setIsPanning] = useState(false);
    const panStart = useRef({ x: 0, y: 0 });
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Tooltip
    const [tooltip, setTooltip] = useState<TooltipData | null>(null);

    // Center the graph on mount
    useEffect(() => {
        if (!containerRef.current || graph.nodes.length === 0) return;
        const rect = containerRef.current.getBoundingClientRect();
        const scaleX = rect.width / graph.width;
        const scaleY = rect.height / graph.height;
        const scale = Math.min(scaleX, scaleY, 1.5) * 0.85; // don't over-zoom
        const x = (rect.width - graph.width * scale) / 2;
        const y = (rect.height - graph.height * scale) / 2;
        setTransform({ x, y, scale });
    }, [graph]);

    // ── Pan handlers ──
    const onMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;
        setIsPanning(true);
        panStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
    }, [transform.x, transform.y]);

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isPanning) return;
        setTransform(prev => ({
            ...prev,
            x: e.clientX - panStart.current.x,
            y: e.clientY - panStart.current.y,
        }));
    }, [isPanning]);

    const onMouseUp = useCallback(() => setIsPanning(false), []);

    // ── Zoom handlers ──
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setTransform(prev => {
            const newScale = Math.min(Math.max(prev.scale * delta, 0.2), 4);
            // Zoom toward mouse position
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return { ...prev, scale: newScale };
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const newX = mx - (mx - prev.x) * (newScale / prev.scale);
            const newY = my - (my - prev.y) * (newScale / prev.scale);
            return { x: newX, y: newY, scale: newScale };
        });
    }, []);

    const zoomIn = () => setTransform(prev => ({ ...prev, scale: Math.min(prev.scale * 1.25, 4) }));
    const zoomOut = () => setTransform(prev => ({ ...prev, scale: Math.max(prev.scale * 0.8, 0.2) }));

    // ── Export PNG ──
    const exportPNG = useCallback(() => {
        if (!svgRef.current) return;
        const svgEl = svgRef.current;
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgEl);

        // Build a canvas at 2x for retina
        const canvas = document.createElement('canvas');
        const scaleFactor = 2;
        canvas.width = graph.width * scaleFactor;
        canvas.height = graph.height * scaleFactor;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            ctx.fillStyle = darkMode ? '#0f172a' : '#f8fafc';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);

            const pngUrl = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            const name = projectName || 'network';
            a.download = `NetViz_Diagram_${name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
            a.href = pngUrl;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };
        img.src = url;
    }, [graph.width, graph.height, darkMode, projectName]);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    // CSS variables for theming tooltip
    const cssVars = darkMode
        ? { '--tooltip-bg': '#1e293b', '--tooltip-fg': '#e2e8f0', '--tooltip-border': '#334155' } as React.CSSProperties
        : { '--tooltip-bg': '#ffffff', '--tooltip-fg': '#1e293b', '--tooltip-border': '#e2e8f0' } as React.CSSProperties;

    const bgColor = darkMode ? '#0f172a' : '#f8fafc';
    const edgeColor = darkMode ? '#475569' : '#94a3b8';
    const edgeLabelColor = darkMode ? '#94a3b8' : '#64748b';
    const labelColor = darkMode ? '#e2e8f0' : '#1e293b';

    return (
        <div
            className="fixed inset-0 z-[90] flex flex-col"
            style={{ backgroundColor: bgColor, ...cssVars }}
        >
            {/* ── Header ── */}
            <div
                className="flex items-center justify-between px-5 py-3 border-b shrink-0"
                style={{ borderColor: darkMode ? '#334155' : '#e2e8f0' }}
            >
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-orange-500 rounded-md flex items-center justify-center text-white text-xs font-bold">
                        N
                    </div>
                    <h2 className="font-semibold text-base" style={{ color: labelColor }}>
                        Network Diagram
                    </h2>
                    {graph.nodes.length > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{
                            backgroundColor: darkMode ? '#1e293b' : '#f1f5f9',
                            color: edgeLabelColor,
                        }}>
                            {graph.nodes.length} devices · {graph.edges.length} links
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={exportPNG}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg font-medium transition-colors"
                        style={{
                            backgroundColor: darkMode ? '#1e293b' : '#f1f5f9',
                            color: darkMode ? '#e2e8f0' : '#334155',
                        }}
                        title="Export as PNG"
                    >
                        <Download size={15} />
                        <span className="hidden sm:inline">Export PNG</span>
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                        title="Close (Esc)"
                    >
                        <X size={20} style={{ color: labelColor }} />
                    </button>
                </div>
            </div>

            {/* ── Diagram area ── */}
            <div
                ref={containerRef}
                className="flex-1 overflow-hidden relative"
                style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                onWheel={handleWheel}
            >
                {graph.nodes.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-sm opacity-50" style={{ color: labelColor }}>
                            No devices in network. Add devices in the sandbox to see the diagram.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Visible interactive SVG (with transforms) */}
                        <svg
                            className="absolute inset-0 w-full h-full"
                            style={{ userSelect: 'none' }}
                        >
                            <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
                                {/* Edges */}
                                {graph.edges.map((edge, i) => {
                                    const src = graph.nodes.find(n => n.id === edge.sourceId);
                                    const dst = graph.nodes.find(n => n.id === edge.targetId);
                                    if (!src || !dst) return null;
                                    const midX = (src.x + dst.x) / 2;
                                    const midY = (src.y + dst.y) / 2;
                                    return (
                                        <g key={`edge-${i}`}>
                                            <line
                                                x1={src.x} y1={src.y}
                                                x2={dst.x} y2={dst.y}
                                                stroke={edgeColor}
                                                strokeWidth={2}
                                            />
                                            {/* Port labels on the edge */}
                                            <text
                                                x={midX}
                                                y={midY - 6}
                                                textAnchor="middle"
                                                fontSize={9}
                                                fill={edgeLabelColor}
                                                style={{ pointerEvents: 'none' }}
                                            >
                                                {edge.sourcePort} → {edge.targetPort}
                                            </text>
                                        </g>
                                    );
                                })}

                                {/* Nodes */}
                                {graph.nodes.map(node => {
                                    const colors = CATEGORY_COLORS[node.category] || CATEGORY_COLORS.infra;
                                    const statusColor = STATUS_COLORS[node.status] || '#6b7280';
                                    const icon = deviceIcon(node.type);
                                    return (
                                        <g
                                            key={node.id}
                                            onMouseEnter={(e) => {
                                                setTooltip({ node, x: e.clientX, y: e.clientY });
                                            }}
                                            onMouseMove={(e) => {
                                                setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
                                            }}
                                            onMouseLeave={() => setTooltip(null)}
                                            style={{ cursor: 'default' }}
                                        >
                                            {/* Node circle */}
                                            <circle
                                                cx={node.x}
                                                cy={node.y}
                                                r={NODE_RADIUS}
                                                fill={colors.fill}
                                                stroke={colors.stroke}
                                                strokeWidth={2.5}
                                                opacity={0.95}
                                            />
                                            {/* Icon */}
                                            <text
                                                x={node.x}
                                                y={node.y + 1}
                                                textAnchor="middle"
                                                dominantBaseline="central"
                                                fontSize={16}
                                                style={{ pointerEvents: 'none' }}
                                            >
                                                {icon}
                                            </text>
                                            {/* Status dot */}
                                            <circle
                                                cx={node.x + NODE_RADIUS - 4}
                                                cy={node.y - NODE_RADIUS + 4}
                                                r={5}
                                                fill={statusColor}
                                                stroke={bgColor}
                                                strokeWidth={2}
                                            />
                                            {/* Label */}
                                            <text
                                                x={node.x}
                                                y={node.y + NODE_RADIUS + 14}
                                                textAnchor="middle"
                                                fontSize={11}
                                                fontWeight={500}
                                                fill={labelColor}
                                                style={{ pointerEvents: 'none' }}
                                            >
                                                {node.label}
                                            </text>
                                        </g>
                                    );
                                })}
                            </g>
                        </svg>

                        {/* Hidden export SVG — wrapper hides it; SVG itself has NO inline
                            styles so XMLSerializer produces a clean, self-contained SVG document */}
                        <div style={{ position: 'absolute', left: -99999, top: -99999, width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                            <svg
                                ref={svgRef}
                                width={graph.width}
                                height={graph.height}
                                viewBox={`0 0 ${graph.width} ${graph.height}`}
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <rect width={graph.width} height={graph.height} fill={bgColor} />
                                {/* Edges */}
                                {graph.edges.map((edge, i) => {
                                    const src = graph.nodes.find(n => n.id === edge.sourceId);
                                    const dst = graph.nodes.find(n => n.id === edge.targetId);
                                    if (!src || !dst) return null;
                                    const midX = (src.x + dst.x) / 2;
                                    const midY = (src.y + dst.y) / 2;
                                    return (
                                        <g key={`exp-edge-${i}`}>
                                            <line
                                                x1={src.x} y1={src.y}
                                                x2={dst.x} y2={dst.y}
                                                stroke={edgeColor}
                                                strokeWidth={2}
                                            />
                                            <text
                                                x={midX}
                                                y={midY - 6}
                                                textAnchor="middle"
                                                fontSize={9}
                                                fill={edgeLabelColor}
                                            >
                                                {edge.sourcePort} → {edge.targetPort}
                                            </text>
                                        </g>
                                    );
                                })}
                                {/* Nodes */}
                                {graph.nodes.map(node => {
                                    const colors = CATEGORY_COLORS[node.category] || CATEGORY_COLORS.infra;
                                    const statusColor = STATUS_COLORS[node.status] || '#6b7280';
                                    return (
                                        <g key={`exp-${node.id}`}>
                                            <circle
                                                cx={node.x}
                                                cy={node.y}
                                                r={NODE_RADIUS}
                                                fill={colors.fill}
                                                stroke={colors.stroke}
                                                strokeWidth={2.5}
                                                opacity={0.95}
                                            />
                                            {/* Status dot */}
                                            <circle
                                                cx={node.x + NODE_RADIUS - 4}
                                                cy={node.y - NODE_RADIUS + 4}
                                                r={5}
                                                fill={statusColor}
                                                stroke={bgColor}
                                                strokeWidth={2}
                                            />
                                            {/* Label below */}
                                            <text
                                                x={node.x}
                                                y={node.y + NODE_RADIUS + 14}
                                                textAnchor="middle"
                                                fontSize={11}
                                                fontWeight="500"
                                                fill={labelColor}
                                            >
                                                {node.label}
                                            </text>
                                            {/* Display name inside circle (for export, since emoji doesn't render) */}
                                            <text
                                                x={node.x}
                                                y={node.y + 1}
                                                textAnchor="middle"
                                                dominantBaseline="central"
                                                fontSize={8}
                                                fontWeight="600"
                                                fill="#ffffff"
                                            >
                                                {getDeviceDefinition(node.type as any).displayName.split(' ').map(w => w[0]).join('')}
                                            </text>
                                        </g>
                                    );
                                })}
                                {/* Watermark */}
                                <text
                                    x={graph.width - 10}
                                    y={graph.height - 10}
                                    textAnchor="end"
                                    fontSize={10}
                                    fill={edgeLabelColor}
                                    opacity={0.5}
                                >
                                    Generated by NetViz
                                </text>
                            </svg>
                        </div>
                    </>
                )}

                {/* Zoom controls */}
                <div
                    className="absolute bottom-4 right-4 flex flex-col gap-1"
                    style={{ zIndex: 10 }}
                >
                    <button
                        onClick={zoomIn}
                        className="p-2 rounded-lg shadow-md transition-colors"
                        style={{
                            backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                            color: labelColor,
                            border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                        }}
                        title="Zoom in"
                    >
                        <ZoomIn size={16} />
                    </button>
                    <button
                        onClick={zoomOut}
                        className="p-2 rounded-lg shadow-md transition-colors"
                        style={{
                            backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                            color: labelColor,
                            border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                        }}
                        title="Zoom out"
                    >
                        <ZoomOut size={16} />
                    </button>
                </div>

                {/* Hint text */}
                {graph.nodes.length > 0 && (
                    <div
                        className="absolute bottom-4 left-4 text-xs px-2 py-1 rounded"
                        style={{
                            backgroundColor: darkMode ? '#1e293b80' : '#f1f5f980',
                            color: edgeLabelColor,
                        }}
                    >
                        Drag to pan · Scroll to zoom · Hover for details
                    </div>
                )}
            </div>

            {/* Tooltip */}
            {tooltip && <Tooltip data={tooltip} />}
        </div>
    );
};
