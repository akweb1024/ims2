'use client';

import { useEffect, useState } from 'react';
import { EmployeeTwinCard } from '@/components/digital-twin/EmployeeTwinCard';
import { InventoryTwinCard } from '@/components/digital-twin/InventoryTwinCard';
import { EmployeeTwin, InventoryTwin } from '@/lib/digital-twin/twin-engine';
import { DashboardSkeleton } from '@/components/ui/skeletons';
import { Badge } from '@/components/ui/Badge';

export default function DigitalTwinPage() {
    const [data, setData] = useState<{ employees: EmployeeTwin[], inventory: InventoryTwin[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [hoveredEmployeeId, setHoveredEmployeeId] = useState<string | null>(null);
    const [hoveredInventoryId, setHoveredInventoryId] = useState<string | null>(null);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [syncError, setSyncError] = useState<boolean>(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/digital-twin/status');
                if (!res.ok) throw new Error('API Failure');
                
                const json = await res.json();
                setData(json);
                setLastSync(new Date());
                setSyncError(false);
            } catch (err) {
                console.error('Failed to sync twin state', err);
                setSyncError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 10000); // 10s sync
        return () => clearInterval(interval);
    }, []);

    // Derived highlighting logic
    const highlightedInventoryIds = hoveredEmployeeId 
        ? data?.employees.find(e => e.id === hoveredEmployeeId)?.linkedInventoryIds || [] 
        : hoveredInventoryId ? [hoveredInventoryId] : [];

    const highlightedEmployeeIds = hoveredInventoryId 
        ? data?.employees.filter(e => e.linkedInventoryIds.includes(hoveredInventoryId)).map(e => e.id) || [] 
        : hoveredEmployeeId ? [hoveredEmployeeId] : [];

    if (loading) return <DashboardSkeleton title="Digital Twin Hub" />;

    return (
        <div className="min-h-screen bg-[#050505] p-8 text-white selection:bg-indigo-500 selection:text-white">
            <header className="mb-12">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/10 text-indigo-400 text-[10px] font-bold tracking-widest uppercase">
                            DTO Engine v2.1 • Production Ready
                        </div>
                        {syncError && (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/40 animate-pulse">
                                Sync Interrupted
                            </Badge>
                        )}
                    </div>
                    {lastSync && (
                        <span className="text-[10px] text-white/30 uppercase tracking-tighter">
                            Last Intel Sync: {lastSync.toLocaleTimeString()}
                        </span>
                    )}
                </div>
                <h1 className="text-5xl font-black tracking-tight mb-4 bg-gradient-to-r from-white to-white/30 bg-clip-text text-transparent">
                    Digital Twin <span className="text-indigo-500">Dashboard</span>
                </h1>
                <p className="text-white/40 max-w-2xl leading-relaxed text-sm">
                    <span className="text-indigo-400 font-bold">Smart Dispatch Active:</span> Visualizing the logical threads between your human capital and physical nodes. 
                    Hover over a node to trace operational connectivity.
                </p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-16 relative">
                {/* Employee Hub */}
                <section className="duration-500 transition-opacity" style={{ opacity: hoveredInventoryId && highlightedEmployeeIds.length === 0 ? 0.3 : 1 }}>
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-6 bg-purple-500 rounded-full" />
                            <h2 className="text-lg font-bold uppercase tracking-wider text-white/90">Human Resources Twin</h2>
                        </div>
                        <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-white/40">{data?.employees.length || 0} Nodes Active</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {data?.employees.map(emp => (
                            <EmployeeTwinCard 
                                key={emp.id} 
                                employee={emp} 
                                isHighlighted={highlightedEmployeeIds.includes(emp.id)}
                                onHover={() => setHoveredEmployeeId(emp.id)}
                                onLeave={() => setHoveredEmployeeId(null)}
                            />
                        ))}
                        {(data?.employees.length === 0) && (
                            <div className="col-span-full py-12 text-center bg-white/5 border border-dashed border-white/10 rounded-2xl">
                                <p className="text-white/20 text-sm italic">No employees found for this company twin.</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Inventory Hub */}
                <section className="duration-500 transition-opacity" style={{ opacity: hoveredEmployeeId && highlightedInventoryIds.length === 0 ? 0.3 : 1 }}>
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-6 bg-indigo-500 rounded-full" />
                            <h2 className="text-lg font-bold uppercase tracking-wider text-white/90">Inventory Asset Twin</h2>
                        </div>
                        <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-white/40">{data?.inventory.length || 0} SKUs Tracking</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {data?.inventory.map(item => (
                            <InventoryTwinCard 
                                key={item.id} 
                                item={item} 
                                isHighlighted={highlightedInventoryIds.includes(item.id)}
                                onHover={() => setHoveredInventoryId(item.id)}
                                onLeave={() => setHoveredInventoryId(null)}
                            />
                        ))}
                        {(data?.inventory.length === 0) && (
                            <div className="col-span-full py-12 text-center bg-white/5 border border-dashed border-white/10 rounded-2xl">
                                <p className="text-white/20 text-sm italic">No inventory nodes initialized.</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* Background Decorative Elements */}
            <div className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none opacity-10">
                <div className="absolute top-[5%] left-[10%] w-[400px] h-[400px] bg-indigo-600 rounded-full blur-[150px] animate-pulse"></div>
                <div className="absolute bottom-[10%] right-[10%] w-[600px] h-[600px] bg-purple-900 rounded-full blur-[200px]"></div>
            </div>
        </div>
    );
}
