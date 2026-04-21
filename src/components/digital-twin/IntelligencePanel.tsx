'use client';

import { useState } from 'react';
import { IntelligenceSummary, RiskLevel } from '@/lib/digital-twin/intelligence';
import { EmployeeTwin, InventoryTwin } from '@/lib/digital-twin/twin-engine';

interface IntelligencePanelProps {
    intelligence: IntelligenceSummary;
    employees: EmployeeTwin[];
    inventory: InventoryTwin[];
    onDispatch: (empId?: string, itemId?: string) => void;
}

const RiskBadge = ({ risk }: { risk: RiskLevel }) => {
    const styles: Record<RiskLevel, string> = {
        HIGH: 'bg-red-500/20 text-red-400 border-red-500/30',
        MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        LOW: 'bg-green-500/20 text-green-400 border-green-500/30',
    };
    return (
        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${styles[risk]}`}>
            {risk}
        </span>
    );
};

type Tab = 'overload' | 'depletion' | 'dispatch';

export const IntelligencePanel = ({ intelligence, employees, inventory, onDispatch }: IntelligencePanelProps) => {
    const [activeTab, setActiveTab] = useState<Tab>('dispatch');
    const [isExpanded, setIsExpanded] = useState(true);

    const { overloadPredictions, depletionForecasts, dispatchSuggestions, healthScore } = intelligence;

    const healthColor = healthScore >= 75 ? 'text-green-400' : healthScore >= 50 ? 'text-yellow-400' : 'text-red-400';
    const healthBg = healthScore >= 75 ? 'bg-green-500' : healthScore >= 50 ? 'bg-yellow-500' : 'bg-red-500';

    const tabData: { id: Tab; label: string; count: number }[] = [
        { id: 'dispatch', label: '⚡ Dispatch', count: dispatchSuggestions.length },
        { id: 'overload', label: '▲ Overload Risk', count: overloadPredictions.length },
        { id: 'depletion', label: '⌛ Depletion', count: depletionForecasts.length },
    ];

    return (
        <div className="mb-8">
            {/* Collapsible Header */}
            <button
                onClick={() => setIsExpanded(e => !e)}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 hover:border-indigo-500/40 transition-all duration-300 group"
            >
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                        <span className="text-sm font-black uppercase tracking-widest text-white">🧠 AI Intelligence Engine</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-3">
                        {tabData.map(t => t.count > 0 && (
                            <span key={t.id} className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50">
                                {t.count} {t.label.split(' ').pop()}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {/* Health Score Gauge */}
                    <div className="flex items-center gap-2">
                        <div className="relative w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ${healthBg}`}
                                style={{ width: `${healthScore}%` }}
                            />
                        </div>
                        <span className={`text-sm font-black tabular-nums ${healthColor}`}>{healthScore}</span>
                        <span className="text-[9px] text-white/30 uppercase">Health</span>
                    </div>
                    <span className="text-white/30 group-hover:text-white/60 transition-colors text-sm">
                        {isExpanded ? '▲' : '▼'}
                    </span>
                </div>
            </button>

            {isExpanded && (
                <div className="mt-3 rounded-2xl border border-white/8 bg-black/20 backdrop-blur-sm overflow-hidden animate-in slide-in-from-top-2 duration-300">
                    {/* Tabs */}
                    <div className="flex border-b border-white/8">
                        {tabData.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-bold uppercase tracking-widest transition-all duration-200 ${
                                    activeTab === tab.id
                                        ? 'bg-indigo-500/10 text-indigo-400 border-b-2 border-indigo-500'
                                        : 'text-white/30 hover:text-white/50 hover:bg-white/3'
                                }`}
                            >
                                {tab.label}
                                {tab.count > 0 && (
                                    <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black ${activeTab === tab.id ? 'bg-indigo-500 text-white' : 'bg-white/10 text-white/40'}`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="p-5">

                        {/* ── Auto-Dispatch Suggestions ── */}
                        {activeTab === 'dispatch' && (
                            <div className="space-y-4">
                                {dispatchSuggestions.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-2xl mb-2">✓</p>
                                        <p className="text-green-400 text-sm font-semibold">All assets are adequately staffed</p>
                                        <p className="text-white/30 text-xs mt-1">No dispatch recommendations at this time.</p>
                                    </div>
                                ) : (
                                    dispatchSuggestions.map(sug => (
                                        <div key={sug.inventoryId} className="p-4 rounded-xl bg-white/3 border border-white/8 hover:border-white/12 transition-all">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="font-bold text-sm text-white">{sug.itemName}</span>
                                                        <RiskBadge risk={sug.urgency} />
                                                    </div>
                                                    <span className="text-[10px] font-mono text-indigo-400">{sug.sku}</span>
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${sug.itemStatus === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                                    {sug.itemStatus}
                                                </span>
                                            </div>
                                            {sug.recommendedEmployees.length === 0 ? (
                                                <p className="text-xs text-white/30 italic">No available employees — all at capacity.</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold">Recommended Personnel</p>
                                                    {sug.recommendedEmployees.map((emp, i) => (
                                                        <div key={emp.employeeId} className="flex items-center justify-between p-2.5 rounded-lg bg-white/3 border border-white/5 hover:border-white/10 transition-all group">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                                                                    {i === 0 ? '★' : emp.name.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-semibold text-white">{emp.name}</p>
                                                                    <p className="text-[9px] text-white/40">{emp.reason}</p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => onDispatch(emp.employeeId, sug.inventoryId)}
                                                                className="opacity-0 group-hover:opacity-100 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-all"
                                                            >
                                                                Dispatch
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* ── Overload Predictions ── */}
                        {activeTab === 'overload' && (
                            <div className="space-y-3">
                                {overloadPredictions.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-2xl mb-2">✓</p>
                                        <p className="text-green-400 text-sm font-semibold">All personnel operating within safe capacity</p>
                                        <p className="text-white/30 text-xs mt-1">No overload risks detected.</p>
                                    </div>
                                ) : (
                                    overloadPredictions.map(pred => (
                                        <div key={pred.employeeId} className="flex items-start gap-3 p-3.5 rounded-xl bg-white/3 border border-white/8">
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-sm font-bold text-white shrink-0 mt-0.5">
                                                {pred.employeeName.charAt(0)}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-bold text-white">{pred.employeeName}</span>
                                                    <RiskBadge risk={pred.risk} />
                                                </div>
                                                <p className="text-xs text-white/50 leading-relaxed">{pred.reason}</p>
                                                <div className="flex gap-4 mt-2">
                                                    <div className="text-[10px]">
                                                        <span className="text-white/30">Bandwidth: </span>
                                                        <span className={pred.currentBandwidth < 30 ? 'text-red-400 font-bold' : 'text-yellow-400 font-bold'}>{pred.currentBandwidth}%</span>
                                                    </div>
                                                    <div className="text-[10px]">
                                                        <span className="text-white/30">Tasks: </span>
                                                        <span className="text-white font-bold">{pred.taskCount}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* ── Depletion Forecasts ── */}
                        {activeTab === 'depletion' && (
                            <div className="space-y-3">
                                {depletionForecasts.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-2xl mb-2">✓</p>
                                        <p className="text-green-400 text-sm font-semibold">All stock levels are sustainable</p>
                                        <p className="text-white/30 text-xs mt-1">No critical depletion risks in the next 30 days.</p>
                                    </div>
                                ) : (
                                    depletionForecasts.map(fc => (
                                        <div key={fc.inventoryId} className="p-3.5 rounded-xl bg-white/3 border border-white/8">
                                            <div className="flex items-center justify-between mb-2">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-sm text-white">{fc.itemName}</span>
                                                        <RiskBadge risk={fc.risk} />
                                                    </div>
                                                    <span className="text-[10px] font-mono text-indigo-400">{fc.sku}</span>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-2xl font-black tabular-nums ${fc.estimatedDaysLeft <= 7 ? 'text-red-400' : 'text-yellow-400'}`}>
                                                        {fc.estimatedDaysLeft}
                                                    </p>
                                                    <p className="text-[9px] text-white/30 uppercase">days left</p>
                                                </div>
                                            </div>
                                            <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ${fc.estimatedDaysLeft <= 7 ? 'bg-red-500' : 'bg-yellow-500'}`}
                                                    style={{ width: `${Math.min(100, (fc.currentQuantity / (fc.minLevel * 3 || 1)) * 100)}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between mt-1 text-[9px] text-white/30">
                                                <span>Min: {fc.minLevel} units</span>
                                                <span>Current: {fc.currentQuantity} units</span>
                                                <span>Velocity: {fc.velocity} moves</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
