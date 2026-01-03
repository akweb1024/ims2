'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function SupplyChainDashboard() {
    const [inventory, setInventory] = useState<any[]>([]);
    const [metrics, setMetrics] = useState<any>(null);
    const [aiPlan, setAiPlan] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [generatingPlan, setGeneratingPlan] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [invRes, aiRes] = await Promise.all([
                fetch('/api/supply-chain/inventory', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/supply-chain/ai-plan', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (invRes.ok) {
                const data = await invRes.json();
                setInventory(data.items);
                setMetrics(data.metrics);
            }
            if (aiRes.ok) {
                setAiPlan(await aiRes.json());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateItem = async () => {
        const name = prompt("Item Name:");
        if (!name) return;
        const sku = prompt("SKU:");
        const stock = prompt("Current Stock:");

        try {
            const token = localStorage.getItem('token');
            await fetch('/api/supply-chain/inventory', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    sku,
                    currentStock: stock || 0,
                    minThreshold: 10,
                    category: 'FINISHED_GOOD',
                    price: 100
                })
            });
            fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    const handleApprovePlan = async (rec: any) => {
        if (!confirm(`Approve production of ${rec.suggestedQty} units of ${rec.itemName}?`)) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/supply-chain/ai-plan', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemSku: rec.itemSku,
                    quantity: rec.suggestedQty,
                    priority: rec.priority,
                    reason: rec.reason
                })
            });
            if (res.ok) {
                alert("Production Order Initiated ✅");
                fetchData();
            }
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) return <DashboardLayout><div className="flex h-[80vh] items-center justify-center text-3xl">🏭</div></DashboardLayout>;

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <span className="text-4xl">🏭</span> Predictive Supply Chain
                        </h1>
                        <p className="text-slate-500 font-medium mt-1">AI-driven inventory & production management.</p>
                    </div>
                    <button onClick={handleCreateItem} className="btn bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg shadow-slate-200">+ Add SKU</button>
                </div>

                {/* Metrics */}
                {metrics && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Inventory Value</p>
                            <p className="text-3xl font-black text-slate-900 mt-2">₹{metrics.totalValue.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Low Stock Items</p>
                            <p className={`text-3xl font-black mt-2 ${metrics.lowStockCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{metrics.lowStockCount}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Market Demand Signal</p>
                            <p className={`text-3xl font-black mt-2 ${aiPlan?.marketSignal === 'HIGH_DEMAND' ? 'text-amber-500' : 'text-slate-700'}`}>
                                {aiPlan?.marketSignal === 'HIGH_DEMAND' ? '🔥 HIGH' : '✅ NORMAL'}
                            </p>
                        </div>
                    </div>
                )}

                {/* AI Recommendations */}
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full blur-[128px] opacity-20 -mr-20 -mt-20"></div>

                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse"></span>
                        <h3 className="text-xl font-bold">AI Production Directives</h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
                        {aiPlan?.recommendations.length === 0 ? (
                            <div className="col-span-full py-12 text-center border border-dashed border-slate-700 rounded-2xl text-slate-400">
                                No production overrides needed. Operations optimized.
                            </div>
                        ) : aiPlan?.recommendations.map((rec: any, i: number) => (
                            <div key={i} className="bg-white/5 hover:bg-white/10 p-6 rounded-2xl border border-white/10 transition-all flex justify-between items-center group">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${rec.priority === 'HIGH' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'}`}>{rec.priority} PRIORITY</span>
                                        <span className="text-xs font-bold text-slate-400">{rec.itemSku}</span>
                                    </div>
                                    <h4 className="text-lg font-bold mb-1">Produce {rec.suggestedQty} units of {rec.itemName}</h4>
                                    <p className="text-xs text-slate-400">{rec.reason}</p>
                                </div>
                                <button onClick={() => handleApprovePlan(rec)} className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold text-xs opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                                    Approve Order →
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Inventory Table */}
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-900">Live Inventory</h3>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                            <tr>
                                <th className="p-4">Item Name</th>
                                <th className="p-4">SKU</th>
                                <th className="p-4">Category</th>
                                <th className="p-4 text-center">Stock Level</th>
                                <th className="p-4 text-right">Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {inventory.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-bold text-slate-900">{item.name}</td>
                                    <td className="p-4 text-xs font-mono text-slate-500">{item.sku}</td>
                                    <td className="p-4 text-[10px] font-bold text-slate-400 uppercase">{item.category}</td>
                                    <td className="p-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.currentStock <= item.minThreshold ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                                            {item.currentStock} Units
                                        </span>
                                    </td>
                                    <td className="p-4 text-right font-mono text-xs text-slate-600">₹{(item.price * item.currentStock).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}
