'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Edit, Filter, Search, X } from 'lucide-react';

interface EmployeeListProps {
    employees: any[];
    loading: boolean;
    onEdit: (emp: any) => void;
    onDelete: (id: string) => void;
    onPay: (emp: any) => void;
    onReview: (emp: any) => void;
    onViewProfile: (id: string) => void;
    managers?: any[];
}

export default function EmployeeList({
    employees,
    loading,
    onEdit,
    onDelete,
    onPay,
    onReview,
    onViewProfile,
    managers
}: EmployeeListProps) {
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    // Filters
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [designationFilter, setDesignationFilter] = useState('ALL');

    const uniqueDesignations = useMemo(() => {
        const desigs = new Set(employees.map(e => e.designatRef?.name || e.designation).filter(Boolean));
        return Array.from(desigs);
    }, [employees]);

    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => {
            const matchesSearch =
                emp.user.email.toLowerCase().includes(search.toLowerCase()) ||
                emp.designation?.toLowerCase().includes(search.toLowerCase()) ||
                emp.designatRef?.name?.toLowerCase().includes(search.toLowerCase());

            const matchesRole = roleFilter === 'ALL' || emp.user.role === roleFilter;
            const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? emp.user.isActive : !emp.user.isActive);
            const matchesDesignation = designationFilter === 'ALL' || (emp.designatRef?.name || emp.designation) === designationFilter;

            return matchesSearch && matchesRole && matchesStatus && matchesDesignation;
        });
    }, [employees, search, roleFilter, statusFilter, designationFilter]);

    return (
        <div className="space-y-6">
            {/* Filter Bar */}
            <div className="card-premium p-4 flex flex-col md:flex-row gap-4 justify-between items-center bg-white shadow-sm border border-secondary-200">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search employees..."
                        className="input pl-10 h-10 text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <select
                        className="input h-10 w-auto text-xs font-bold uppercase"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                    >
                        <option value="ALL">All Roles</option>
                        <option value="SALES_EXECUTIVE">Sales Executive</option>
                        <option value="MANAGER">Manager</option>
                        <option value="ADMIN">Admin</option>
                        <option value="HR_MANAGER">HR Manager</option>
                    </select>

                    <select
                        className="input h-10 w-auto text-xs font-bold uppercase"
                        value={designationFilter}
                        onChange={(e) => setDesignationFilter(e.target.value)}
                    >
                        <option value="ALL">All Designations</option>
                        {uniqueDesignations.map(d => (
                            <option key={d as string} value={d as string}>{d as string}</option>
                        ))}
                    </select>

                    <select
                        className="input h-10 w-auto text-xs font-bold uppercase"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">All Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                    </select>

                    <div className="bg-secondary-100 p-1 rounded-lg flex gap-1 items-center">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-secondary-400 hover:text-secondary-600'}`}
                            title="List View"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary-600' : 'text-secondary-400 hover:text-secondary-600'}`}
                            title="Grid View"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                        </button>
                    </div>
                </div>
            </div>

            {viewMode === 'list' ? (
                <div className="card-premium overflow-hidden border border-secondary-100">
                    <table className="table w-full">
                        <thead className="bg-secondary-50/50">
                            <tr className="text-[10px] uppercase font-black text-secondary-500 tracking-wider">
                                <th className="px-6 py-4 text-left">Staff Member</th>
                                <th className="px-6 py-4 text-left">Role & Designation</th>
                                <th className="px-6 py-4 text-left">Financials</th>
                                <th className="px-6 py-4 text-center">Stats</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-50">
                            {loading ? (
                                <tr><td colSpan={5} className="text-center py-20 text-secondary-400 font-bold animate-pulse italic">Scanning workforce assets...</td></tr>
                            ) : filteredEmployees.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-20 text-secondary-400 font-medium">No employees found matching criteria.</td></tr>
                            ) : filteredEmployees.map(emp => (
                                <tr key={emp.id} className="hover:bg-primary-50/10 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onViewProfile(emp.id)}>
                                            <div className="w-10 h-10 bg-gradient-to-br from-secondary-100 to-secondary-200 rounded-xl flex items-center justify-center font-black text-secondary-600 shadow-sm group-hover:from-primary-100 group-hover:to-primary-200 group-hover:text-primary-600 transition-all">
                                                {emp.user.name?.[0] || emp.user.email[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-secondary-900 group-hover:text-primary-700 transition-colors text-sm">{emp.user.name || emp.user.email.split('@')[0]}</p>
                                                <p className="text-[10px] text-secondary-400 font-medium">{emp.user.email}</p>
                                                <div className="flex gap-2 items-center mt-0.5">
                                                    <span className={`w-2 h-2 rounded-full ${emp.user.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                                    <span className="text-[10px] text-secondary-400 font-medium uppercase tracking-wide">{emp.user.isActive ? 'Active' : 'Inactive'}</span>
                                                    <span className="text-[9px] px-1.5 py-0.5 bg-secondary-900/5 text-secondary-900 border border-secondary-900/10 rounded font-black tracking-tighter uppercase">{emp.employeeType?.replace('_', ' ')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="w-fit px-2 py-0.5 bg-secondary-100 text-secondary-700 text-[9px] font-black rounded uppercase tracking-wider">{emp.user.role.replace('_', ' ')}</span>
                                            <p className="text-xs font-bold text-secondary-600">{emp.designatRef?.name || emp.designation || 'No Designation'}</p>
                                            {emp.manager && (
                                                <p className="text-[10px] text-secondary-400 mt-1">
                                                    Reports to: <span className="font-bold text-primary-600">{emp.manager.name || emp.manager.email.split('@')[0]}</span>
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1 text-sm font-black text-secondary-900">
                                            <span className="text-secondary-400 font-normal">₹</span>
                                            {parseFloat(emp.baseSalary || 0).toLocaleString()}
                                        </div>
                                        <p className="text-[10px] text-secondary-400 font-bold uppercase tracking-wide truncate max-w-[120px]" title={emp.bankName || 'Not Set'}>{emp.bankName || 'No Bank Set'}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center gap-6">
                                            <div className="text-center group-hover:-translate-y-1 transition-transform cursor-help" title="Total Days Present">
                                                <p className="text-sm font-black text-primary-600">{emp._count.attendance}</p>
                                                <p className="text-[8px] font-black text-secondary-400 uppercase tracking-widest">Days</p>
                                            </div>
                                            <div className="text-center group-hover:-translate-y-1 transition-transform delay-75 cursor-help" title="Work Reports Submitted">
                                                <p className="text-sm font-black text-indigo-600">{emp._count.workReports}</p>
                                                <p className="text-[8px] font-black text-secondary-400 uppercase tracking-widest">Repts</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <Link
                                                href={`/dashboard/hr-management/employees/${emp.id}/edit`}
                                                className="p-2 hover:bg-primary-50 rounded-lg text-secondary-500 hover:text-primary-600 transition-colors inline-block"
                                                title="Edit Profile"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                                            </Link>
                                            <button
                                                onClick={() => onReview(emp)}
                                                className="p-2 hover:bg-warning-50 rounded-lg text-secondary-500 hover:text-warning-600 transition-colors"
                                                title="Evaluate Performance"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                                            </button>
                                            <button
                                                onClick={() => onDelete(emp.id)}
                                                className="p-2 hover:bg-danger-50 rounded-lg text-secondary-500 hover:text-danger-600 transition-colors"
                                                title="Deactivate / Delete"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredEmployees.map(emp => (
                        <div key={emp.id} className="card-premium p-6 hover:shadow-xl hover:-translate-y-1 transition-all group relative border border-secondary-100 bg-white">
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button onClick={() => onEdit(emp)} className="p-2 bg-white shadow-sm border border-secondary-100 rounded-full hover:bg-primary-50 text-secondary-500 hover:text-primary-600 transition-colors">
                                    <Edit size={12} />
                                </button>
                            </div>

                            <div className="flex flex-col items-center text-center mb-6">
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center font-black text-3xl text-primary-600 mb-4 shadow-inner ring-4 ring-white">
                                    {emp.profilePicture ? (
                                        <img src={emp.profilePicture} alt="Profile" className="w-full h-full object-cover rounded-2xl" />
                                    ) : (
                                        emp.user.email[0].toUpperCase()
                                    )}
                                </div>
                                <h3 className="font-bold text-lg text-secondary-900 truncate w-full px-4" title={emp.user.email}>{emp.user.email.split('@')[0]}</h3>
                                <p className="text-xs text-secondary-500 font-bold uppercase tracking-wider mb-2">{emp.designatRef?.name || emp.designation || 'No Designation'}</p>
                                <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${emp.user.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                                    {emp.user.isActive ? 'Active Staff' : 'Inactive'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 border-t border-dashed border-secondary-200 pt-4 bg-secondary-50/50 -mx-6 -mb-6 p-4 rounded-b-2xl">
                                <div className="text-center">
                                    <p className="text-[9px] text-secondary-400 font-bold uppercase tracking-wider">Department</p>
                                    <p className="text-xs font-bold text-secondary-900 truncate px-2">{emp.department?.name || 'General'}</p>
                                </div>
                                <div className="text-center border-l border-secondary-200">
                                    <p className="text-[9px] text-secondary-400 font-bold uppercase tracking-wider">Reports</p>
                                    <p className="text-xs font-bold text-secondary-900">{emp._count.workReports}</p>
                                </div>
                            </div>

                            <button onClick={() => onViewProfile(emp.id)} className="w-full mt-4 btn btn-outline border-secondary-200 hover:bg-secondary-50 hover:border-secondary-300 text-secondary-600 text-xs uppercase font-bold tracking-widest py-2">
                                View Full Profile
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
