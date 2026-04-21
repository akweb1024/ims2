'use client';

import { useEffect, useState } from 'react';
import { EmployeeTwinCard } from '@/components/digital-twin/EmployeeTwinCard';
import { InventoryTwinCard } from '@/components/digital-twin/InventoryTwinCard';
import { EmployeeTwin, InventoryTwin } from '@/lib/digital-twin/twin-engine';

export default function DigitalTwinPage() {
    const [data, setData] = useState<{ employees: EmployeeTwin[], inventory: InventoryTwin[] } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/digital-twin/status');
                if (!res.ok) {
                    const errorText = await res.text();
                    throw new Error(`Failed to fetch: ${res.status} ${errorText}`);
                }
                const json = await res.json();
                setData(json);
            } catch (err) {
                console.error('Failed to sync twin state', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 10000); // 10s sync
        return () => clearInterval(interval);
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh] bg-[#050505]">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                <p className="text-white/40 text-xs tracking-widest uppercase">Initializing Twin Nodes...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#050505] p-8 text-white">
            <header className="mb-12">
                <div className="flex items-center gap-4 mb-2">
                    <div className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/10 text-indigo-400 text-[10px] font-bold tracking-widest uppercase">
                        Real-time DTO Engine v1.0
                    </div>
                </div>
                <h1 className="text-5xl font-black tracking-tight mb-4 bg-gradient-to-r from-white to-white/30 bg-clip-text text-transparent">
                    Digital Twin <span className="text-indigo-500">Dashboard</span>
                </h1>
                <p className="text-white/40 max-w-2xl leading-relaxed text-sm">
                    Visualizing the logical link between your human capital and physical inventory. 
                    A real-time representation of organizational bandwidth and stock velocity.
                </p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-16">
                {/* Employee Hub */}
                <section>
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-6 bg-purple-500 rounded-full" />
                            <h2 className="text-lg font-bold uppercase tracking-wider text-white/90">Human Resources Twin</h2>
                        </div>
                        <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-white/40">{data?.employees.length || 0} Nodes Active</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {data?.employees.map(emp => (
                            <EmployeeTwinCard key={emp.id} employee={emp} />
                        ))}
                        {(data?.employees.length === 0) && (
                            <div className="col-span-full py-12 text-center bg-white/5 border border-dashed border-white/10 rounded-2xl">
                                <p className="text-white/20 text-sm italic">No employees found for this company twin.</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Inventory Hub */}
                <section>
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-6 bg-indigo-500 rounded-full" />
                            <h2 className="text-lg font-bold uppercase tracking-wider text-white/90">Inventory Asset Twin</h2>
                        </div>
                        <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-white/40">{data?.inventory.length || 0} SKUs Tracking</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {data?.inventory.map(item => (
                            <InventoryTwinCard key={item.id} item={item} />
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
