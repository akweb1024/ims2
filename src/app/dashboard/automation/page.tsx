'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    Cpu, Play, CheckCircle2, AlertCircle,
    RefreshCw, GitBranch, DollarSign, Users,
    Clock, Settings, Terminal
} from 'lucide-react';

export default function AutomationPage() {
    const [running, setRunning] = useState<string | null>(null);
    const [results, setResults] = useState<Record<string, any>>({});

    const runAction = async (action: string, id: string) => {
        setRunning(id);
        try {
            const res = await fetch('/api/automation/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });
            const data = await res.json();
            setResults(prev => ({ ...prev, [id]: data }));
        } catch (err) {
            console.error(err);
        } finally {
            setRunning(null);
        }
    };

    const automations = [
        {
            id: 'finance-reconcile',
            action: 'AUTO_RECONCILE',
            title: 'Auto-Reconciliation Engine',
            description: 'Matches bank statements with ledger entries using fuzzy logic.',
            icon: <DollarSign size={24} />,
            color: 'bg-emerald-50 text-emerald-600',
            lastRun: '2 hours ago'
        },
        {
            id: 'churn-analysis',
            action: 'CHURN_ANALYSIS',
            title: 'Customer Churn Predictor',
            description: 'Analyzes engagement metrics to flag at-risk accounts.',
            icon: <Users size={24} />,
            color: 'bg-rose-50 text-rose-600',
            lastRun: '1 day ago'
        },
        {
            id: 'github-sync',
            action: 'GITHUB_SYNC',
            title: 'Code-to-Cash Sync',
            description: 'Correlates GitHub commits with project milestones and billing.',
            icon: <GitBranch size={24} />,
            color: 'bg-purple-50 text-purple-600',
            lastRun: '15 mins ago'
        }
    ];

    return (
        <DashboardLayout>
            <div className="p-6 space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-gray-900 rounded-[2rem] p-8 text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md">
                                <Cpu size={24} className="text-white" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">System Core</span>
                        </div>
                        <h1 className="text-3xl font-black">Automation Center</h1>
                        <p className="text-gray-400 mt-2 max-w-xl">
                            Monitor and trigger background intelligence jobs manually.
                            These tasks usually run on a nightly cron schedule.
                        </p>
                    </div>
                    {/* Retro Terminal Effect */}
                    <div className="font-mono text-xs text-green-400 opacity-30 absolute top-4 right-4 text-right hidden lg:block">
                        <p>{'>'} system.init_check()...</p>
                        <p>{'>'} services.status: OK</p>
                        <p>{'>'} waiting_for_input_</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {automations.map((job) => (
                        <div key={job.id} className="bg-white dark:bg-gray-800 rounded-[2rem] p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between group hover:shadow-lg transition-all">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-2xl ${job.color} group-hover:scale-110 transition-transform`}>
                                        {job.icon}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last Run</div>
                                        <div className="text-xs font-bold text-gray-600 dark:text-gray-300">{job.lastRun}</div>
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{job.title}</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 leading-relaxed">
                                    {job.description}
                                </p>
                            </div>

                            <div>
                                {results[job.id] ? (
                                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-100 dark:border-gray-600 animate-in zoom-in-95 duration-300">
                                        <div className="flex items-center gap-2 mb-2 text-green-600 font-bold text-sm">
                                            <CheckCircle2 size={16} /> Success
                                        </div>
                                        <p className="text-xs text-gray-600 dark:text-gray-300">{results[job.id].message}</p>
                                        <div className="mt-3 flex gap-2">
                                            {Object.entries(results[job.id].stats || {}).map(([key, val]) => (
                                                <span key={key} className="text-[10px] bg-white dark:bg-gray-600 px-2 py-1 rounded shadow-sm border border-gray-100 dark:border-gray-500 uppercase font-bold text-gray-500 dark:text-gray-400">
                                                    {key}: <span className="text-gray-900 dark:text-white">{val as any}</span>
                                                </span>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => setResults(prev => { const n = { ...prev }; delete n[job.id]; return n; })}
                                            className="mt-3 text-[10px] text-gray-400 hover:text-gray-600 underline"
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-700">
                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                                            <Clock size={14} /> Scheduled: Midnight
                                        </div>
                                        <button
                                            onClick={() => runAction(job.action, job.id)}
                                            disabled={!!running}
                                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${running === job.id
                                                    ? 'bg-gray-100 text-gray-400 cursor-wait'
                                                    : 'bg-gray-900 hover:bg-black text-white shadow-lg hover:-translate-y-0.5'
                                                }`}
                                        >
                                            {running === job.id ? (
                                                <><RefreshCw size={14} className="animate-spin" /> Running...</>
                                            ) : (
                                                <><Play size={14} /> Run Now</>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Console / Log Placeholder */}
                    <div className="bg-gray-900 rounded-[2rem] p-6 text-green-400 font-mono text-xs shadow-inner overflow-hidden relative">
                        <div className="absolute top-4 right-4 text-gray-600"><Terminal size={16} /></div>
                        <div className="opacity-50 space-y-1">
                            <p>[03:15:00] Cron: daily_backup started</p>
                            <p>[03:15:42] Cron: daily_backup completed (2.4GB)</p>
                            <p>[04:00:00] Cron: user_sync started</p>
                            <p>[04:00:05] Cron: user_sync completed (no changes)</p>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

