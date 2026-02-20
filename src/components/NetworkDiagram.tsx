/**
 * NetworkDiagram.tsx
 *
 * Full-screen modal overlay rendering a 2D SVG network diagram.
 * Features: pan/zoom, hover tooltips, select, drag-move, Shift+Click connect, Export PNG.
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { X, Download, ZoomIn, ZoomOut, Link2 } from 'lucide-react';
import { useAppStore } from '../store';
import { buildNetworkGraph, findAutoConnectPorts, type GraphNode } from '../utils/graphLayout';
import { getDeviceDefinition } from '../data/deviceDefinitions';

// ─── Constants ──────────────────────────────────────────────

const NODE_RADIUS = 22;

const CATEGORY_COLORS: Record<string, { fill: string; stroke: string }> = {
    infra: { fill: '#3b82f6', stroke: '#2563eb' },
    pos: { fill: '#10b981', stroke: '#059669' },
    printer: { fill: '#f59e0b', stroke: '#d97706' },
    wireless: { fill: '#8b5cf6', stroke: '#7c3aed' },
    power: { fill: '#6b7280', stroke: '#4b5563' },
};

// ─── Effective Status (unified dot + tooltip) ───────────────

interface EffectiveStatus {
    color: string;
    label: string;
}

function getEffectiveStatus(node: GraphNode): EffectiveStatus {
    // If device is not powered on, that takes priority
    if (node.status === 'offline') return { color: '#6b7280', label: 'offline' };
    if (node.status === 'booting') return { color: '#f59e0b', label: 'booting' };
    if (node.status === 'error') return { color: '#ef4444', label: 'error' };

    // Device is powered (status === 'online') — use connectionState
    switch (node.connectionState) {
        case 'online':
            return { color: '#22c55e', label: 'online' };
        case 'associated_no_internet':
            return { color: '#f59e0b', label: 'no internet' };
        case 'associated_no_ip':
            return { color: '#f59e0b', label: 'no IP' };
        case 'associating_wifi':
            return { color: '#f59e0b', label: 'associating' };
        case 'auth_failed':
            return { color: '#ef4444', label: 'auth failed' };
        case 'disconnected':
            return { color: '#ef4444', label: 'disconnected' };
        default:
            // connectionState undefined (infra devices like routers/switches)
            // If powered on, they're active
            return { color: '#22c55e', label: 'online' };
    }
}

// ─── Helper: Device icon ────────────────────────────────────

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
    const eff = getEffectiveStatus(data.node);
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
                    style={{ backgroundColor: eff.color }}
                />
                {eff.label}
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

    // Pan / Zoom
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
    const [isPanning, setIsPanning] = useState(false);
    const panStart = useRef({ x: 0, y: 0 });
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Tooltip
    const [tooltip, setTooltip] = useState<TooltipData | null>(null);

    // ── Interaction state ──
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
    const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
    const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(new Map());
    const dragOffset = useRef({ x: 0, y: 0 });

    /** Get effective position for a node (override or graph default) */
    const getNodePos = useCallback((node: GraphNode) => {
        const override = nodePositions.get(node.id);
        return override || { x: node.x, y: node.y };
    }, [nodePositions]);

    // Center the graph on mount
    useEffect(() => {
        if (!containerRef.current || graph.nodes.length === 0) return;
        const rect = containerRef.current.getBoundingClientRect();
        const scaleX = rect.width / graph.width;
        const scaleY = rect.height / graph.height;
        const scale = Math.min(scaleX, scaleY, 1.5) * 0.85;
        const x = (rect.width - graph.width * scale) / 2;
        const y = (rect.height - graph.height * scale) / 2;
        setTransform({ x, y, scale });
    }, [graph]);

    // Reset local positions when graph changes (new devices added/removed)
    useEffect(() => {
        setNodePositions(new Map());
    }, [graph]);

    // ── Pan handlers (background only) ──
    const onBgMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;
        setIsPanning(true);
        panStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
        // Clicking background clears selection (but not connect source — that needs Esc)
        if (!e.shiftKey) {
            setSelectedNodeId(null);
        }
    }, [transform.x, transform.y]);

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (draggingNodeId) {
            // Node drag
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const svgX = (e.clientX - rect.left - transform.x) / transform.scale;
            const svgY = (e.clientY - rect.top - transform.y) / transform.scale;
            setNodePositions(prev => {
                const next = new Map(prev);
                next.set(draggingNodeId, {
                    x: svgX - dragOffset.current.x,
                    y: svgY - dragOffset.current.y,
                });
                return next;
            });
            return;
        }
        if (isPanning) {
            setTransform(prev => ({
                ...prev,
                x: e.clientX - panStart.current.x,
                y: e.clientY - panStart.current.y,
            }));
        }
    }, [isPanning, draggingNodeId, transform.x, transform.y, transform.scale]);

    const onMouseUp = useCallback(() => {
        setIsPanning(false);
        setDraggingNodeId(null);
    }, []);

    // ── Node interaction ──
    const onNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
        e.stopPropagation(); // prevent pan
        if (e.button !== 0) return;

        if (e.shiftKey) {
            // Connect mode
            if (!connectSourceId) {
                setConnectSourceId(nodeId);
                setSelectedNodeId(nodeId);
            } else if (connectSourceId !== nodeId) {
                // Attempt connection or disconnection (toggle)
                const deviceA = devices.find(d => d.id === connectSourceId);
                const deviceB = devices.find(d => d.id === nodeId);
                if (deviceA && deviceB) {
                    // Check if already connected — find the linking port pair
                    let existingPortId: string | null = null;
                    for (const pa of deviceA.ports) {
                        if (!pa.connectedTo) continue;
                        for (const pb of deviceB.ports) {
                            if (pa.connectedTo === pb.id) {
                                existingPortId = pa.id;
                                break;
                            }
                        }
                        if (existingPortId) break;
                    }

                    if (existingPortId) {
                        // Already connected → disconnect
                        useAppStore.getState().disconnectPort(existingPortId);
                        useAppStore.getState().setNotification({
                            message: `Disconnected ${deviceA.name} ↔ ${deviceB.name}`,
                            type: 'info'
                        });
                    } else {
                        // Not connected → attempt connection
                        const result = findAutoConnectPorts(deviceA, deviceB);
                        if ('error' in result) {
                            useAppStore.getState().setNotification({ message: result.error, type: 'error' });
                        } else {
                            useAppStore.getState().connectPorts(result.portIdA, result.portIdB);
                            useAppStore.getState().setNotification({
                                message: `Connected ${deviceA.name} ↔ ${deviceB.name}`,
                                type: 'success'
                            });
                        }
                    }
                }
                setConnectSourceId(null);
                setSelectedNodeId(null);
            }
            return;
        }

        // Normal click → start drag + select
        setSelectedNodeId(nodeId);
        const node = graph.nodes.find(n => n.id === nodeId);
        if (node) {
            const pos = getNodePos(node);
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
                const svgX = (e.clientX - rect.left - transform.x) / transform.scale;
                const svgY = (e.clientY - rect.top - transform.y) / transform.scale;
                dragOffset.current = { x: svgX - pos.x, y: svgY - pos.y };
            }
            setDraggingNodeId(nodeId);
        }
    }, [connectSourceId, devices, graph.nodes, getNodePos, transform]);

    // ── Zoom ──
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setTransform(prev => {
            const newScale = Math.min(Math.max(prev.scale * delta, 0.2), 4);
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

    // ── Keyboard ──
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (connectSourceId) {
                    setConnectSourceId(null);
                    setSelectedNodeId(null);
                } else {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose, connectSourceId]);

    // CSS variables
    const cssVars = darkMode
        ? { '--tooltip-bg': '#1e293b', '--tooltip-fg': '#e2e8f0', '--tooltip-border': '#334155' } as React.CSSProperties
        : { '--tooltip-bg': '#ffffff', '--tooltip-fg': '#1e293b', '--tooltip-border': '#e2e8f0' } as React.CSSProperties;

    const bgColor = darkMode ? '#0f172a' : '#f8fafc';
    const edgeColor = darkMode ? '#475569' : '#94a3b8';
    const edgeLabelColor = darkMode ? '#94a3b8' : '#64748b';
    const labelColor = darkMode ? '#e2e8f0' : '#1e293b';

    const connectSourceNode = connectSourceId ? graph.nodes.find(n => n.id === connectSourceId) : null;

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

            {/* ── Connect hint bar ── */}
            {connectSourceNode && (
                <div
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm shrink-0"
                    style={{
                        backgroundColor: darkMode ? '#1e3a5f' : '#dbeafe',
                        color: darkMode ? '#93c5fd' : '#1e40af',
                    }}
                >
                    <Link2 size={14} />
                    <span>
                        Connecting from <strong>{connectSourceNode.label}</strong> — Shift+Click target to connect or disconnect, Esc to cancel
                    </span>
                </div>
            )}

            {/* ── Diagram area ── */}
            <div
                ref={containerRef}
                className="flex-1 overflow-hidden relative"
                style={{ cursor: draggingNodeId ? 'grabbing' : isPanning ? 'grabbing' : 'grab' }}
                onMouseDown={onBgMouseDown}
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
                        {/* Visible interactive SVG */}
                        <svg
                            className="absolute inset-0 w-full h-full"
                            style={{ userSelect: 'none' }}
                        >
                            <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
                                {/* Edges */}
                                {graph.edges.map((edge, i) => {
                                    const srcNode = graph.nodes.find(n => n.id === edge.sourceId);
                                    const dstNode = graph.nodes.find(n => n.id === edge.targetId);
                                    if (!srcNode || !dstNode) return null;
                                    const src = getNodePos(srcNode);
                                    const dst = getNodePos(dstNode);
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
                                    const eff = getEffectiveStatus(node);
                                    const icon = deviceIcon(node.type);
                                    const pos = getNodePos(node);
                                    const isSelected = selectedNodeId === node.id;
                                    const isConnectSource = connectSourceId === node.id;
                                    return (
                                        <g
                                            key={node.id}
                                            onMouseDown={(e) => onNodeMouseDown(e, node.id)}
                                            onMouseEnter={(e) => setTooltip({ node, x: e.clientX, y: e.clientY })}
                                            onMouseMove={(e) => setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
                                            onMouseLeave={() => setTooltip(null)}
                                            style={{ cursor: draggingNodeId === node.id ? 'grabbing' : 'pointer' }}
                                        >
                                            {/* Selection ring */}
                                            {isSelected && !isConnectSource && (
                                                <circle
                                                    cx={pos.x} cy={pos.y}
                                                    r={NODE_RADIUS + 5}
                                                    fill="none"
                                                    stroke="#ffffff"
                                                    strokeWidth={2}
                                                    opacity={0.8}
                                                />
                                            )}
                                            {/* Connect-source animated ring */}
                                            {isConnectSource && (
                                                <circle
                                                    cx={pos.x} cy={pos.y}
                                                    r={NODE_RADIUS + 5}
                                                    fill="none"
                                                    stroke="#60a5fa"
                                                    strokeWidth={2}
                                                    strokeDasharray="6 3"
                                                >
                                                    <animate
                                                        attributeName="stroke-dashoffset"
                                                        values="0;18"
                                                        dur="1s"
                                                        repeatCount="indefinite"
                                                    />
                                                </circle>
                                            )}
                                            {/* Node circle */}
                                            <circle
                                                cx={pos.x}
                                                cy={pos.y}
                                                r={NODE_RADIUS}
                                                fill={colors.fill}
                                                stroke={colors.stroke}
                                                strokeWidth={2.5}
                                                opacity={0.95}
                                            />
                                            {/* Icon */}
                                            <text
                                                x={pos.x}
                                                y={pos.y + 1}
                                                textAnchor="middle"
                                                dominantBaseline="central"
                                                fontSize={16}
                                                style={{ pointerEvents: 'none' }}
                                            >
                                                {icon}
                                            </text>
                                            {/* Status dot */}
                                            <circle
                                                cx={pos.x + NODE_RADIUS - 4}
                                                cy={pos.y - NODE_RADIUS + 4}
                                                r={5}
                                                fill={eff.color}
                                                stroke={bgColor}
                                                strokeWidth={2}
                                            />
                                            {/* Label */}
                                            <text
                                                x={pos.x}
                                                y={pos.y + NODE_RADIUS + 14}
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

                        {/* Hidden export SVG */}
                        <div style={{ position: 'absolute', left: -99999, top: -99999, width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                            <svg
                                ref={svgRef}
                                width={graph.width}
                                height={graph.height}
                                viewBox={`0 0 ${graph.width} ${graph.height}`}
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <rect width={graph.width} height={graph.height} fill={bgColor} />
                                {graph.edges.map((edge, i) => {
                                    const srcNode = graph.nodes.find(n => n.id === edge.sourceId);
                                    const dstNode = graph.nodes.find(n => n.id === edge.targetId);
                                    if (!srcNode || !dstNode) return null;
                                    const src = getNodePos(srcNode);
                                    const dst = getNodePos(dstNode);
                                    const midX = (src.x + dst.x) / 2;
                                    const midY = (src.y + dst.y) / 2;
                                    return (
                                        <g key={`exp-edge-${i}`}>
                                            <line x1={src.x} y1={src.y} x2={dst.x} y2={dst.y}
                                                stroke={edgeColor} strokeWidth={2} />
                                            <text x={midX} y={midY - 6} textAnchor="middle"
                                                fontSize={9} fill={edgeLabelColor}>
                                                {edge.sourcePort} → {edge.targetPort}
                                            </text>
                                        </g>
                                    );
                                })}
                                {graph.nodes.map(node => {
                                    const colors = CATEGORY_COLORS[node.category] || CATEGORY_COLORS.infra;
                                    const eff = getEffectiveStatus(node);
                                    const pos = getNodePos(node);
                                    return (
                                        <g key={`exp-${node.id}`}>
                                            <circle cx={pos.x} cy={pos.y} r={NODE_RADIUS}
                                                fill={colors.fill} stroke={colors.stroke}
                                                strokeWidth={2.5} opacity={0.95} />
                                            <circle cx={pos.x + NODE_RADIUS - 4} cy={pos.y - NODE_RADIUS + 4}
                                                r={5} fill={eff.color} stroke={bgColor} strokeWidth={2} />
                                            <text x={pos.x} y={pos.y + NODE_RADIUS + 14}
                                                textAnchor="middle" fontSize={11} fontWeight="500" fill={labelColor}>
                                                {node.label}
                                            </text>
                                            <text x={pos.x} y={pos.y + 1}
                                                textAnchor="middle" dominantBaseline="central"
                                                fontSize={8} fontWeight="600" fill="#ffffff">
                                                {getDeviceDefinition(node.type as any).displayName.split(' ').map(w => w[0]).join('')}
                                            </text>
                                        </g>
                                    );
                                })}
                                <text x={graph.width - 10} y={graph.height - 10}
                                    textAnchor="end" fontSize={10} fill={edgeLabelColor} opacity={0.5}>
                                    Generated by NetViz
                                </text>
                            </svg>
                        </div>
                    </>
                )}

                {/* Zoom controls */}
                <div className="absolute bottom-4 right-4 flex flex-col gap-1" style={{ zIndex: 10 }}>
                    <button onClick={zoomIn}
                        className="p-2 rounded-lg shadow-md transition-colors"
                        style={{
                            backgroundColor: darkMode ? '#1e293b' : '#ffffff', color: labelColor,
                            border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`
                        }}
                        title="Zoom in">
                        <ZoomIn size={16} />
                    </button>
                    <button onClick={zoomOut}
                        className="p-2 rounded-lg shadow-md transition-colors"
                        style={{
                            backgroundColor: darkMode ? '#1e293b' : '#ffffff', color: labelColor,
                            border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`
                        }}
                        title="Zoom out">
                        <ZoomOut size={16} />
                    </button>
                </div>

                {/* Hint text */}
                {graph.nodes.length > 0 && (
                    <div className="absolute bottom-4 left-4 text-xs px-2 py-1 rounded"
                        style={{
                            backgroundColor: darkMode ? '#1e293b80' : '#f1f5f980',
                            color: edgeLabelColor,
                        }}>
                        Click to select · Drag to move · Shift+Click to connect/disconnect · Scroll to zoom
                    </div>
                )}
            </div>

            {/* Tooltip */}
            {tooltip && <Tooltip data={tooltip} />}
        </div>
    );
};
