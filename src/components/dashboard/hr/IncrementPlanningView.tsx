'use client';

import { useState, useEffect, useCallback } from 'react';
import FormattedDate from '@/components/common/FormattedDate';
import {
    TrendingUp, Users, DollarSign,
    CheckCircle2, XCircle, AlertCircle, Edit2,
    Save, Filter, Building2, Search
} from 'lucide-react';

export default function IncrementPlanningView() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [editRecord, setEditRecord] = useState<any>(null);
    const [filterDept, setFilterDept] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) setCurrentUser(JSON.parse(userData));
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/increments/planning', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setData(await res.json());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleUpdateRecommendation = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/hr/increments/planning/${editRecord.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    newSalary: editRecord.newSalary,

                    newFixed: editRecord.newFixed,
                    newVariable: editRecord.newVariable,
                    newIncentive: editRecord.newIncentive,

                    newMonthlyTarget: editRecord.newMonthlyTarget,
                    newYearlyTarget: editRecord.newYearlyTarget,

                    newHealthCare: editRecord.newHealthCare,
                    newTravelling: editRecord.newTravelling,
                    newMobile: editRecord.newMobile,
                    newInternet: editRecord.newInternet,

                    reason: editRecord.reason,
                    type: editRecord.type,
                    effectiveDate: editRecord.effectiveDate
                })
            });

            if (res.ok) {
                alert('Recommendation updated!');
                setEditRecord(null);
                fetchData();
            } else {
                const err = await res.json();
                alert(`Error: ${err.error}`);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleApprove = async (recordId: string) => {
        if (!confirm('Approve this increment and update employee profile?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/hr/employees/increment-records/${recordId}/approve`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                alert('Approved successfully!');
                fetchData();
            }
        } catch (err) { console.error(err); }
    };

    if (loading) return <div className="flex animate-pulse space-x-4 p-8">Loading Increment Planning...</div>;

    const items = data?.items || [];
    const stats = data?.growthStats || {};

    const filteredItems = items.filter((i: any) => {
        const matchesDept = filterDept === 'all' || i.department === filterDept;
        const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.designation?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesDept && matchesSearch;
    });

    const departments = Array.from(new Set(items.map((i: any) => i.department)));
    const pendingCount = items.filter((i: any) => i.pendingRecommendation).length;
    const totalAdditionalCost = items.reduce((sum: number, i: any) => sum + (i.pendingRecommendation?.incrementAmount || 0), 0);

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card-premium bg-gradient-to-br from-primary-50 to-white p-5 border-l-4 border-primary-500">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary-100 rounded-lg text-primary-600">
                            <Users size={20} />
                        </div>
                        <span className="text-xs font-bold text-secondary-500 uppercase tracking-wider">Eligible Employees</span>
                    </div>
                    <div className="text-3xl font-extrabold text-secondary-900">{items.length}</div>
                    <div className="text-[10px] text-secondary-400 mt-1 flex items-center gap-1">
                        <CheckCircle2 size={10} className="text-success-500" /> Across all departments
                    </div>
                </div>

                <div className="card-premium bg-gradient-to-br from-warning-50 to-white p-5 border-l-4 border-warning-500">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-warning-100 rounded-lg text-warning-600">
                            <AlertCircle size={20} />
                        </div>
                        <span className="text-xs font-bold text-secondary-500 uppercase tracking-wider">Pending Approvals</span>
                    </div>
                    <div className="text-3xl font-extrabold text-secondary-900">{pendingCount}</div>
                    <div className="text-[10px] text-secondary-400 mt-1">Recommendations requiring review</div>
                </div>

                <div className="card-premium bg-gradient-to-br from-success-50 to-white p-5 border-l-4 border-success-500">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-success-100 rounded-lg text-success-600">
                            <DollarSign size={20} />
                        </div>
                        <span className="text-xs font-bold text-secondary-500 uppercase tracking-wider">Cost Impact (Annual)</span>
                    </div>
                    <div className="text-3xl font-extrabold text-secondary-900">₹{(totalAdditionalCost / 100000).toFixed(2)}L</div>
                    <div className="text-[10px] text-secondary-400 mt-1">Projected salary hike sum</div>
                </div>

                <div className="card-premium bg-gradient-to-br from-indigo-50 to-white p-5 border-l-4 border-indigo-500">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                            <TrendingUp size={20} />
                        </div>
                        <span className="text-xs font-bold text-secondary-500 uppercase tracking-wider">Company Net Profit</span>
                    </div>
                    <div className="text-3xl font-extrabold text-secondary-900">₹{(stats.profitability / 1000000).toFixed(2)}M</div>
                    <div className="text-[10px] text-secondary-400 mt-1">Last 12 months performance</div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-xl border border-secondary-200 shadow-sm">
                <div className="flex-1 relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search employee or designation..."
                        className="input-premium pl-10 h-10 text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        title="Search Staff"
                    />
                </div>
                <div className="flex gap-4 items-center w-full md:w-auto">
                    <Filter size={18} className="text-secondary-400" />
                    <select
                        className="input-premium py-1.5 h-10 text-sm w-full md:w-48"
                        value={filterDept}
                        onChange={(e) => setFilterDept(e.target.value)}
                        title="Filter by Department"
                    >
                        <option value="all">All Departments</option>
                        {departments.map((d: any) => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
            </div>

            {/* Main Table */}
            <div className="card-premium overflow-hidden p-0">
                <table className="table">
                    <thead className="bg-secondary-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider">Employee</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider">Performance</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-secondary-500 uppercase tracking-wider">Current Salary</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-secondary-500 uppercase tracking-wider">Proposal</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-secondary-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-100">
                        {filteredItems.map((emp: any) => (
                            <tr key={emp.id} className="hover:bg-secondary-50 group transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-600">
                                            {emp.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-secondary-900">{emp.name}</div>
                                            <div className="text-[10px] text-secondary-500 font-bold uppercase">{emp.designation} • {emp.department}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-6">
                                        <div>
                                            <div className="text-sm font-bold text-secondary-800">{emp.performance.avgRating}/5</div>
                                            <div className="text-[10px] text-secondary-400 font-bold uppercase tracking-tighter">Rating</div>
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-secondary-800">₹{(emp.performance.revenueGenerated / 1000).toFixed(0)}k</div>
                                            <div className="text-[10px] text-secondary-400 font-bold uppercase tracking-tighter">Revenue</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="font-mono font-bold text-secondary-900 text-sm">₹{emp.currentSalary.toLocaleString()}</div>
                                    {emp.lastIncrementDate && (
                                        <div className="text-[10px] text-secondary-400 mt-1">
                                            L.H: <FormattedDate date={emp.lastIncrementDate} />
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {emp.pendingRecommendation ? (
                                        <div className="flex flex-col items-center">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold text-success-600 text-sm">₹{emp.pendingRecommendation.newSalary.toLocaleString()}</span>
                                                <span className="px-2 py-0.5 rounded-full bg-success-100 text-success-700 text-[10px] font-black uppercase">
                                                    +{emp.pendingRecommendation.percentage}%
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-secondary-500 mt-1 italic max-w-[200px] truncate" title={emp.pendingRecommendation.reason}>
                                                &ldquo;{emp.pendingRecommendation.reason}&rdquo;
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <span className="text-[10px] font-black text-secondary-200 uppercase tracking-widest block">No Proposal</span>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {emp.pendingRecommendation ? (
                                        <div className="flex justify-end gap-1">
                                            <button
                                                onClick={() => setEditRecord({
                                                    id: emp.pendingRecommendation.id,
                                                    newSalary: emp.pendingRecommendation.newSalary,

                                                    newFixed: emp.pendingRecommendation.newFixed,
                                                    newVariable: emp.pendingRecommendation.newVariable,
                                                    newIncentive: emp.pendingRecommendation.newIncentive,

                                                    newMonthlyTarget: emp.pendingRecommendation.newMonthlyTarget,
                                                    newYearlyTarget: emp.pendingRecommendation.newYearlyTarget,

                                                    newHealthCare: emp.pendingRecommendation.newHealthCare,
                                                    newTravelling: emp.pendingRecommendation.newTravelling,
                                                    newMobile: emp.pendingRecommendation.newMobile,
                                                    newInternet: emp.pendingRecommendation.newInternet,

                                                    reason: emp.pendingRecommendation.reason || '',
                                                    type: emp.pendingRecommendation.type,
                                                    effectiveDate: emp.pendingRecommendation.effectiveDate?.split('T')[0]
                                                })}
                                                className="p-2 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                title="Edit Proposal"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            {['HR_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(currentUser?.role) && (
                                                <button
                                                    onClick={() => handleApprove(emp.pendingRecommendation.id)}
                                                    className="p-2 text-secondary-400 hover:text-success-600 hover:bg-success-50 rounded-lg transition-colors"
                                                    title="Quick Approve"
                                                >
                                                    <CheckCircle2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                window.location.href = `/dashboard/hr-management/employees/${emp.profileId}`;
                                            }}
                                            className="btn btn-secondary py-1 px-4 text-[10px] font-black uppercase tracking-widest shadow-sm"
                                            title={`Create proposal for ${emp.name}`}
                                        >
                                            PROPOSE
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal remains same but updated with consistent styling */}
            {editRecord && (
                <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-secondary-100">
                        <form onSubmit={handleUpdateRecommendation}>
                            <div className="p-8 border-b border-secondary-50 flex justify-between items-center bg-secondary-50/50">
                                <div>
                                    <h3 className="text-xl font-black text-secondary-900 uppercase tracking-tighter italic">Compensation Pivot</h3>
                                    <p className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">Adjusting Proposed Value</p>
                                </div>
                                <button type="button" onClick={() => setEditRecord(null)} className="p-2 bg-white rounded-xl shadow-sm text-secondary-400 hover:text-danger-500 transition-colors" title="Close Modal">
                                    <XCircle size={24} />
                                </button>
                            </div>
                            <div className="p-8 space-y-5">
                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Proposed Annual Structure</label>
                                        <div className="text-right">
                                            <span className="text-[10px] text-secondary-400 font-bold mr-1">TOTAL CTC</span>
                                            <span className="font-mono font-black text-primary-600">
                                                ₹{(
                                                    (parseFloat(editRecord.newFixed) || 0) +
                                                    (parseFloat(editRecord.newVariable) || 0) +
                                                    (parseFloat(editRecord.newFixed) || 0) +
                                                    (parseFloat(editRecord.newVariable) || 0) +
                                                    (parseFloat(editRecord.newIncentive) || 0) +
                                                    (parseFloat(editRecord.newHealthCare) || 0) +
                                                    (parseFloat(editRecord.newTravelling) || 0) +
                                                    (parseFloat(editRecord.newMobile) || 0) +
                                                    (parseFloat(editRecord.newInternet) || 0)
                                                ).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-[9px] font-bold text-secondary-400 uppercase block mb-1">Fixed Component</label>
                                            <div className="relative group">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 font-bold text-secondary-300 text-xs">₹</span>
                                                <input
                                                    type="number"
                                                    className="input-premium pl-5 text-sm font-bold w-full"
                                                    placeholder="Fixed"
                                                    value={editRecord.newFixed || ''}
                                                    onChange={(e) => setEditRecord({ ...editRecord, newFixed: e.target.value })}
                                                    title="Base Salary (Fixed)"
                                                />
                                                <div className="absolute opacity-0 group-hover:opacity-100 bottom-full left-0 mb-2 p-2 bg-secondary-800 text-white text-[10px] rounded shadow-lg w-32 pointer-events-none transition-opacity z-10">
                                                    Guaranteed monthly payout excluding variables.
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-bold text-secondary-400 uppercase block mb-1">Variable Pay</label>
                                            <div className="relative group">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 font-bold text-secondary-300 text-xs">₹</span>
                                                <input
                                                    type="number"
                                                    className="input-premium pl-5 text-sm font-bold w-full"
                                                    placeholder="Variable"
                                                    value={editRecord.newVariable || ''}
                                                    onChange={(e) => setEditRecord({ ...editRecord, newVariable: e.target.value })}
                                                    title="Variable Pay"
                                                />
                                                <div className="absolute opacity-0 group-hover:opacity-100 bottom-full left-0 mb-2 p-2 bg-secondary-800 text-white text-[10px] rounded shadow-lg w-32 pointer-events-none transition-opacity z-10">
                                                    Performance linked pay (PLI/Bonus).
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-bold text-secondary-400 uppercase block mb-1">Incentives</label>
                                            <div className="relative group">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 font-bold text-secondary-300 text-xs">₹</span>
                                                <input
                                                    type="number"
                                                    className="input-premium pl-5 text-sm font-bold w-full"
                                                    placeholder="Incentive"
                                                    value={editRecord.newIncentive || ''}
                                                    onChange={(e) => setEditRecord({ ...editRecord, newIncentive: e.target.value })}
                                                    title="Targets/Incentives"
                                                />
                                                <div className="absolute opacity-0 group-hover:opacity-100 bottom-full left-0 mb-2 p-2 bg-secondary-800 text-white text-[10px] rounded shadow-lg w-32 pointer-events-none transition-opacity z-10">
                                                    Sales/Target based incentives.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mt-4">
                                        <div>
                                            <label className="text-[9px] font-bold text-secondary-400 uppercase block mb-1">Monthly Target</label>
                                            <input
                                                type="number"
                                                className="input-premium pl-2 text-sm font-bold w-full"
                                                placeholder="Monthly Target"
                                                value={editRecord.newMonthlyTarget || ''}
                                                onChange={(e) => setEditRecord({ ...editRecord, newMonthlyTarget: e.target.value })}
                                                title="Monthly Target"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-bold text-secondary-400 uppercase block mb-1">Yearly Target</label>
                                            <input
                                                type="number"
                                                className="input-premium pl-2 text-sm font-bold w-full"
                                                placeholder="Yearly Target"
                                                value={editRecord.newYearlyTarget || ''}
                                                onChange={(e) => setEditRecord({ ...editRecord, newYearlyTarget: e.target.value })}
                                                title="Yearly Target"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-4 border-t border-dashed border-secondary-200 pt-4">
                                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-3 block">Reimbursements & Allowances (Annual)</label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div>
                                                <label className="text-[9px] font-bold text-secondary-400 uppercase block mb-1">Health Care</label>
                                                <input
                                                    type="number"
                                                    className="input-premium pl-2 text-xs font-bold w-full"
                                                    value={editRecord.newHealthCare || ''}
                                                    onChange={(e) => setEditRecord({ ...editRecord, newHealthCare: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-bold text-secondary-400 uppercase block mb-1">Travelling</label>
                                                <input
                                                    type="number"
                                                    className="input-premium pl-2 text-xs font-bold w-full"
                                                    value={editRecord.newTravelling || ''}
                                                    onChange={(e) => setEditRecord({ ...editRecord, newTravelling: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-bold text-secondary-400 uppercase block mb-1">Mobile</label>
                                                <input
                                                    type="number"
                                                    className="input-premium pl-2 text-xs font-bold w-full"
                                                    value={editRecord.newMobile || ''}
                                                    onChange={(e) => setEditRecord({ ...editRecord, newMobile: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-bold text-secondary-400 uppercase block mb-1">Internet</label>
                                                <input
                                                    type="number"
                                                    className="input-premium pl-2 text-xs font-bold w-full"
                                                    value={editRecord.newInternet || ''}
                                                    onChange={(e) => setEditRecord({ ...editRecord, newInternet: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-2 block">Effective Date</label>
                                        <input
                                            type="date"
                                            className="input-premium font-bold"
                                            value={editRecord.effectiveDate}
                                            onChange={(e) => setEditRecord({ ...editRecord, effectiveDate: e.target.value })}
                                            required
                                            title="Effective Date"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-2 block">Adjustment Type</label>
                                        <select
                                            className="input-premium font-bold"
                                            value={editRecord.type}
                                            onChange={(e) => setEditRecord({ ...editRecord, type: e.target.value })}
                                            title="Type"
                                        >
                                            <option value="INCREMENT">Increment</option>
                                            <option value="PROMOTION">Promotion</option>
                                            <option value="CORRECTION">Correction</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-2 block">Justification Reason</label>
                                    <textarea
                                        className="input-premium h-28 italic text-sm text-secondary-600"
                                        value={editRecord.reason}
                                        onChange={(e) => setEditRecord({ ...editRecord, reason: e.target.value })}
                                        placeholder="Explain the reason for this compensation change..."
                                        title="Reason"
                                    />
                                </div>
                            </div>
                            <div className="p-8 bg-secondary-50 border-t border-secondary-100 flex justify-end gap-3">
                                <button type="button" onClick={() => setEditRecord(null)} className="btn bg-white border border-secondary-200 text-secondary-600 hover:bg-secondary-50 font-bold px-6">Cancel</button>
                                <button type="submit" className="btn btn-primary shadow-xl shadow-primary-200 flex items-center gap-2 font-black uppercase tracking-widest px-8">
                                    <Save size={18} /> Update Proposal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
