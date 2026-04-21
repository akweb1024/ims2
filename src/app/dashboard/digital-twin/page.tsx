'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { EmployeeTwinCard } from '@/components/digital-twin/EmployeeTwinCard';
import { InventoryTwinCard } from '@/components/digital-twin/InventoryTwinCard';
import { AlertCenter } from '@/components/digital-twin/AlertCenter';
import { DispatchPanel } from '@/components/digital-twin/DispatchPanel';
import { NetworkGraphView } from '@/components/digital-twin/NetworkGraphView';
import { IntelligencePanel } from '@/components/digital-twin/IntelligencePanel';
import { EmployeeTwin, InventoryTwin, TwinSummary } from '@/lib/digital-twin/twin-engine';
import { exportTwinToCSV } from '@/lib/digital-twin/export-twin';
import { runIntelligenceEngine, IntelligenceSummary } from '@/lib/digital-twin/intelligence';
import { DashboardSkeleton } from '@/components/ui/skeletons';
import { Badge } from '@/components/ui/Badge';

type TwinData = { employees: EmployeeTwin[]; inventory: InventoryTwin[]; summary: TwinSummary; timestamp: string };

type FilterStatus = 'ALL' | 'ACTIVE' | 'OVERLOADED' | 'OFFLINE_ALERT' | 'OFFLINE' | 'CRITICAL' | 'WARNING' | 'HEALTHY';
type ViewMode = 'grid' | 'network';
type StreamMode = 'sse' | 'poll';

const POLL_INTERVAL = 10000;

const summaryStats = (summary: TwinSummary) => [
    { label: 'Active Nodes', value: summary.activeEmployees, color: 'text-green-400', icon: '●' },
    { label: 'Overloaded', value: summary.overloadedStaff, color: 'text-red-400', icon: '▲' },
    { label: 'Critical Items', value: summary.criticalItems, color: 'text-red-500', icon: '⚠' },
    { label: 'Active Threads', value: summary.activeThreads, color: 'text-indigo-400', icon: '⟶' },
];

