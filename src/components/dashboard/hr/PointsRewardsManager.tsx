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

    // Form
    const [awardForm, setAwardForm] = useState({
        employeeId: '',
        points: 10,
        type: 'BONUS', // BONUS, DISCIPLINE, ACHIEVEMENT
        reason: '',
        date: new Date().toISOString().split('T')[0]
    });

    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const query = new URLSearchParams();
            if (selectedEmployee !== 'ALL') query.append('employeeId', selectedEmployee);

            const res = await fetch(`/api/hr/points?${query.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs);
                setStats(data.stats);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedEmployee]);

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

    const handleAward = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');

            // If DISCIPLINE, make points negative if user entered positive
            let finalPoints = parseInt(awardForm.points.toString());
            if (awardForm.type === 'DISCIPLINE' && finalPoints > 0) {
                finalPoints = -finalPoints;
            }

            const res = await fetch('/api/hr/points', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...awardForm, points: finalPoints })
            });

            if (res.ok) {
                setShowAwardModal(false);
                setAwardForm({ employeeId: '', points: 10, type: 'BONUS', reason: '', date: new Date().toISOString().split('T')[0] });
                fetchLogs();
                alert('Points logged successfully');
            } else {
                alert('Failed to log points');
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

            {/* Modal */}
            {showAwardModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-secondary-100">
                            <h3 className="font-black text-xl text-secondary-900">Manual Point Adjustment</h3>
                        </div>
                        <form onSubmit={handleAward} className="p-6 space-y-4">
                            <div>
                                <label className="label">Employee</label>
                                <select
                                    required
                                    className="input"
                                    value={awardForm.employeeId}
                                    onChange={e => setAwardForm({ ...awardForm, employeeId: e.target.value })}
                                >
                                    <option value="">Select Employee</option>
                                    {employees.map(e => (
                                        <option key={e.id} value={e.id}>{e.user?.name || e.user?.email}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="label">Type</label>
                                <select
                                    className="input"
                                    value={awardForm.type}
                                    onChange={e => setAwardForm({ ...awardForm, type: e.target.value })}
                                >
                                    <option value="BONUS">Bonus Award</option>
                                    <option value="ACHIEVEMENT">Special Achievement</option>
                                    <option value="DISCIPLINE">Discipline / Penalty</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Points</label>
                                <input
                                    type="number"
                                    required
                                    className="input"
                                    min="1"
                                    value={awardForm.points}
                                    onChange={e => setAwardForm({ ...awardForm, points: parseInt(e.target.value) })}
                                />
                                {awardForm.type === 'DISCIPLINE' && <p className="text-xs text-danger-500 mt-1">Will be logged as negative points.</p>}
                            </div>
                            <div>
                                <label className="label">Date</label>
                                <input
                                    type="date"
                                    required
                                    className="input"
                                    value={awardForm.date}
                                    onChange={e => setAwardForm({ ...awardForm, date: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label">Reason</label>
                                <textarea
                                    required
                                    className="input"
                                    rows={3}
                                    placeholder="Reason for adjustment..."
                                    value={awardForm.reason}
                                    onChange={e => setAwardForm({ ...awardForm, reason: e.target.value })}
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowAwardModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                                <button type="submit" className="btn btn-primary flex-1 font-bold">Log Points</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
