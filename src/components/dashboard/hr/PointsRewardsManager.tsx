'use client';

import { useState, useEffect, useCallback } from 'react';
import { Award, AlertTriangle, Plus, Search, Filter } from 'lucide-react';
import FormattedDate from '@/components/common/FormattedDate';

export default function PointsRewardsManager() {
    const [logs, setLogs] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [employees, setEmployees] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAwardModal, setShowAwardModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState('ALL');
    const [activeTab, setActiveTab] = useState<'history' | 'leaderboard'>('history');
    const [leaderboard, setLeaderboard] = useState<any[]>([]);

    // Form
    const [awardForm, setAwardForm] = useState({
        targetType: 'SINGLE', // SINGLE, MULTI, ALL, DEPARTMENT
        targetIds: [] as string[],
        points: 10,
        type: 'BONUS',
        reason: '',
        date: new Date().toISOString().split('T')[0]
    });

    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const query = new URLSearchParams();
            if (activeTab === 'leaderboard') {
                query.append('mode', 'leaderboard');
            } else if (selectedEmployee !== 'ALL') {
                query.append('employeeId', selectedEmployee);
            }

            const res = await fetch(`/api/hr/points?${query.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                if (activeTab === 'leaderboard') {
                    setLeaderboard(data.leaderboard || []);
                } else {
                    setLogs(data.logs);
                    setStats(data.stats);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedEmployee, activeTab]);

    useEffect(() => {
        const fetchInit = async () => {
            const token = localStorage.getItem('token');
            const empRes = await fetch('/api/hr/employees', { headers: { 'Authorization': `Bearer ${token}` } });
            if (empRes.ok) setEmployees(await empRes.json());
        };
        fetchInit();
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Helper to toggle multi selection
    const toggleEmployeeSelection = (id: string) => {
        setAwardForm(prev => {
            const exists = prev.targetIds.includes(id);
            return {
                ...prev,
                targetIds: exists ? prev.targetIds.filter(x => x !== id) : [...prev.targetIds, id]
            };
        });
    };

    const handleAward = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            let finalPoints = Number(awardForm.points);

            // Auto-negate for discipline if positive value entered
            if (awardForm.type === 'DISCIPLINE' && finalPoints > 0) {
                finalPoints = -finalPoints;
            }

            const payload = {
                targetType: awardForm.targetType,
                targetIds: awardForm.targetType === 'SINGLE' ? [awardForm.targetIds[0]] : awardForm.targetIds, // Ensure array
                // For SINGLE, targetIds[0] might be used or backward compat `employeeId` but API expects targetIds
                employeeId: awardForm.targetIds[0], // fallback?
                points: finalPoints,
                type: awardForm.type,
                reason: awardForm.reason,
                date: awardForm.date
            };

            // Validation
            if (awardForm.targetType === 'SINGLE' && payload.targetIds.length !== 1) {
                // handle legacy single select UI mapping
                alert('Please select an employee'); return;
            }

            const res = await fetch('/api/hr/points', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok) {
                setShowAwardModal(false);
                setAwardForm({ targetType: 'SINGLE', targetIds: [], points: 10, type: 'BONUS', reason: '', date: new Date().toISOString().split('T')[0] });
                fetchLogs();
                alert(`Success: ${data.message || 'Points logged'}`);
            } else {
                alert(data.error || 'Failed to log points');
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-secondary-900">Points & Rewards</h2>
                    <p className="text-secondary-500">Track employee gamification scores and manage awards</p>
                </div>
                <button
                    onClick={() => setShowAwardModal(true)}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Plus size={18} /> Manual Award / Adjustment
                </button>
            </div>

            <div className="flex gap-4 items-center bg-white p-4 rounded-xl border border-secondary-100 shadow-sm">
                <Search size={20} className="text-secondary-400" />
                <select
                    className="input border-none shadow-none focus:ring-0 w-full"
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                >
                    <option value="ALL">All Employees</option>
                    {employees.map(e => (
                        <option key={e.id} value={e.id}>{e.user?.name || e.user?.email} ({e.designation || 'Staff'})</option>
                    ))}
                </select>
            </div>

            {/* Stats Cards if Employee Selected */}
            {selectedEmployee !== 'ALL' && stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {stats.map((s: any) => (
                        <div key={s.type} className={`card-premium p-4 border-l-4 ${s._sum.points > 0 ? 'border-success-500' : 'border-danger-500'}`}>
                            <p className="text-xs font-bold text-secondary-500 uppercase">{s.type.replace('_', ' ')}</p>
                            <p className={`text-2xl font-black ${s._sum.points > 0 ? 'text-success-600' : 'text-danger-600'}`}>
                                {s._sum.points > 0 ? '+' : ''}{s._sum.points}
                            </p>
                        </div>
                    ))}
                    <div className="card-premium p-4 border-l-4 border-indigo-500 bg-indigo-50/50">
                        <p className="text-xs font-bold text-indigo-500 uppercase">Net Score</p>
                        <p className="text-2xl font-black text-indigo-700">
                            {stats.reduce((acc: number, curr: any) => acc + curr._sum.points, 0)}
                        </p>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b border-secondary-200">
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 text-sm font-bold uppercase transition-colors border-b-2 ${activeTab === 'history' ? 'border-primary-500 text-primary-600' : 'border-transparent text-secondary-400'}`}
                >
                    History
                </button>
                <button
                    onClick={() => setActiveTab('leaderboard')}
                    className={`px-4 py-2 text-sm font-bold uppercase transition-colors border-b-2 ${activeTab === 'leaderboard' ? 'border-primary-500 text-primary-600' : 'border-transparent text-secondary-400'}`}
                >
                    Leaderboard
                </button>
            </div>

            {activeTab === 'leaderboard' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {leaderboard.map((entry, index) => (
                        <div key={entry.employeeId} className="card-premium p-6 flex items-center gap-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-secondary-900">
                                #{index + 1}
                            </div>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-white text-lg ${index === 0 ? 'bg-warning-400 shadow-warning-200 shadow-xl' : index === 1 ? 'bg-secondary-400' : index === 2 ? 'bg-orange-400' : 'bg-primary-500'}`}>
                                {index + 1}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-secondary-900 leading-tight">{entry.name}</h3>
                                <p className="text-secondary-500 text-xs uppercase">{entry.designation || 'Staff'}</p>
                                <p className="text-2xl font-black text-primary-600 mt-1">{entry.amount} <span className="text-xs text-secondary-400 font-normal">pts</span></p>
                            </div>
                        </div>
                    ))}
                    {leaderboard.length === 0 && (
                        <div className="col-span-full py-12 text-center text-secondary-400">No leaderboard data available yet.</div>
                    )}
                </div>
            ) : (
                <div className="card-premium overflow-hidden">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Employee</th>
                                <th>Type</th>
                                <th>Reason</th>
                                <th className="text-right">Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={5} className="text-center py-10">Loading logs...</td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-10 text-secondary-500">No logs found</td></tr>
                            ) : logs.map(log => (
                                <tr key={log.id} className="hover:bg-secondary-50">
                                    <td><FormattedDate date={log.date} /></td>
                                    <td className="font-bold text-secondary-900">{log.employee?.user?.name || log.employee?.user?.email}</td>
                                    <td>
                                        <span className={`badge ${log.type === 'ACHIEVEMENT' ? 'badge-warning' :
                                            log.type === 'DISCIPLINE' ? 'badge-danger' :
                                                log.type === 'BONUS' ? 'badge-success' :
                                                    'badge-secondary'
                                            }`}>{log.type.replace('_', ' ')}</span>
                                    </td>
                                    <td className="max-w-md truncate text-secondary-600">{log.reason}</td>
                                    <td className={`text-right font-black ${log.points > 0 ? 'text-success-600' : 'text-danger-600'}`}>
                                        {log.points > 0 ? '+' : ''}{log.points}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {showAwardModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-secondary-100 flex justify-between items-center bg-secondary-50">
                            <div>
                                <h3 className="font-black text-xl text-secondary-900">Manage Points</h3>
                                <p className="text-secondary-500 text-xs">Distribute rewards or apply deductions</p>
                            </div>
                            <button onClick={() => setShowAwardModal(false)} className="text-secondary-400 hover:text-secondary-900">✕</button>
                        </div>
                        <form onSubmit={handleAward} className="p-6 space-y-6">

                            {/* Action Type */}
                            <div className="flex gap-2 p-1 bg-secondary-100 rounded-lg">
                                <button type="button" onClick={() => setAwardForm({ ...awardForm, type: 'BONUS' })} className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${awardForm.type !== 'DISCIPLINE' ? 'bg-white shadow text-success-700' : 'text-secondary-500'}`}>Reward Distribution</button>
                                <button type="button" onClick={() => setAwardForm({ ...awardForm, type: 'DISCIPLINE' })} className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${awardForm.type === 'DISCIPLINE' ? 'bg-white shadow text-danger-700' : 'text-secondary-500'}`}>Penalty / Deduction</button>
                            </div>

                            {/* Target Scope */}
                            <div className="space-y-3">
                                <label className="label">Target Audience</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {['SINGLE', 'MULTI', 'DEPARTMENT', 'ALL'].map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setAwardForm({ ...awardForm, targetType: t, targetIds: [] })}
                                            className={`py-2 text-[10px] font-black uppercase rounded-lg border transition-all ${awardForm.targetType === t ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-secondary-200 hover:border-secondary-300 text-secondary-500'}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Target Selection */}
                            {awardForm.targetType === 'SINGLE' && (
                                <div>
                                    <label className="label">Select Employee</label>
                                    <select
                                        className="input"
                                        value={awardForm.targetIds[0] || ''}
                                        onChange={e => setAwardForm({ ...awardForm, targetIds: [e.target.value] })}
                                    >
                                        <option value="">Select Employee</option>
                                        {employees.map(e => <option key={e.id} value={e.id}>{e.user?.name || e.user?.email}</option>)}
                                    </select>
                                </div>
                            )}

                            {awardForm.targetType === 'MULTI' && (
                                <div>
                                    <label className="label">Select Employees ({awardForm.targetIds.length})</label>
                                    <div className="h-40 overflow-y-auto border border-secondary-200 rounded-xl p-2 space-y-1">
                                        {employees.map(e => (
                                            <label key={e.id} className="flex items-center gap-2 p-2 hover:bg-secondary-50 rounded-lg cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={awardForm.targetIds.includes(e.id)}
                                                    onChange={() => toggleEmployeeSelection(e.id)}
                                                    className="checkbox"
                                                />
                                                <span className="text-sm font-medium">{e.user?.name || e.user?.email}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {awardForm.targetType === 'DEPARTMENT' && (
                                <div>
                                    <label className="label">Select Department</label>
                                    <select
                                        className="input"
                                        value={awardForm.targetIds[0] || ''}
                                        onChange={e => setAwardForm({ ...awardForm, targetIds: [e.target.value] })}
                                    >
                                        <option value="">Select Department</option>
                                        {Array.from(new Set(employees.map(e => e.user?.departmentId).filter(Boolean))).map(depId => (
                                            <option key={depId as string} value={depId as string}>Department ID: {depId}</option>
                                            // Ideally map to name if available, for now ID
                                        ))}
                                    </select>
                                </div>
                            )}

                            {awardForm.targetType === 'ALL' && (
                                <div className="p-4 bg-warning-50 border border-warning-200 rounded-xl flex items-start gap-3">
                                    <AlertTriangle className="text-warning-600 shrink-0" size={20} />
                                    <p className="text-xs text-warning-800">
                                        You are about to distribute points to <strong>ALL {employees.length} employees</strong> in the company. calculate your budget accordingly.
                                    </p>
                                </div>
                            )}

                            {/* Points Input */}
                            <div>
                                <label className="label">Points Amount {awardForm.type === 'DISCIPLINE' ? '(Deduction)' : '(Reward)'}</label>
                                {awardForm.type === 'DISCIPLINE' ? (
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 5, 10].map(val => (
                                            <button
                                                key={val}
                                                type="button"
                                                onClick={() => setAwardForm({ ...awardForm, points: val })}
                                                className={`flex-1 py-2 font-black rounded-lg transition-all ${awardForm.points === val ? 'bg-danger-600 text-white shadow-lg scale-105' : 'bg-secondary-100 text-secondary-600 hover:bg-danger-50 hover:text-danger-600'}`}
                                            >
                                                -{val}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <input
                                        type="number"
                                        className="input"
                                        min="1"
                                        value={awardForm.points}
                                        onChange={e => setAwardForm({ ...awardForm, points: parseInt(e.target.value) })}
                                    />
                                )}
                            </div>

                            {/* Metadata */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Effect Date</label>
                                    <input
                                        type="date"
                                        className="input"
                                        value={awardForm.date}
                                        onChange={e => setAwardForm({ ...awardForm, date: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <textarea
                                        className="input"
                                        rows={2}
                                        placeholder="Reason / Note..."
                                        value={awardForm.reason}
                                        onChange={e => setAwardForm({ ...awardForm, reason: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => setShowAwardModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                                <button type="submit" className={`btn flex-1 font-bold ${awardForm.type === 'DISCIPLINE' ? 'btn-danger' : 'btn-primary'}`}>
                                    {awardForm.type === 'DISCIPLINE' ? 'Apply Deduction' : 'Distribute Points'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )
            }
        </div >
    );
}
