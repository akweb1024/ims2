'use client';

import { useEffect, useRef, useState } from 'react';
import { EmployeeTwin, InventoryTwin } from '@/lib/digital-twin/twin-engine';

interface NetworkGraphViewProps {
    employees: EmployeeTwin[];
    inventory: InventoryTwin[];
    onDispatch: (empId?: string, itemId?: string) => void;
}

interface GraphNode {
    id: string;
    label: string;
    type: 'employee' | 'inventory';
    status: string;
    x: number;
    y: number;
    linkedIds: string[];
}

const statusGlow: Record<string, string> = {
    ACTIVE: '#22c55e',
    OVERLOADED: '#ef4444',
    OFFLINE_ALERT: '#eab308',
    OFFLINE: '#6b7280',
    CRITICAL: '#ef4444',
    WARNING: '#eab308',
    HEALTHY: '#22c55e',
};

export const NetworkGraphView = ({ employees, inventory, onDispatch }: NetworkGraphViewProps) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [dimensions, setDimensions] = useState({ w: 800, h: 600 });

    useEffect(() => {
        const update = () => {
            if (svgRef.current?.parentElement) {
                setDimensions({
                    w: svgRef.current.parentElement.clientWidth,
                    h: Math.max(600, svgRef.current.parentElement.clientHeight),
                });
            }
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    const { w, h } = dimensions;
    const centerX = w / 2;
    const centerY = h / 2;

    // Layout: employees on the left arc, inventory on the right arc
    const empNodes: GraphNode[] = employees.map((emp, i) => {
        const total = employees.length || 1;
        const angle = (Math.PI / (total + 1)) * (i + 1) - Math.PI / 2;
        const radius = Math.min(h * 0.38, 240);
        return {
            id: emp.id,
            label: emp.name.split(' ')[0],
            type: 'employee',
            status: emp.status,
            x: centerX - w * 0.22 + Math.cos(angle) * 30,
            y: centerY + Math.sin(angle) * radius,
            linkedIds: emp.linkedInventoryIds,
        };
    });

    const invNodes: GraphNode[] = inventory.map((item, i) => {
        const total = inventory.length || 1;
        const angle = (Math.PI / (total + 1)) * (i + 1) - Math.PI / 2;
        const radius = Math.min(h * 0.38, 240);
        return {
            id: item.id,
            label: item.sku,
            type: 'inventory',
            status: item.status,
            x: centerX + w * 0.22 + Math.cos(angle) * 30,
            y: centerY + Math.sin(angle) * radius,
            linkedIds: [],
        };
    });

    const allNodes = [...empNodes, ...invNodes];

    // Determine which IDs to highlight
    const hoveredEmpNode = empNodes.find(n => n.id === hoveredId);
    const hoveredInvNode = invNodes.find(n => n.id === hoveredId);
    const activeLinkedIds: string[] = hoveredEmpNode?.linkedIds || 
        (hoveredInvNode ? empNodes.filter(e => e.linkedIds.includes(hoveredId!)).map(e => e.id) : []);
    const allHighlightedIds = hoveredId ? [hoveredId, ...activeLinkedIds] : [];

    const NODE_R = 28;

    return (
        <div className="relative w-full rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm overflow-hidden" style={{ height: `${h}px` }}>
            {/* Column Labels */}
            <div className="absolute top-5 left-0 w-full flex justify-between px-8 pointer-events-none">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Personnel Nodes ({employees.length})</span>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/20">Hover to trace threads</div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Asset Nodes ({inventory.length})</span>
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                </div>
            </div>

            <svg ref={svgRef} width="100%" height="100%" className="absolute inset-0">
                <defs>
                    {Object.entries(statusGlow).map(([status, color]) => (
                        <filter key={status} id={`glow-${status}`} x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    ))}
                    <filter id="glow-thread" x="-100%" y="-100%" width="300%" height="300%">
                        <feGaussianBlur stdDeviation="2.5" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                {/* Center divider line */}
                <line
                    x1={centerX} y1={40} x2={centerX} y2={h - 40}
                    stroke="white" strokeOpacity="0.04" strokeWidth="1" strokeDasharray="4 8"
                />

                {/* Thread lines (employee → inventory) */}
                {empNodes.map(emp =>
                    emp.linkedIds.map(invId => {
                        const invNode = invNodes.find(n => n.id === invId);
                        if (!invNode) return null;
                        const isActive = allHighlightedIds.includes(emp.id) && allHighlightedIds.includes(invId);
                        const isHovered = hoveredId !== null;
                        return (
                            <line
                                key={`${emp.id}-${invId}`}
                                x1={emp.x} y1={emp.y}
                                x2={invNode.x} y2={invNode.y}
                                stroke={isActive ? '#818cf8' : 'rgba(99,102,241,0.15)'}
                                strokeWidth={isActive ? 2 : 1}
                                filter={isActive ? 'url(#glow-thread)' : undefined}
                                opacity={isHovered && !isActive ? 0.05 : isActive ? 1 : 0.4}
                                className="transition-all duration-300"
                            />
                        );
                    })
                )}

                {/* Employee nodes */}
                {empNodes.map(node => {
                    const isHighlighted = allHighlightedIds.includes(node.id);
                    const isHovered = hoveredId !== null && !isHighlighted;
                    const color = statusGlow[node.status] || '#6b7280';
                    return (
                        <g
                            key={node.id}
                            transform={`translate(${node.x}, ${node.y})`}
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredId(node.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            onDoubleClick={() => onDispatch(node.id, undefined)}
                            style={{ opacity: isHovered ? 0.25 : 1 }}
                        >
                            {/* Outer glow ring for highlighted */}
                            {isHighlighted && (
                                <circle r={NODE_R + 8} fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.4" className="animate-pulse" />
                            )}
                            {/* Node circle */}
                            <circle
                                r={NODE_R}
                                fill={isHighlighted ? `${color}30` : 'rgba(99,102,241,0.1)'}
                                stroke={isHighlighted ? color : 'rgba(139,92,246,0.4)'}
                                strokeWidth={isHighlighted ? 2 : 1.5}
                                filter={isHighlighted ? `url(#glow-${node.status})` : undefined}
                                className="transition-all duration-300"
                            />
                            {/* Avatar letter */}
                            <text
                                textAnchor="middle"
                                dominantBaseline="central"
                                fontSize="14"
                                fontWeight="bold"
                                fill={isHighlighted ? color : 'rgba(255,255,255,0.7)'}
                                className="select-none"
                            >
                                {node.label.charAt(0).toUpperCase()}
                            </text>
                            {/* Status dot */}
                            <circle cx={NODE_R - 4} cy={-(NODE_R - 4)} r="5" fill={color} />
                            {/* Name label */}
                            <text
                                y={NODE_R + 14}
                                textAnchor="middle"
                                fontSize="10"
                                fontWeight="600"
                                fill={isHighlighted ? 'white' : 'rgba(255,255,255,0.4)'}
                                className="select-none"
                            >
                                {node.label.length > 12 ? node.label.slice(0, 12) + '…' : node.label}
                            </text>
                            {/* Thread count badge */}
                            {node.linkedIds.length > 0 && (
                                <g>
                                    <circle cx={-(NODE_R - 4)} cy={-(NODE_R - 4)} r="8" fill="rgba(99,102,241,0.8)" />
                                    <text
                                        x={-(NODE_R - 4)} y={-(NODE_R - 4)}
                                        textAnchor="middle" dominantBaseline="central"
                                        fontSize="8" fontWeight="bold" fill="white"
                                        className="select-none"
                                    >
                                        {node.linkedIds.length}
                                    </text>
                                </g>
                            )}
                        </g>
                    );
                })}

                {/* Inventory nodes */}
                {invNodes.map(node => {
                    const isHighlighted = allHighlightedIds.includes(node.id);
                    const isHovered = hoveredId !== null && !isHighlighted;
                    const color = statusGlow[node.status] || '#6b7280';
                    const linkedEmpCount = empNodes.filter(e => e.linkedIds.includes(node.id)).length;
                    return (
                        <g
                            key={node.id}
                            transform={`translate(${node.x}, ${node.y})`}
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredId(node.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            onDoubleClick={() => onDispatch(undefined, node.id)}
                            style={{ opacity: isHovered ? 0.25 : 1 }}
                        >
                            {isHighlighted && (
                                <circle r={NODE_R + 8} fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.4" className="animate-pulse" />
                            )}
                            <rect
                                x={-NODE_R} y={-NODE_R}
                                width={NODE_R * 2} height={NODE_R * 2}
                                rx="10"
                                fill={isHighlighted ? `${color}30` : 'rgba(79,70,229,0.1)'}
                                stroke={isHighlighted ? color : 'rgba(99,102,241,0.4)'}
                                strokeWidth={isHighlighted ? 2 : 1.5}
                                filter={isHighlighted ? `url(#glow-${node.status})` : undefined}
                                className="transition-all duration-300"
                            />
                            <text
                                textAnchor="middle"
                                dominantBaseline="central"
                                fontSize="9"
                                fontWeight="bold"
                                fontFamily="monospace"
                                fill={isHighlighted ? color : 'rgba(165,180,252,0.8)'}
                                className="select-none"
                            >
                                {node.label.length > 8 ? node.label.slice(0, 8) : node.label}
                            </text>
                            <circle cx={NODE_R - 4} cy={-(NODE_R - 4)} r="5" fill={color} />
                            <text
                                y={NODE_R + 14}
                                textAnchor="middle"
                                fontSize="10"
                                fontWeight="600"
                                fill={isHighlighted ? 'white' : 'rgba(255,255,255,0.4)'}
                                className="select-none"
                            >
                                {node.label.length > 12 ? node.label.slice(0, 12) + '…' : node.label}
                            </text>
                            {linkedEmpCount > 0 && (
                                <g>
                                    <circle cx={-(NODE_R - 4)} cy={-(NODE_R - 4)} r="8" fill="rgba(168,85,247,0.8)" />
                                    <text
                                        x={-(NODE_R - 4)} y={-(NODE_R - 4)}
                                        textAnchor="middle" dominantBaseline="central"
                                        fontSize="8" fontWeight="bold" fill="white"
                                        className="select-none"
                                    >
                                        {linkedEmpCount}
                                    </text>
                                </g>
                            )}
                        </g>
                    );
                })}
            </svg>

            {/* Legend */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-6 px-4 py-2 bg-black/50 backdrop-blur rounded-full border border-white/10">
                {[
                    { color: '#22c55e', label: 'Active / Healthy' },
                    { color: '#eab308', label: 'Warning / Alert' },
                    { color: '#ef4444', label: 'Critical / Overloaded' },
                    { color: '#6b7280', label: 'Offline' },
                ].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                        <span className="text-[9px] text-white/40 uppercase tracking-wider">{l.label}</span>
                    </div>
                ))}
                <div className="h-3 w-px bg-white/10" />
                <span className="text-[9px] text-white/30">Double-click to dispatch</span>
            </div>

            {/* Empty state */}
            {employees.length === 0 && inventory.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-white/20 text-sm italic">No nodes to render in the network.</p>
                </div>
            )}
        </div>
    );
};