// Animated particle system
const Particles = () => (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
            <div
                key={i}
                className="absolute rounded-full bg-indigo-500/20 animate-pulse"
                style={{
                    width: `${Math.random() * 3 + 1}px`,
                    height: `${Math.random() * 3 + 1}px`,
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 5}s`,
                    animationDuration: `${Math.random() * 4 + 3}s`,
                }}
            />
        ))}
        <div className="absolute top-[5%] left-[10%] w-[400px] h-[400px] bg-indigo-600 rounded-full blur-[150px] opacity-10 animate-pulse" />
        <div className="absolute bottom-[10%] right-[10%] w-[600px] h-[600px] bg-purple-900 rounded-full blur-[200px] opacity-10" />
    </div>
);

export default function DigitalTwinPage() {
    const [data, setData] = useState<TwinData | null>(null);
    const [intelligence, setIntelligence] = useState<IntelligenceSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [streamMode] = useState<StreamMode>('sse');
    const [hoveredEmployeeId, setHoveredEmployeeId] = useState<string | null>(null);
    const [hoveredInventoryId, setHoveredInventoryId] = useState<string | null>(null);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [syncError, setSyncError] = useState(false);
    const [isPolling, setIsPolling] = useState(true);
    const [countdown, setCountdown] = useState(POLL_INTERVAL / 1000);
    const [search, setSearch] = useState('');
    const [empFilter, setEmpFilter] = useState<FilterStatus>('ALL');
    const [invFilter, setInvFilter] = useState<FilterStatus>('ALL');
    const [alertOpen, setAlertOpen] = useState(false);
    const [dispatchState, setDispatchState] = useState<{ open: boolean; empId?: string; itemId?: string }>({ open: false });
    const [exporting, setExporting] = useState(false);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    const applySnapshot = useCallback((json: TwinData) => {
        setData(json);
        setIntelligence(runIntelligenceEngine(json.employees, json.inventory));
        setLastSync(new Date());
        setSyncError(false);
        setCountdown(POLL_INTERVAL / 1000);
        setLoading(false);
    }, []);

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch('/api/digital-twin/status');
            if (!res.ok) throw new Error('API Failure');
            const json = await res.json();
            applySnapshot(json);
        } catch {
            setSyncError(true);
            setLoading(false);
        }
    }, [applySnapshot]);

    // SSE connection setup
    const connectSSE = useCallback(() => {
        if (eventSourceRef.current) eventSourceRef.current.close();
        const es = new EventSource('/api/digital-twin/stream');
        eventSourceRef.current = es;
        es.onmessage = (e) => {
            try {
                const json = JSON.parse(e.data);
                if (!json.error) applySnapshot(json);
                else setSyncError(true);
            } catch { setSyncError(true); }
        };
        es.onerror = () => { setSyncError(true); setLoading(false); };
        es.onopen = () => setSyncError(false);
    }, [applySnapshot]);

    const handleExport = () => {
        if (!data) return;
        setExporting(true);
        setTimeout(() => {
            exportTwinToCSV(data.employees, data.inventory, data.summary, data.timestamp || new Date().toISOString());
            setExporting(false);
        }, 100);
    };

    // Attempt SSE first; fallback to polling if SSE fails
    useEffect(() => {
        try {
            connectSSE();
        } catch {
            fetchData();
        }
        return () => { eventSourceRef.current?.close(); };
    }, [connectSSE, fetchData]);

    // Polling-based countdown timer (visible even in SSE mode for UX)
    useEffect(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);

        if (isPolling && streamMode === 'poll') {
            intervalRef.current = setInterval(fetchData, POLL_INTERVAL);
        }

        countdownRef.current = setInterval(() => {
            setCountdown(c => (c <= 1 ? 5 : c - 1)); // SSE fires every 5s
        }, 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, [isPolling, streamMode, fetchData]);

    // Derived highlighting
    const highlightedInventoryIds = hoveredEmployeeId 
        ? data?.employees.find(e => e.id === hoveredEmployeeId)?.linkedInventoryIds || [] 
        : hoveredInventoryId ? [hoveredInventoryId] : [];

    const highlightedEmployeeIds = hoveredInventoryId 
        ? data?.employees.filter(e => e.linkedInventoryIds.includes(hoveredInventoryId!)).map(e => e.id) || [] 
        : hoveredEmployeeId ? [hoveredEmployeeId] : [];

    // Filtered lists
    const filteredEmployees = (data?.employees || []).filter(e => {
        const matchesSearch = !search || e.name.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = empFilter === 'ALL' || e.status === empFilter;
        return matchesSearch && matchesFilter;
    });

    const filteredInventory = (data?.inventory || []).filter(i => {
        const matchesSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = invFilter === 'ALL' || i.status === invFilter;
        return matchesSearch && matchesFilter;
    });

    const openDispatch = (empId?: string, itemId?: string) => {
        setDispatchState({ open: true, empId, itemId });
        setAlertOpen(false);
    };

    const totalAlerts = (data?.summary.criticalItems || 0) + (data?.summary.overloadedStaff || 0) + (data?.summary.offlineAlerts || 0);

    if (loading) return <DashboardSkeleton />;

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-indigo-500 selection:text-white pb-20">
            <Particles />

            {/* Alert Center */}
            {data && (
                <AlertCenter
                    employees={data.employees}
                    inventory={data.inventory}
                    summary={data.summary}
                    onDispatch={openDispatch}
                    isOpen={alertOpen}
                    onToggle={() => setAlertOpen(o => !o)}
                />
            )}

            {/* Dispatch Panel */}
            {dispatchState.open && data && (
                <DispatchPanel
                    employees={data.employees}
                    inventory={data.inventory}
                    preselectedEmployeeId={dispatchState.empId}
                    preselectedItemId={dispatchState.itemId}
                    onClose={() => setDispatchState({ open: false })}
                    onSuccess={fetchData}
                />
            )}

            <div className="p-8">
                {/* Header */}
                <header className="mb-8">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/10 text-indigo-400 text-[10px] font-bold tracking-widest uppercase">
                                DTO Engine v3.0 · AI Command Center
                            </div>
                            {syncError && (
                                <Badge className="bg-red-500/20 text-red-400 border-red-500/40 animate-pulse">
                                    Sync Interrupted
                                </Badge>
                            )}
                            {totalAlerts > 0 && (
                                <button
                                    onClick={() => setAlertOpen(o => !o)}
                                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-bold hover:bg-red-500/30 transition-all animate-pulse"
                                >
                                    ⚠ {totalAlerts} Active Alert{totalAlerts !== 1 ? 's' : ''}
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            {lastSync && (
                                <span className="text-[10px] text-white/30 uppercase tracking-tighter">
                                    Last Sync: {lastSync.toLocaleTimeString()}
                                </span>
                            )}
                            <button
                                onClick={handleExport}
                                disabled={!data || exporting}
                                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 hover:text-white/70 disabled:opacity-30 transition-all"
                            >
                                {exporting ? '…' : '↓'} Export CSV
                            </button>
                            <button
                                onClick={() => setIsPolling(p => !p)}
                                className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all duration-200 ${
                                    isPolling 
                                        ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400' 
                                        : 'bg-white/5 border-white/10 text-white/40 hover:bg-green-500/10 hover:border-green-500/30 hover:text-green-400'
                                }`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full ${isPolling ? 'bg-green-400 animate-pulse' : 'bg-white/30'}`} />
                                {isPolling ? `Live · ${countdown}s` : 'Paused'}
                            </button>
                            <button
                                onClick={() => openDispatch()}
                                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/30 transition-all"
                            >
                                ⚡ New Dispatch
                            </button>
                        </div>
                    </div>
                    <h1 className="text-5xl font-black tracking-tight mb-4 bg-gradient-to-r from-white to-white/30 bg-clip-text text-transparent">
                        Digital Twin <span className="text-indigo-500">Command Center</span>
                    </h1>
                    <p className="text-white/40 max-w-2xl leading-relaxed text-sm">
                        <span className="text-indigo-400 font-bold">Smart Dispatch Active:</span> Real-time operational threads between human capital and physical assets.
                    </p>
                </header>

                {/* Summary Bar */}
                {data && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {summaryStats(data.summary).map(stat => (
                            <div key={stat.label} className="relative p-4 rounded-xl bg-white/3 border border-white/8 backdrop-blur-sm overflow-hidden group hover:border-white/15 transition-all duration-300">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/3 to-transparent" />
                                <div className="relative">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-xl ${stat.color} font-black`}>{stat.icon}</span>
                                        <span className={`text-2xl font-black ${stat.color} tabular-nums`}>{stat.value}</span>
                                    </div>
                                    <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">{stat.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* AI Intelligence Engine Panel */}
                {intelligence && data && (
                    <IntelligencePanel
                        intelligence={intelligence}
                        employees={data.employees}
                        inventory={data.inventory}
                        onDispatch={openDispatch}
                    />
                )}

                {/* View Mode Toggle + Search & Filters */}
                <div className="flex flex-wrap items-center gap-3 mb-8">
                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl">
                        {([['grid', '⊞ Grid'], ['network', '⬡ Network']] as [ViewMode, string][]).map(([mode, label]) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-200 ${
                                    viewMode === mode
                                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                        : 'text-white/40 hover:text-white/60'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="w-px h-6 bg-white/10" />

                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">⌕</div>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search nodes, SKUs..."
                            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-colors"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-xs">✕</button>
                        )}
                    </div>

                    {viewMode === 'grid' && (
                        <>
                            <div className="flex items-center gap-1">
                                <span className="text-[9px] uppercase tracking-wider text-white/30 mr-1">Personnel:</span>
                                {(['ALL', 'ACTIVE', 'OVERLOADED', 'OFFLINE'] as FilterStatus[]).map(f => (
                                    <button key={f} onClick={() => setEmpFilter(f)} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${empFilter === f ? 'bg-indigo-500 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'}`}>
                                        {f}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-[9px] uppercase tracking-wider text-white/30 mr-1">Assets:</span>
                                {(['ALL', 'HEALTHY', 'WARNING', 'CRITICAL'] as FilterStatus[]).map(f => (
                                    <button key={f} onClick={() => setInvFilter(f)} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${invFilter === f ? 'bg-indigo-500 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'}`}>
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Content: Grid or Network */}
                {viewMode === 'network' ? (
                    <NetworkGraphView
                        employees={data?.employees || []}
                        inventory={data?.inventory || []}
                        onDispatch={openDispatch}
                    />
                ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-16">
                    {/* Employee Hub */}
                    <section className="transition-opacity duration-500" style={{ opacity: hoveredInventoryId && highlightedEmployeeIds.length === 0 ? 0.3 : 1 }}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-6 bg-purple-500 rounded-full" />
                                <h2 className="text-lg font-bold uppercase tracking-wider text-white/90">Human Resources Twin</h2>
                            </div>
                            <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-white/40">{filteredEmployees.length} Nodes</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {filteredEmployees.map(emp => (
                                <EmployeeTwinCard 
                                    key={emp.id} 
                                    employee={emp} 
                                    isHighlighted={highlightedEmployeeIds.includes(emp.id)}
                                    onHover={() => setHoveredEmployeeId(emp.id)}
                                    onLeave={() => setHoveredEmployeeId(null)}
                                    onDispatch={() => openDispatch(emp.id, undefined)}
                                />
                            ))}
                            {filteredEmployees.length === 0 && (
                                <div className="col-span-full py-12 text-center bg-white/5 border border-dashed border-white/10 rounded-2xl">
                                    <p className="text-white/20 text-sm italic">No personnel nodes match the current filter.</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Inventory Hub */}
                    <section className="transition-opacity duration-500" style={{ opacity: hoveredEmployeeId && highlightedInventoryIds.length === 0 ? 0.3 : 1 }}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-6 bg-indigo-500 rounded-full" />
                                <h2 className="text-lg font-bold uppercase tracking-wider text-white/90">Inventory Asset Twin</h2>
                            </div>
                            <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-white/40">{filteredInventory.length} SKUs</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {filteredInventory.map(item => (
                                <InventoryTwinCard 
                                    key={item.id} 
                                    item={item} 
                                    isHighlighted={highlightedInventoryIds.includes(item.id)}
                                    onHover={() => setHoveredInventoryId(item.id)}
                                    onLeave={() => setHoveredInventoryId(null)}
                                    onDispatch={() => openDispatch(undefined, item.id)}
                                />
                            ))}
                            {filteredInventory.length === 0 && (
                                <div className="col-span-full py-12 text-center bg-white/5 border border-dashed border-white/10 rounded-2xl">
                                    <p className="text-white/20 text-sm italic">No asset nodes match the current filter.</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
                )}
            </div>
        </div>
    );
}
